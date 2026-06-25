import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { ScarceItem, SeverityLevel } from "./types/index";
import {
  addItem,
  addSharedItem,
  getItemsForFile,
  getItemsForRepo,
  getSharedItemsForFile,
  getSharedItemsForRepo,
  isFirstSharedCairnInRepo,
  isSharedDirGitignored,
  updateItemLines,
  updateSharedItemLines,
} from "./storage/index";
import { checkStaleness, StalenessMap } from "./staleness/index";
import { notifyForItems, CairnCounts } from "./notifications/index";
import { CairnsViewProvider, VIEW_ID } from "./sidebar/index";

const PROJECT_ROOT_MARKERS = [
  ".git",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  ".vscode",
];

function findMarkerProjectRoot(
  startDir: string,
  ceiling: string,
): string | null {
  let current = startDir;

  while (true) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      if (fs.existsSync(path.join(current, marker))) {
        return current;
      }
    }

    if (current === ceiling) {
      return null;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function normalizePath(p: string): string {
  try {
    return fs
      .realpathSync(p)
      .replace(/[\\/]+$/, "")
      .toLowerCase();
  } catch {
    return path
      .normalize(p)
      .replace(/[\\/]+$/, "")
      .toLowerCase();
  }
}

function resolveRepoRoot(uri: vscode.Uri): {
  root: string;
  isFallback: boolean;
} {
  const folder = vscode.workspace.getWorkspaceFolder(uri);

  const ceiling = folder?.uri.fsPath ?? os.homedir();

  const markerRoot = findMarkerProjectRoot(path.dirname(uri.fsPath), ceiling);
  if (markerRoot) {
    return { root: normalizePath(markerRoot), isFallback: false };
  }

  if (folder) {
    return { root: normalizePath(folder.uri.fsPath), isFallback: false };
  }

  return { root: normalizePath(path.dirname(uri.fsPath)), isFallback: true };
}

function runStalenessCheck(
  repoRoot: string,
  personal: ScarceItem[],
  shared: ScarceItem[],
): StalenessMap {
  const personalResult = checkStaleness(
    personal,
    (itemId, newStart, newEnd) => {
      const item = personal.find((i) => i.id === itemId);
      if (item) {
        updateItemLines(repoRoot, item.filepath, itemId, newStart, newEnd);
      }
    },
  );

  const sharedResult = checkStaleness(shared, (itemId, newStart, newEnd) => {
    const item = shared.find((i) => i.id === itemId);
    if (item) {
      updateSharedItemLines(repoRoot, item.filepath, itemId, newStart, newEnd);
    }
  });

  const allShifted = [...personalResult.shifted, ...sharedResult.shifted];
  if (allShifted.length > 0) {
    const fileNames = [
      ...new Set(allShifted.map((i) => path.basename(i.filepath))),
    ].join(", ");
    void vscode.window.showInformationMessage(
      `Scarce: updated ${allShifted.length} cairn position${allShifted.length > 1 ? "s" : ""} in ${fileNames}.`,
    );
  }

  return { ...personalResult.map, ...sharedResult.map };
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new CairnsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
  );

  const sweptOnStartup = new Set<string>();
  const notifiedFiles = new Set<string>();

  for (const uri of vscode.window.tabGroups.all
    .flatMap((g) => g.tabs)
    .map((t) =>
      t.input instanceof vscode.TabInputText ? t.input.uri : undefined,
    )
    .filter((u): u is vscode.Uri => u !== undefined && u.scheme === "file")) {
    sweptOnStartup.add(uri.fsPath.toLowerCase());
  }

  const checkAndNotify = (document: vscode.TextDocument) => {
    if (document.uri.scheme !== "file") {
      return;
    }

    if (sweptOnStartup.delete(document.uri.fsPath.toLowerCase())) {
      return;
    }

    const { root: repoRoot } = resolveRepoRoot(document.uri);
    const personalForFile = getItemsForFile(repoRoot, document.uri.fsPath);
    const sharedForFile = getSharedItemsForFile(repoRoot, document.uri.fsPath);

    const allPersonal = Object.values(getItemsForRepo(repoRoot)).flat();
    const allShared = Object.values(getSharedItemsForRepo(repoRoot)).flat();

    if (allPersonal.length > 0 || allShared.length > 0) {
      const stalenessMap = runStalenessCheck(repoRoot, allPersonal, allShared);
      provider.updateStaleness(stalenessMap);
    }

    if (notifiedFiles.has(document.uri.fsPath.toLowerCase())) {
      return;
    }
    notifiedFiles.add(document.uri.fsPath.toLowerCase());

    const counts: CairnCounts = {
      personal: personalForFile,
      shared: sharedForFile,
    };
    notifyForItems(counts, () => provider.reveal(), {
      filePaths: [document.uri.fsPath],
    });
  };

  const fileOpenListener = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        checkAndNotify(editor.document);
      }
    },
  );

  context.subscriptions.push(fileOpenListener);

  const openFileUris = vscode.window.tabGroups.all
    .flatMap((group) => group.tabs)
    .map((tab) =>
      tab.input instanceof vscode.TabInputText ? tab.input.uri : undefined,
    )
    .filter(
      (uri): uri is vscode.Uri => uri !== undefined && uri.scheme === "file",
    );

  const filesWithItems: string[] = [];
  const seenFiles = new Set<string>();
  const startupCounts: CairnCounts = { personal: [], shared: [] };
  const startupStaleness: StalenessMap = {};

  for (const uri of openFileUris) {
    sweptOnStartup.add(uri.fsPath.toLowerCase());
    const { root: repoRoot } = resolveRepoRoot(uri);
    const personal = getItemsForFile(repoRoot, uri.fsPath);
    const shared = getSharedItemsForFile(repoRoot, uri.fsPath);

    if (personal.length > 0 || shared.length > 0) {
      const stalenessMap = runStalenessCheck(repoRoot, personal, shared);
      Object.assign(startupStaleness, stalenessMap);

      if (!seenFiles.has(uri.fsPath)) {
        seenFiles.add(uri.fsPath);
        filesWithItems.push(uri.fsPath);
        startupCounts.personal.push(...personal);
        startupCounts.shared.push(...shared);
      }
    }
  }

  for (const f of sweptOnStartup) {
    notifiedFiles.add(f);
  }

  provider.updateStaleness(startupStaleness);
  notifyForItems(startupCounts, () => provider.reveal(), {
    filePaths: filesWithItems,
  });

  const addToScarce = vscode.commands.registerCommand(
    "scarce.addToScarce",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const selections = editor.selections.filter((s) => !s.isEmpty);
      if (selections.length === 0) {
        vscode.window.showWarningMessage("Scarce: No text selected.");
        return;
      }

      const sorted = [...selections].sort(
        (a, b) => a.start.line - b.start.line,
      );
      const selectedText = sorted
        .map((s) => editor.document.getText(s))
        .join("\n---\n");
      const filePath = editor.document.uri.fsPath;
      const startLine = sorted[0].start.line + 1;
      const endLine = sorted[sorted.length - 1].end.line + 1;

      const comment = await vscode.window.showInputBox({
        title: "Scarce: Add Context",
        prompt: "Why are you saving this?",
        placeHolder: "Add a note for context",
        ignoreFocusOut: true,
      });

      if (comment === undefined) {
        return;
      }

      const severityOptions = [
        {
          label: "$(info) Normal",
          description: "Low priority, fix when possible",
          value: "normal",
        },
        {
          label: "$(warning) High",
          description: "Should be fixed soon",
          value: "high",
        },
        {
          label: "$(error) Critical",
          description: "Must be fixed, will cause issues",
          value: "critical",
        },
      ];

      const picked = await vscode.window.showQuickPick(severityOptions, {
        title: "Scarce: Select Severity",
        placeHolder: "How urgent is this?",
        ignoreFocusOut: true,
      });

      if (!picked) {
        return;
      }

      const scopeOptions = [
        {
          label: "$(home) Personal",
          description: "Saved to ~/.scarce — only visible to you",
          value: "personal",
        },
        {
          label: "$(organization) Shared",
          description: "Saved to <repo>/.scarce — visible to your team",
          value: "shared",
        },
      ];

      const scopePicked = await vscode.window.showQuickPick(scopeOptions, {
        title: "Scarce: Personal or Shared?",
        placeHolder: "Who should see this cairn?",
        ignoreFocusOut: true,
      });

      if (!scopePicked) {
        return;
      }

      const scope = scopePicked.value as "personal" | "shared";

      const item: ScarceItem = {
        id: randomUUID(),
        codeSnapshot: selectedText,
        filepath: filePath,
        startLine,
        endLine,
        comment,
        severity: picked.value as SeverityLevel,
        timestamp: Date.now(),
      };

      const { root: repoRoot, isFallback } = resolveRepoRoot(
        editor.document.uri,
      );

      const { existingCount } =
        scope === "shared"
          ? addSharedItem(repoRoot, item)
          : addItem(repoRoot, item);

      provider.refresh();

      if (scope === "shared" && isFirstSharedCairnInRepo(repoRoot)) {
        if (!isSharedDirGitignored(repoRoot)) {
          const choice = await vscode.window.showWarningMessage(
            "Scarce: .scarce/ is not in your .gitignore. Add it to avoid committing shared cairns.",
            "Add to .gitignore",
            "Ignore",
          );
          if (choice === "Add to .gitignore") {
            const gitignorePath = path.join(repoRoot, ".gitignore");
            const entry = "\n# Scarce shared cairns\n.scarce/\n";
            fs.appendFileSync(gitignorePath, entry, "utf-8");
            vscode.window.showInformationMessage(
              "Scarce: Added .scarce/ to .gitignore.",
            );
          }
        }
      }

      const commentPart = comment ? `: "${comment}"` : "";
      const scopeTag = scope === "shared" ? " [shared]" : "";
      const savedMessage = `Scarce saved [${item.severity.toUpperCase()}]${scopeTag}${commentPart}`;

      if (isFallback) {
        vscode.window.showWarningMessage(
          `${savedMessage} — no project root found. ` +
            `This cairn was saved under the file's own folder and may not be ` +
            `found again if you open a workspace or initialise a project here later.`,
        );
      } else if (existingCount > 0) {
        const cairnWord = existingCount === 1 ? "cairn" : "cairns";
        vscode.window.showWarningMessage(
          `${savedMessage} (${existingCount} other ${cairnWord} share these line numbers)`,
        );
      } else {
        vscode.window.showInformationMessage(savedMessage);
      }
    },
  );

  context.subscriptions.push(addToScarce);
}

export function deactivate() {}
