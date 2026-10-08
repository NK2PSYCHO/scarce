import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { ExtensionToWebviewMessage } from '@models/messages';
import App from '@/App';

const showForm: ExtensionToWebviewMessage = {
  type: 'showForm',
  draft: { filePath: '/home/me/proj/src/a.ts', codeSnippet: 'const a = 1;', lineRange: [4, 6] },
};

function post(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }));
  });
}

describe('App', () => {
  it('renders no form until a showForm message arrives', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the form for the drafted selection after showForm', () => {
    render(<App />);
    post(showForm);
    expect(screen.getByText('/home/me/proj/src/a.ts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
