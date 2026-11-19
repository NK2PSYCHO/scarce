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
import { pickRoot } from './pickRoot';
import { activeFileOf, type ScopeInput } from './scope';
import type { RootMemory } from './rootMemory';
import { navigateToCairn } from './navigateToCairn';
import { consumePendingNavigation, writePending, type PendingStore } from './pendingNavigation';
import type { Cairn } from '../models/cairn';

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
  const rootMemory: RootMemory = {
    get: (folder) => context.workspaceState.get<string>(`scarce.root:${folder}`),
    set: (folder, root) => context.workspaceState.update(`scarce.root:${folder}`, root),
  };
  const pendingStore: PendingStore = {
    get: () => context.globalState.get('scarce.pendingNavigation'),
    set: (value) => context.globalState.update('scarce.pendingNavigation', value),
  };
  const openInNewWindow = async (cairn: Cairn): Promise<void> => {
    await fsp.access(cairn.rootPath);
    await writePending(pendingStore, cairn.id, Date.now());
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(cairn.rootPath), {
      forceNewWindow: true,
    });
  };
  const scopeSource = (): ScopeInput => {
    const editor = vscode.window.activeTextEditor;
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    return {
      workspaceFolders: (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath),
      activeFile: activeFileOf(
        editor
          ? { scheme: editor.document.uri.scheme, fsPath: editor.document.uri.fsPath }
          : undefined,
        activeTab?.input instanceof vscode.TabInputTextDiff,
      ),
    };
  };
  const sidebar = new SidebarProvider(
    context.extensionUri,
    store,
    rootMemory,
    scopeSource,
    openInNewWindow,
  );
  const refreshSidebar = (): void => {
    void sidebar.refresh();
  };
  const consumePending = (): void => {
    void consumePendingNavigation({
      pending: pendingStore,
      listCairns: () => store.list(),
      workspaceFolders: () => (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath),
      now: () => Date.now(),
      navigate: navigateToCairn,
    }).catch((error: unknown) => {
      console.error('Scarce: pending navigation failed', error);
    });
  };
  consumePending();
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(refreshSidebar),
    vscode.window.tabGroups.onDidChangeTabs(refreshSidebar),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshSidebar),
    vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        refreshSidebar();
        consumePending();
      }
    }),
  );
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
          rootPath: pickRoot(
            folder.uri.fsPath,
            rootMemory.get(folder.uri.fsPath),
            editor.document.uri.fsPath,
          ),
          filePath: editor.document.uri.fsPath,
          text: editor.document.getText(selection),
          startLine: selection.start.line,
          endLine: selection.end.line,
        });
        await sidebar.showForm(draft, editor.document.uri.fsPath, folder.uri.fsPath);
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
