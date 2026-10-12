import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ExtensionToWebviewMessage } from '@models/messages';
import type { ExtensionClient } from '@/lib/extensionClient';
import App from '@/app';

const showForm: ExtensionToWebviewMessage = {
  type: 'showForm',
  draft: { filePath: '/home/me/proj/src/a.ts', codeSnippet: 'const a = 1;', lineRange: [4, 6] },
};

function post(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

function setup() {
  const saveCairn = vi.fn();
  const cancel = vi.fn();
  const client: ExtensionClient = { saveCairn, cancel };
  render(<App client={client} />);
  return { saveCairn, cancel };
}

describe('App', () => {
  it('renders no form until a showForm message arrives', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the form for the drafted selection after showForm', () => {
    setup();
    post(showForm);
    expect(screen.getByText('/home/me/proj/src/a.ts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('posts saveCairn with the draft, comment and severity on submit', async () => {
    const { saveCairn } = setup();
    post(showForm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'check this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(saveCairn).toHaveBeenCalledWith({
        filePath: '/home/me/proj/src/a.ts',
        codeSnippet: 'const a = 1;',
        lineRange: [4, 6],
        comment: 'check this',
        severity: 'normal',
      });
    });
  });

  it('posts cancel and returns to blank on cancel', () => {
    const { cancel } = setup();
    post(showForm);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('returns to blank when saveResult ok arrives', () => {
    setup();
    post(showForm);
    post({ type: 'saveResult', ok: true });
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('shows the error and keeps the form when saveResult fails', () => {
    setup();
    post(showForm);
    post({ type: 'saveResult', ok: false, error: 'disk full' });
    expect(screen.getByText('disk full')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
