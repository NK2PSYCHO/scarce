import * as vscode from "vscode";

const VIEW_ID = "scarce-to-do";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScarceTodoProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider),
  );
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
