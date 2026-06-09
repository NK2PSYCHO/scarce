import * as vscode from "vscode";
import { ScarceItem, SeverityLevel } from "./types/index";

const VIEW_ID = "scarce-cairns";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScarceTodoProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
  );

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
        prompt: "Why are you saving this for ?",
        placeHolder: "Add a note for context",
        ignoreFocusOut: true,
      });

      if (comment === undefined) {
        return;
      }

      const severityOptions = [
        { label: "$(info) Normal", description: "Low priority, fix when possible", value: "normal" },
        { label: "$(warning) High", description: "Should be fixed soon", value: "high" },
        { label: "$(error) Critical", description: "Must be fixed — will cause issues", value: "critical" },
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

      vscode.window.showInformationMessage(
        `Scarce saved [${item.severity.toUpperCase()}]: "${comment || "no comment"}" at ${filePath} L${startLine}`,
      );

      console.log("[Scarce] item captured", item);
    },
  );

  context.subscriptions.push(addToScarce);
}

class ScarceTodoProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = this.getHtml();
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