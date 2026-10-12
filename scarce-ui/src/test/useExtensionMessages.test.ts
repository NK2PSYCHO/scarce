import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ExtensionToWebviewMessage } from '@models/messages';
import { useExtensionMessages } from '@/hooks/useExtensionMessages';

const showForm: ExtensionToWebviewMessage = {
  type: 'showForm',
  draft: { filePath: '/home/me/proj/src/a.ts', codeSnippet: 'const a = 1;', lineRange: [4, 6] },
};

function post(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

describe('useExtensionMessages', () => {
  it('calls the handler with a showForm message', () => {
    const handler = vi.fn();
    renderHook(() => useExtensionMessages(handler));
    post(showForm);
    expect(handler).toHaveBeenCalledExactlyOnceWith(showForm);
  });

  it('ignores data that is not an extension message', () => {
    const handler = vi.fn();
    renderHook(() => useExtensionMessages(handler));
    post({ type: 'bogus' });
    post('hello');
    post(undefined);
    post(null);
    expect(handler).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useExtensionMessages(handler));
    unmount();
    post(showForm);
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler after a rerender', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ handler }: { handler: (message: ExtensionToWebviewMessage) => void }) =>
        useExtensionMessages(handler),
      { initialProps: { handler: first } },
    );
    rerender({ handler: second });
    post(showForm);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(showForm);
  });
});
