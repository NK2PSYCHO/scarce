/**
 * @packageDocumentation
 * React hook for receiving messages posted by the extension host.
 */

import { useEffect, useRef } from 'react';
import type { ExtensionToWebviewMessage } from '@models/messages';

/**
 * Type guard that checks if a message is a valid extension-to-webview message.
 *
 * @param data - Unknown data to check.
 * @returns true if data is a showForm, saveResult or changeRootResult message.
 */
function isExtensionMessage(data: unknown): data is ExtensionToWebviewMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const type = (data as { type?: unknown }).type;
  return type === 'showForm' || type === 'saveResult' || type === 'changeRootResult';
}

/**
 * Subscribes to messages from the extension for the lifetime of the component.
 * Only `showForm`, `saveResult` and `changeRootResult` messages reach the handler. The latest
 * handler is always used, so callers need not memoize it.
 *
 * @param handler - Callback invoked when a message from the extension is received.
 */
export function useExtensionMessages(handler: (message: ExtensionToWebviewMessage) => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (event: MessageEvent<unknown>): void => {
      if (isExtensionMessage(event.data)) {
        handlerRef.current(event.data);
      }
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, []);
}
