import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { ScarceItem, SeverityLevel } from "./types/index";
import { addItem, getItemsForFile } from "./storage/index";
import { notifyForItems } from "./notifications/index";
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

export function activate(context: vscode.ExtensionContext) {
  const provider = new CairnsViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
  );

  const sweptOnStartup = new Set<string>();

  const checkAndNotify = (document: vscode.TextDocument) => {
    if (document.uri.scheme !== "file") {
      return;
    }

    if (sweptOnStartup.delete(document.uri.fsPath)) {
      return;
    }

    const { root: repoRoot } = resolveRepoRoot(document.uri);
    const items = getItemsForFile(repoRoot, document.uri.fsPath);
    notifyForItems(items, () => provider.reveal());
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

  const filesWithItems = new Set<string>();
  const startupItems: ScarceItem[] = [];

  for (const uri of openFileUris) {
    sweptOnStartup.add(uri.fsPath);

    const { root: repoRoot } = resolveRepoRoot(uri);
    const items = getItemsForFile(repoRoot, uri.fsPath);
    if (items.length > 0) {
      if (!filesWithItems.has(uri.fsPath)) {
        filesWithItems.add(uri.fsPath);
        startupItems.push(...items);
      }
    }
  }

  notifyForItems(startupItems, () => provider.reveal(), {
    fileCount: filesWithItems.size,
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

      const { existingCount } = addItem(repoRoot, item);
      provider.refresh();

      const commentPart = comment ? `: "${comment}"` : "";
      const savedMessage = `Scarce saved [${item.severity.toUpperCase()}]${commentPart}`;

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
