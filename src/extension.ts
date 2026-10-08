import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { captureSelection, EmptySelectionError } from './captureSelection';

export function activate(context: vscode.ExtensionContext) {
  const sidebar = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar),
    vscode.commands.registerCommand('scarce.addAsCairn', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showErrorMessage('Open a file and select some code first.');
        return;
      }
      const selection = editor.selection;
      try {
        const draft = captureSelection({
          filePath: editor.document.uri.fsPath,
          text: editor.document.getText(selection),
          startLine: selection.start.line,
          endLine: selection.end.line,
        });
        await sidebar.showForm(draft);
      } catch (error) {
        if (error instanceof EmptySelectionError) {
          void vscode.window.showErrorMessage(error.message);
          return;
        }
        throw error;
      }
    }),
  );
}
