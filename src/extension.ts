import * as vscode from "vscode";
import { ScarceItem } from "./types/index";

const VIEW_ID = "scarce-to-do";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScarceTodoProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
  );

  const addToScarce = vscode.commands.registerCommand(
    "scarce.addToScarce",
    () => {
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

      const item: ScarceItem = {
        id: `${Date.now()}`,
        codeSnapshot: selectedText,
        filepath: filePath,
        startLine,
        endLine,
        comment: "",
        severity: "normal",
        timestamp: Date.now(),
      };

      vscode.window.showInformationMessage(
        `Scarce captured: ${filePath} | Lines ${startLine}–${endLine} | "${selectedText.slice(0, 60)}${selectedText.length > 60 ? "…" : ""}"`,
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
