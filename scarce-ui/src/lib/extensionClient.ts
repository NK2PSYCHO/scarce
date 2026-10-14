/**
 * @packageDocumentation
 * Typed wrapper around the VS Code webview API for webview-to-extension messages.
 */

import type { CairnInput, WebviewToExtensionMessage } from '@models/messages';

/**
 * Subset of the VS Code webview API used by the client.
 */
export interface VsCodeApi {
  /** Posts a message to the extension host. */
  postMessage(message: WebviewToExtensionMessage): void;
}

/**
 * Client interface for sending messages from the webview to the extension.
 */
export interface ExtensionClient {
  /** Asks the extension to save a cairn built from the submitted form. */
  saveCairn(input: CairnInput): void;
  /** Tells the extension the user cancelled the form. */
  cancel(): void;
}

/**
 * Creates an extension client that wraps VS Code's postMessage API.
 *
 * @param api - VS Code webview API instance.
 * @returns An {@link ExtensionClient} that posts `saveCairn` and `cancel` messages.
 */
export function createExtensionClient(api: VsCodeApi): ExtensionClient {
  return {
    saveCairn(input: CairnInput) {
      api.postMessage({ type: 'saveCairn', input });
    },
    cancel() {
      api.postMessage({ type: 'cancel' });
    },
  };
}
