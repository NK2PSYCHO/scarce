import * as vscode from "vscode";
import * as path from "path";
import { ScarceItem, SeverityLevel } from "./types/index";
import { addItem, getItemsForFile } from "./storage/index";
import { notifyForItems } from "./notifications/index";

const VIEW_ID = "scarce-cairns";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScarceTodoProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
  );

  const checkAndNotify = (document: vscode.TextDocument) => {
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
  const fileCloseListener =
    vscode.workspace.onDidCloseTextDocument(checkAndNotify);

  context.subscriptions.push(fileOpenListener, fileCloseListener);

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
        title: "Scarce — Add Context",
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
          description: "Must be fixed — will cause issues",
          value: "critical",
        },
      ];

      const picked = await vscode.window.showQuickPick(severityOptions, {
        title: "Scarce — Select Severity",
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

      const commentPart = comment ? `: "${comment}"` : "";
      vscode.window.showInformationMessage(
        `Scarce saved [${item.severity.toUpperCase()}]${commentPart}`,
      );

      console.log("[Scarce] item saved", item);
    },
  );

  context.subscriptions.push(addToScarce);
}

class ScarceTodoProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = this.getHtml();
  }

  public reveal(): void {
    if (this.view) {
      this.view.show(true);
    } else {
      void vscode.commands.executeCommand("workbench.view.extension.scarce");
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body {
    font-family: var(--vscode-font-family);
    padding: 12px;
}
</style>
</head>
<body>
    <h3>Scarce Loaded</h3>
</body>
</html>`;
  }
}

export function deactivate() {}
