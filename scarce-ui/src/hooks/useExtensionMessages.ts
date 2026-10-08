import { useEffect, useRef } from 'react';
import type { ExtensionToWebviewMessage } from '@models/messages';

function isExtensionMessage(data: unknown): data is ExtensionToWebviewMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const type = (data as { type?: unknown }).type;
  return type === 'showForm' || type === 'saveResult';
}

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
