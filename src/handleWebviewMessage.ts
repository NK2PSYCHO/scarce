/**
 * @packageDocumentation
 * Handles messages received from the webview and delegates persistence to the cairn store.
 */

import type { CairnStore } from './store/cairnStore';
import type { SaveResultMessage, WebviewToExtensionMessage } from '../models/messages';

/**
 * Processes a save or update message and persists it through the store. Store
 * errors are caught and reported in the result instead of being thrown. For an
 * update only `comment` and `severity` are taken from the message.
 *
 * @param message - The message from the webview.
 * @param store - The cairn store for persisting data.
 * @returns A save result message with success status and optional error message,
 *   or undefined for any message that is neither a save nor an update.
 */
export async function handleWebviewMessage(
  message: WebviewToExtensionMessage,
  store: CairnStore,
): Promise<SaveResultMessage | undefined> {
  if (message.type !== 'saveCairn' && message.type !== 'updateCairn') {
    return undefined;
  }
  try {
    if (message.type === 'saveCairn') {
      await store.add(message.input);
    } else {
      await store.update(message.id, {
        comment: message.update.comment,
        severity: message.update.severity,
      });
    }
    return { type: 'saveResult', ok: true };
  } catch (error) {
    return {
      type: 'saveResult',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
