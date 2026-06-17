import * as vscode from "vscode";
import * as path from "path";
import { ScarceItem, SeverityLevel } from "./types/index";
import { addItem, getItemsForFile } from "./storage/index";
import { notifyForItems } from "./notifications/index";
import { CairnsViewProvider, VIEW_ID } from "./sidebar/index";

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

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }

    const repoRoot = workspaceFolders[0].uri.fsPath;
    const items = getItemsForFile(repoRoot, document.uri.fsPath);
    notifyForItems(items, () => provider.reveal());
  };

  const fileOpenListener =
    vscode.workspace.onDidOpenTextDocument(checkAndNotify);

  context.subscriptions.push(fileOpenListener);

  const startupWorkspaceFolders = vscode.workspace.workspaceFolders;
  if (startupWorkspaceFolders) {
    const repoRoot = startupWorkspaceFolders[0].uri.fsPath;
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

      const items = getItemsForFile(repoRoot, uri.fsPath);
      if (items.length > 0) {
        filesWithItems.add(uri.fsPath);
        startupItems.push(...items);
      }
    }

    notifyForItems(startupItems, () => provider.reveal(), {
      fileCount: filesWithItems.size,
    });
  }

  const addToScarce = vscode.commands.registerCommand(
    "scarce.addToScarce",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage("Scarce: No text selected.");
        return;
      }

      const selectedText = editor.document.getText(selection);
      const filePath = editor.document.uri.fsPath;
      const startLine = selection.start.line + 1;
      const endLine = selection.end.line + 1;

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
        id: `${Date.now()}`,
        codeSnapshot: selectedText,
        filepath: filePath,
        startLine,
        endLine,
        comment,
        severity: picked.value as SeverityLevel,
        timestamp: Date.now(),
      };

      const workspaceFolders = vscode.workspace.workspaceFolders;
      const repoRoot = workspaceFolders
        ? workspaceFolders[0].uri.fsPath
        : path.dirname(filePath);

      addItem(repoRoot, item);
      provider.refresh();

      const commentPart = comment ? `: "${comment}"` : "";
      vscode.window.showInformationMessage(
        `Scarce saved [${item.severity.toUpperCase()}]${commentPart}`,
      );

      console.log("[Scarce] item saved", item);
    },
  );

  context.subscriptions.push(addToScarce);
}

export function deactivate() {}
