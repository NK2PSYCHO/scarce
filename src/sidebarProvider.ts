/**
 * @packageDocumentation
 * Sidebar webview view provider for the Scarce extension.
 */

import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import type {
  CairnDraft,
  CairnsChangedMessage,
  ListErrorMessage,
  ShowFormMessage,
  WebviewToExtensionMessage,
} from '../models/messages';
import type { CairnStore } from './store/cairnStore';
import { handleWebviewMessage } from './handleWebviewMessage';
import { resolveRootChange } from './changeRoot';
import type { RootMemory } from './rootMemory';
import { absolutePathOf, buildScopeView, isInsideAnyFolder, type ScopeInput } from './scope';
import type { Cairn } from '../models/cairn';
import { navigateToCairn } from './navigateToCairn';

/** Reports the workspace folders and active file as they are right now. */
export type ScopeSource = () => ScopeInput;

/** Opens a Cairn's repo in a new window and arranges for the jump to happen there. */
export type OpenInNewWindow = (cairn: Cairn) => Promise<void>;

/**
 * Webview view provider for the Scarce sidebar. Owns the webview lifecycle,
 * relays messages to and from the React app, and shows the add-Cairn form.
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  private formId = 0;
  /** View id, matching the entry under `contributes.views` in `package.json`. */
  public static readonly viewType = 'scarce.sidebar';

  private readonly extensionUri: vscode.Uri;
  private readonly store: CairnStore;
  private view: vscode.WebviewView | undefined;
  /** Draft waiting for the webview app to signal it is ready to receive it. */
  private pendingDraft: CairnDraft | undefined;
  /** True once the current webview's React app has posted `ready`. */
  private webviewReady = false;
  /** Absolute path of the file the current form is for; used to recompute the relative path on a root change. */
  private absoluteFile: string | undefined;
  /** Root folder currently chosen for the form; the folder picker opens here. */
  private currentRoot: string | undefined;
  /** Remembers the root chosen with Change... per workspace folder; optional. */
  private readonly rootMemory: RootMemory | undefined;
  /** Workspace folder of the current form; the key the chosen root is remembered under. */
  private workspaceFolder: string | undefined;
  /** Reads the current workspace and active file; without it, {@link SidebarProvider.refresh} does nothing. */
  private readonly scopeSource: ScopeSource | undefined;
  /** Counts refreshes so a slow, older one never overwrites a newer result. */
  private refreshSeq = 0;
  /** Used for Cairns outside every open workspace folder (the global view). */
  private readonly openInNewWindow: OpenInNewWindow | undefined;

  /**
   * Creates a new sidebar provider.
   *
   * @param extensionUri - The URI of the extension installation directory.
   * @param store - The cairn store for persisting cairns.
   * @param rootMemory - Optional memory of the root chosen per workspace folder.
   * @param scopeSource - Optional reader of the workspace folders and active file.
   * @param openInNewWindow - Optional handoff for Cairns outside the open workspace folders.
   */
  constructor(
    extensionUri: vscode.Uri,
    store: CairnStore,
    rootMemory?: RootMemory,
    scopeSource?: ScopeSource,
    openInNewWindow?: OpenInNewWindow,
  ) {
    this.extensionUri = extensionUri;
    this.store = store;
    this.rootMemory = rootMemory;
    this.scopeSource = scopeSource;
    this.openInNewWindow = openInNewWindow;
  }

  /**
   * Called by VS Code when the sidebar view is first created. Sets up the
   * webview with the React app HTML, enables scripts, and registers the
   * message handler.
   *
   * @param webviewView - The webview view instance provided by VS Code.
   */
  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.webviewReady = false;
    const distUri = vscode.Uri.joinPath(this.extensionUri, 'scarce-ui', 'dist');
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [distUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview, distUri);
    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      if (message.type === 'ready') {
        if (this.view === webviewView) {
          this.webviewReady = true;
          void this.flushPendingDraft();
          void this.refresh();
        }
        return;
      }
      void this.handleMessage(message);
    });
    webviewView.onDidChangeVisibility(() => {
      if (this.view === webviewView && webviewView.visible) {
        void this.refresh();
      }
    });
    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
        this.webviewReady = false;
      }
    });
  }

  /**
   * Forwards a webview message to the handler and posts any result back.
   *
   * @param message - The message received from the webview.
   */
  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    if (message.type === 'changeRoot') {
      await this.handleChangeRoot();
      return;
    }
    if (message.type === 'navigateToCairn') {
      await this.handleNavigate(message.id);
      return;
    }
    const result = await handleWebviewMessage(message, this.store);
    if (result?.ok === true || message.type === 'cancel') {
      await this.refresh();
    }
    if (result !== undefined) {
      await this.view?.webview.postMessage(result);
    }
  }

  /**
   * Opens the file of the Cairn with the given id and selects its lines. Warns
   * if the Cairn is gone, the file cannot be opened or the store cannot be read.
   *
   * @param id - Id of the Cairn the user clicked.
   */
  private async handleNavigate(id: string): Promise<void> {
    try {
      const cairn = (await this.store.list()).find((c) => c.id === id);
      if (cairn === undefined) {
        void vscode.window.showWarningMessage('Scarce: that cairn no longer exists.');
        await this.refresh();
        return;
      }
      const folders = this.scopeSource?.().workspaceFolders;
      if (
        folders !== undefined &&
        this.openInNewWindow !== undefined &&
        !isInsideAnyFolder(absolutePathOf(cairn), folders)
      ) {
        await this.openInNewWindow(cairn);
        return;
      }
      if (!(await navigateToCairn(cairn))) {
        void vscode.window.showWarningMessage(`Scarce: could not open ${cairn.filePath}.`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      void vscode.window.showWarningMessage(`Scarce: could not open the cairn. ${reason}`);
    }
  }

  /**
   * Reads every Cairn, builds the view for the scope as it is now and posts it
   * to the webview. A read failure is posted as `listError`. Does nothing until
   * the webview is ready or without a scope source. If a newer refresh starts
   * while this one is reading, this one's result is dropped.
   */
  public async refresh(): Promise<void> {
    const view = this.view;
    const scopeSource = this.scopeSource;
    if (view === undefined || !this.webviewReady || scopeSource === undefined) {
      return;
    }
    const seq = ++this.refreshSeq;
    let message: CairnsChangedMessage | ListErrorMessage;
    try {
      const cairns = await this.store.list();
      message = { type: 'cairnsChanged', view: buildScopeView(cairns, scopeSource()) };
    } catch (error) {
      message = {
        type: 'listError',
        error: error instanceof Error ? error.message : String(error),
      };
    }
    if (seq !== this.refreshSeq || this.view !== view) {
      return;
    }
    await view.webview.postMessage(message);
  }

  /**
   * Shows the add-Cairn form in the sidebar with the provided draft data.
   * The draft is stored first and delivered once the webview app has posted
   * `ready`, so it is not lost when the view is opened for the first time or
   * recreated after being hidden.
   *
   * @param draft - The cairn draft to pre-populate the form with.
   * @param absoluteFilePath - Absolute path of the file the draft was captured from, kept for root changes.
   * @param workspaceFolder - Workspace folder of the file; the key under which a changed root is remembered.
   */
  public async showForm(
    draft: CairnDraft,
    absoluteFilePath: string,
    workspaceFolder?: string,
  ): Promise<void> {
    this.formId++;
    this.pendingDraft = draft;
    this.absoluteFile = absoluteFilePath;
    this.currentRoot = draft.rootPath;
    this.workspaceFolder = workspaceFolder;
    await vscode.commands.executeCommand('scarce.sidebar.focus');
    await this.flushPendingDraft();
  }

  /**
   * Opens a folder picker for the form's root and posts the outcome to the webview.
   * Does nothing if no form was shown yet or the picker is cancelled. The stored root
   * only changes when the file is inside the picked folder.
   */
  private async handleChangeRoot(): Promise<void> {
    const absoluteFile = this.absoluteFile;
    const currentRoot = this.currentRoot;
    if (absoluteFile === undefined || currentRoot === undefined) {
      return;
    }
    const formId = this.formId;
    const workspaceKey = this.workspaceFolder;
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(currentRoot),
    });
    const folder = picked?.[0];
    if (formId !== this.formId || folder === undefined) {
      return;
    }
    const result = resolveRootChange(folder.fsPath, absoluteFile);
    if (result.ok) {
      this.currentRoot = result.rootPath;
    }
    await this.view?.webview.postMessage(result);
    if (result.ok && workspaceKey !== undefined) {
      try {
        await this.rootMemory?.set(workspaceKey, result.rootPath);
      } catch (err) {
        console.error('Failed to persist root', err);
      }
    }
  }

  /**
   * Posts the pending draft if the webview is ready. The draft is cleared
   * before posting so it is delivered at most once, and restored if VS Code
   * reports that the message was not delivered.
   */
  private async flushPendingDraft(): Promise<void> {
    const draft = this.pendingDraft;
    if (!this.webviewReady || this.view === undefined || draft === undefined) {
      return;
    }
    this.pendingDraft = undefined;
    const message: ShowFormMessage = { type: 'showForm', draft };
    const delivered = await this.view.webview.postMessage(message);
    if (!delivered && this.pendingDraft === undefined) {
      this.pendingDraft = draft;
    }
  }

  /**
   * Builds the webview HTML: a shell locked down by a CSP with a per-load
   * nonce that loads the bundled React app.
   *
   * @param webview - The webview the HTML is for, used to resolve resource URIs.
   * @param distUri - The `scarce-ui/dist` directory containing the built bundle.
   * @returns The complete HTML document.
   */
  private getHtml(webview: vscode.Webview, distUri: vscode.Uri): string {
    const nonce = randomBytes(16).toString('hex');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, 'main.css'));

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;"
    />
    <link rel="stylesheet" href="${styleUri.toString()}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" nonce="${nonce}" src="${scriptUri.toString()}"></script>
  </body>
</html>`;
  }
}
