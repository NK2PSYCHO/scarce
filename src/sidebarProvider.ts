import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import type { CairnDraft, ShowFormMessage, WebviewToExtensionMessage } from '../models/messages';
import type { CairnStore } from './store/cairnStore';
import { handleWebviewMessage } from './handleWebviewMessage';

/**
 * Provides the sidebar webview view for the Scarce extension. Handles webview
 * lifecycle, message passing to the React webview, and displaying the add-Cairn
 * form.
 *
 * @packageDocumentation
 */

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'scarce.sidebar';

  private readonly extensionUri: vscode.Uri;
  private readonly store: CairnStore;
  private view: vscode.WebviewView | undefined;

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
    const distUri = vscode.Uri.joinPath(this.extensionUri, 'scarce-ui', 'dist');
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [distUri],
    };
    webviewView.webview.html = this.getHtml(webviewView.webview, distUri);
    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      void this.handleMessage(message);
    });
  }

  private async handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    const result = await handleWebviewMessage(message, this.store);
    if (result !== undefined) {
      await this.view?.webview.postMessage(result);
    }
  }

  /**
   * Shows the add-Cairn form in the sidebar with the provided draft data.
   * Focuses the sidebar view and posts a showForm message to the webview.
   *
   * @param draft - The cairn draft to pre-populate the form with.
   */
  public async showForm(draft: CairnDraft): Promise<void> {
    await vscode.commands.executeCommand('scarce.sidebar.focus');
    const message: ShowFormMessage = { type: 'showForm', draft };
    await this.view?.webview.postMessage(message);
  }

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
