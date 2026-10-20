/**
 * @packageDocumentation
 * Component tests for the root `App`: renders the cairn form when the
 * extension sends a draft, and handles the save/cancel flow back to the host.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ExtensionToWebviewMessage } from '@models/messages';
import type { ExtensionClient } from '@/lib/extensionClient';
import App from '@/app';

const showForm: ExtensionToWebviewMessage = {
  type: 'showForm',
  draft: {
    rootPath: '/home/me/proj',
    filePath: 'src/a.ts',
    codeSnippet: 'const a = 1;',
    lineRange: [4, 6],
  },
};

function post(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

function setup() {
  const saveCairn = vi.fn();
  const cancel = vi.fn();
  const ready = vi.fn();
  const changeRoot = vi.fn();
  const client: ExtensionClient = { saveCairn, cancel, ready, changeRoot };
  render(<App client={client} />);
  return { saveCairn, cancel, ready, changeRoot };
}

describe('App', () => {
  it('announces ready once on mount', () => {
    const { ready } = setup();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('renders no form until a showForm message arrives', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the form for the drafted selection after showForm', () => {
    setup();
    post(showForm);
    expect(screen.getByText('/home/me/proj')).toBeInTheDocument();
    expect(screen.getByText('src/a.ts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('posts saveCairn with the relative path, snippet, comment and severity, without rootPath', async () => {
    const { saveCairn } = setup();
    post(showForm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'check this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(saveCairn).toHaveBeenCalledWith({
        filePath: 'src/a.ts',
        codeSnippet: 'const a = 1;',
        lineRange: [4, 6],
        comment: 'check this',
        severity: 'normal',
      });
    });
  });

  it('resets the form when a new showForm arrives', async () => {
    const { saveCairn } = setup();
    post(showForm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'old comment' } });
    post({
      type: 'showForm',
      draft: {
        rootPath: '/home/me/proj',
        filePath: 'src/b.ts',
        codeSnippet: 'const b = 2;',
        lineRange: [10, 12],
      },
    });
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByText('src/b.ts')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(saveCairn).toHaveBeenCalledWith({
        filePath: 'src/b.ts',
        codeSnippet: 'const b = 2;',
        lineRange: [10, 12],
        comment: 'new comment',
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

  it('posts changeRoot when Change... is clicked', () => {
    const { changeRoot, saveCairn } = setup();
    post(showForm);
    fireEvent.click(screen.getByRole('button', { name: 'Change...' }));
    expect(changeRoot).toHaveBeenCalledTimes(1);
    expect(saveCairn).not.toHaveBeenCalled();
  });

  it('updates root and path on changeRootResult ok without resetting the form', () => {
    setup();
    post(showForm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'keep me' } });
    post({
      type: 'changeRootResult',
      ok: true,
      rootPath: '/home/me',
      filePath: 'proj/src/a.ts',
    });
    expect(screen.getByRole('textbox')).toHaveValue('keep me');
    expect(screen.getByText('/home/me')).toBeInTheDocument();
    expect(screen.getByText('proj/src/a.ts')).toBeInTheDocument();
    expect(screen.queryByText('/home/me/proj')).toBeNull();
  });

  it('saves with the new relative path after a root change', async () => {
    const { saveCairn } = setup();
    post(showForm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'keep me' } });
    post({
      type: 'changeRootResult',
      ok: true,
      rootPath: '/home/me',
      filePath: 'proj/src/a.ts',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(saveCairn).toHaveBeenCalledWith({
        filePath: 'proj/src/a.ts',
        codeSnippet: 'const a = 1;',
        lineRange: [4, 6],
        comment: 'keep me',
        severity: 'normal',
      });
    });
  });

  it('shows the error and keeps the form, values and old root when changeRootResult fails', () => {
    setup();
    post(showForm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'keep me' } });
    post({
      type: 'changeRootResult',
      ok: false,
      error: 'not a folder',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('not a folder');
    expect(screen.getByRole('textbox')).toHaveValue('keep me');
    expect(screen.getByText('/home/me/proj')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('clears the error when a later changeRootResult succeeds', () => {
    setup();
    post(showForm);
    post({
      type: 'changeRootResult',
      ok: false,
      error: 'not a folder',
    });
    post({
      type: 'changeRootResult',
      ok: true,
      rootPath: '/home/me',
      filePath: 'proj/src/a.ts',
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('proj/src/a.ts')).toBeInTheDocument();
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
