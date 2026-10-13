import { useEffect, useRef } from 'react';
import type { ExtensionToWebviewMessage } from '@models/messages';

/**
 * Type guard that checks if a message is a valid extension-to-webview message.
 *
 * @param data - Unknown data to check.
 * @returns true if data is a showForm or saveResult message.
 */
function isExtensionMessage(data: unknown): data is ExtensionToWebviewMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const type = (data as { type?: unknown }).type;
  return type === 'showForm' || type === 'saveResult';
}

/**
 * Hook that registers a message listener for messages from the extension.
 * Calls the provided handler with any showForm or saveResult messages.
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
