/**
 * @packageDocumentation
 * Extension activation entry point. Registers the sidebar provider and the
 * `scarce.addAsCairn` command that captures the active editor selection and
 * opens the add-Cairn form.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fsp from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { SidebarProvider } from './sidebarProvider';
import { FileCairnStore } from './store/cairnStore';
import { captureSelection, EmptySelectionError } from './captureSelection';

/**
 * Called by VS Code on activation. Creates the cairn store, then registers the
 * sidebar provider and the `scarce.addAsCairn` command.
 *
 * @param context - The extension context for storing state and registering subscriptions.
 */
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
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand('scarce.addAsCairn', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showErrorMessage('Open a file and select some code first.');
        return;
      }
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (!folder) {
        void vscode.window.showErrorMessage('Open the file inside a workspace folder first.');
        return;
      }
      const selection = editor.selection;
      try {
        const draft = captureSelection({
          rootPath: folder.uri.fsPath,
          filePath: editor.document.uri.fsPath,
          text: editor.document.getText(selection),
          startLine: selection.start.line,
          endLine: selection.end.line,
        });
        await sidebar.showForm(draft, editor.document.uri.fsPath);
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
