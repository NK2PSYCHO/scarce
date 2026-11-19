import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Cairn } from '@models/cairn';
import type { ExtensionClient } from '@/lib/extensionClient';
import App from '@/app';

const CAIRN: Cairn = {
  id: 'c1',
  rootPath: '/repo',
  filePath: 'src/a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [0, 0],
  comment: 'old comment',
  severity: 'normal',
};

const VIEW = {
  type: 'cairnsChanged',
  view: {
    kind: 'repo',
    files: [
      {
        absolutePath: '/repo/src/a.ts',
        rootPath: '/repo',
        filePath: 'src/a.ts',
        severities: [{ severity: 'normal', cairns: [CAIRN] }],
      },
    ],
  },
};

function post(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

function setup() {
  const client = {
    saveCairn: vi.fn(),
    cancel: vi.fn(),
    ready: vi.fn(),
    changeRoot: vi.fn(),
    navigateToCairn: vi.fn(),
    updateCairn: vi.fn(),
  } satisfies ExtensionClient;
  render(<App client={client} />);
  post(VIEW);
  return client;
}

describe('App edit flow', () => {
  it('Edit opens the prefilled form without navigating, and Save sends the update', () => {
    const client = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(client.navigateToCairn).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Change...' })).toBeNull();
    const comment = screen.getByLabelText<HTMLTextAreaElement>('Comment');
    expect(comment.value).toBe('old comment');

    fireEvent.change(comment, { target: { value: 'new comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    return vi.waitFor(() => {
      expect(client.updateCairn).toHaveBeenCalledWith('c1', {
        comment: 'new comment',
        severity: 'normal',
      });
    });
  });

  it('returns to the list after a successful save', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    post({ type: 'saveResult', ok: true });
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByLabelText('Comment')).toBeNull();
  });

  it('shows the error and keeps the form when the update fails', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    post({ type: 'saveResult', ok: false, error: 'Cairn c1 was not found.' });
    expect(screen.getByRole('alert').textContent).toContain('not found');
    expect(screen.getByLabelText('Comment')).toBeTruthy();
  });

  it('Cancel tells the extension and returns to the list', () => {
    const client = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(client.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });
});
