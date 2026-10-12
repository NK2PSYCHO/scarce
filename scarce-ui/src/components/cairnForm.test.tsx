import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cairn } from '@models/cairn';
import { CairnForm } from '@/components/CairnForm';

const baseValues: Omit<Cairn, 'id'> = {
  filePath: '/home/me/proj/src/a.ts',
  lineRange: [4, 6],
  codeSnippet: 'const a = 1;',
  comment: '',
  severity: 'normal',
};

function setup(overrides: Partial<Omit<Cairn, 'id'>> = {}) {
  const initialValues = { ...baseValues, ...overrides };
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<CairnForm initialValues={initialValues} onSubmit={onSubmit} onCancel={onCancel} />);
  return { user, onSubmit, onCancel, initialValues };
}

describe('CairnForm', () => {
  it('shows the file path, snippet and 1-indexed line range read-only', () => {
    setup();
    expect(screen.getByText('/home/me/proj/src/a.ts')).toBeInTheDocument();
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
    expect(screen.getByText('Code Snippet (5 - 7)')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('renders the initial comment and severity', () => {
    setup({ comment: 'existing note', severity: 'high' });
    expect(screen.getByLabelText('Comment')).toHaveValue('existing note');
    expect(screen.getByRole('combobox', { name: 'Severity' })).toHaveTextContent('High');
  });

  it('shows a validation error and does not submit an empty comment', async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Comment is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only comment', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Comment'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Comment is required');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the trimmed comment together with the unchanged read-only fields', async () => {
    const { user, onSubmit, initialValues } = setup();
    await user.type(screen.getByLabelText('Comment'), '  fix this  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      ...initialValues,
      comment: 'fix this',
      severity: 'normal',
    });
  });

  it('calls onCancel without submitting', async () => {
    const { user, onSubmit, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the changed severity', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Comment'), 'non-empty');
    await user.click(screen.getByRole('combobox', { name: 'Severity' }));
    await user.click(screen.getByRole('option', { name: 'High' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ severity: 'high' }));
  });
});
