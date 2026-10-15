/**
 * @packageDocumentation
 * Handles messages received from the webview and delegates persistence to the cairn store.
 */

import type { CairnStore } from './store/cairnStore';
import type { SaveResultMessage, WebviewToExtensionMessage } from '../models/messages';

/**
 * Processes a webview message and persists the cairn to the store. Store
 * errors are caught and reported in the result instead of being thrown.
 *
 * @param message - The message from the webview (save, cancel or ready).
 * @param store - The cairn store for persisting data.
 * @returns A save result message with success status and optional error message,
 *   or undefined for any message that is not a save.
 */
export async function handleWebviewMessage(
  message: WebviewToExtensionMessage,
  store: CairnStore,
): Promise<SaveResultMessage | undefined> {
  if (message.type !== 'saveCairn') {
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
