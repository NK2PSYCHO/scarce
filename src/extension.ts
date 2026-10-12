import * as vscode from 'vscode';
import * as path from 'path';
import * as fsp from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { SidebarProvider } from './sidebarProvider';
import { FileCairnStore } from './store/cairnStore';
import { captureSelection, EmptySelectionError } from './captureSelection';

export function activate(context: vscode.ExtensionContext) {
  const store = new FileCairnStore(
    path.join(context.globalStorageUri.fsPath, 'cairns.json'),
    {
      mkdir: (dir) => fsp.mkdir(dir, { recursive: true }),
      readFile: (file) => fsp.readFile(file, 'utf8'),
      writeFile: (file, data) => fsp.writeFile(file, data, 'utf8'),
      rename: (from, to) => fsp.rename(from, to),
    },
    () => randomUUID(),
  );
  const sidebar = new SidebarProvider(context.extensionUri, store);
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
