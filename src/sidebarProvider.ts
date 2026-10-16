/**
 * @packageDocumentation
 * Sidebar webview view provider for the Scarce extension.
 */

import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import type { CairnDraft, ShowFormMessage, WebviewToExtensionMessage } from '../models/messages';
import type { CairnStore } from './store/cairnStore';
import { handleWebviewMessage } from './handleWebviewMessage';
import { resolveRootChange } from './changeRoot';

/**
 * Webview view provider for the Scarce sidebar. Owns the webview lifecycle,
 * relays messages to and from the React app, and shows the add-Cairn form.
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
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

  /**
   * Creates a new sidebar provider.
   *
   * @param extensionUri - The URI of the extension installation directory.
   * @param store - The cairn store for persisting cairns.
   */
  constructor(extensionUri: vscode.Uri, store: CairnStore) {
    this.extensionUri = extensionUri;
    this.store = store;
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
        }
        return;
      }
      void this.handleMessage(message);
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
    const result = await handleWebviewMessage(message, this.store);
    if (result !== undefined) {
      await this.view?.webview.postMessage(result);
    }
  }

  /**
   * Shows the add-Cairn form in the sidebar with the provided draft data.
   * The draft is stored first and delivered once the webview app has posted
   * `ready`, so it is not lost when the view is opened for the first time or
   * recreated after being hidden.
   *
   * @param draft - The cairn draft to pre-populate the form with.
   * @param absoluteFilePath - Absolute path of the file the draft was captured from, kept for root changes.
   */
  public async showForm(draft: CairnDraft, absoluteFilePath: string): Promise<void> {
    this.pendingDraft = draft;
    this.absoluteFile = absoluteFilePath;
    this.currentRoot = draft.rootPath;
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
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(currentRoot),
    });
    const folder = picked?.[0];
    if (folder === undefined) {
      return;
    }
    const result = resolveRootChange(folder.fsPath, absoluteFile);
    if (result.ok) {
      this.currentRoot = result.rootPath;
    }
    await this.view?.webview.postMessage(result);
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
