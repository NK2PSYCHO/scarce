import type { CairnInput, WebviewToExtensionMessage } from '@models/messages';

/**
 * VS Code webview API interface for posting messages to the extension.
 */
export interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
}

/**
 * Client interface for sending messages from the webview to the extension.
 */
export interface ExtensionClient {
  saveCairn(input: CairnInput): void;
  cancel(): void;
}

/**
 * Creates an extension client that wraps VS Code's postMessage API.
 *
 * @param api - VS Code webview API instance.
 * @returns ExtensionClient for sending saveCairn and cancel messages.
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
