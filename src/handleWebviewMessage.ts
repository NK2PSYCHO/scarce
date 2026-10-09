import type { CairnStore } from './store/CairnStore';
import type { SaveResultMessage, WebviewToExtensionMessage } from '../models/messages';

export async function handleWebviewMessage(
  message: WebviewToExtensionMessage,
  store: CairnStore,
): Promise<SaveResultMessage | undefined> {
  if (message.type === 'cancel') {
    return undefined;
  }
  try {
    await store.add(message.input);
    return { type: 'saveResult', ok: true };
  } catch (error) {
    return {
      type: 'saveResult',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
