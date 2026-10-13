import type { CairnStore } from './store/cairnStore';
import type { SaveResultMessage, WebviewToExtensionMessage } from '../models/messages';

/**
 * Handles messages received from the webview, delegating to the cairn store
 * and returning a save result message. Catches errors and returns them in the
 * response.
 *
 * @packageDocumentation
 */

/**
 * Processes a webview message and persists the cairn to the store.
 *
 * @param message - The message from the webview (save or cancel).
 * @param store - The cairn store for persisting data.
 * @returns A save result message with success status and optional error message,
 *   or undefined if the message was a cancel.
 */
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
