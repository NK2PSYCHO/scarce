import { describe, expect, it, vi } from 'vitest';
import { createExtensionClient } from '@/lib/extensionClient';

describe('extension client: navigateToCairn', () => {
  it('posts navigateToCairn with the id', () => {
    const postMessage = vi.fn();
    createExtensionClient({ postMessage }).navigateToCairn('c1');
    expect(postMessage).toHaveBeenCalledWith({ type: 'navigateToCairn', id: 'c1' });
  });
});
