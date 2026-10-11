import type { CairnInput, WebviewToExtensionMessage } from '@models/messages';

export interface VsCodeApi {
  postMessage(message: WebviewToExtensionMessage): void;
}

export interface ExtensionClient {
  saveCairn(input: CairnInput): void;
  cancel(): void;
}

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
