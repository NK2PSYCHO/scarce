/**
 * @packageDocumentation
 * Unit tests for the webview-side extension client (message posting to the extension host).
 */
import { describe, expect, it, vi } from 'vitest';
import { createExtensionClient } from '@/lib/extensionClient';
import type { CairnInput, WebviewToExtensionMessage } from '@models/messages';

const INPUT: CairnInput = {
  filePath: '/repo/a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
  comment: 'check this',
  severity: 'high',
};

describe('createExtensionClient', () => {
  it('saveCairn posts exactly one message', () => {
    const postMessage = vi.fn<(message: WebviewToExtensionMessage) => void>();
    const client = createExtensionClient({ postMessage });
    client.saveCairn(INPUT);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'saveCairn', input: INPUT });
  });

  it('cancel posts exactly one message', () => {
    const postMessage = vi.fn<(message: WebviewToExtensionMessage) => void>();
    const client = createExtensionClient({ postMessage });
    client.cancel();
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'cancel' });
  });
});
