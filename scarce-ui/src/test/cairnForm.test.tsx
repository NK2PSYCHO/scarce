/**
 * @packageDocumentation
 * Component tests for `CairnForm`: read-only path/lines/snippet display,
 * comment and severity inputs, and Save/Cancel behaviour.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CairnDraft } from '@models/messages';
import { CairnForm, type CairnFormFields } from '@/components/cairnForm';

const baseValues: CairnDraft & CairnFormFields = {
  rootPath: '/home/me/proj',
  filePath: 'src/a.ts',
  lineRange: [4, 6],
  codeSnippet: 'const a = 1;',
  comment: '',
  severity: 'normal',
};

function setup(overrides: Partial<CairnDraft & CairnFormFields> = {}) {
  const initialValues = { ...baseValues, ...overrides };
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const onChangeRoot = vi.fn();
  const user = userEvent.setup();
  render(
    <CairnForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      onChangeRoot={onChangeRoot}
    />,
  );
  return { user, onSubmit, onCancel, onChangeRoot, initialValues };
}

describe('CairnForm', () => {
  it('shows the file path, snippet and 1-indexed line range read-only', () => {
    setup();
    expect(screen.getByText('/home/me/proj')).toBeInTheDocument();
    expect(screen.getByText('src/a.ts')).toBeInTheDocument();
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

  it('submits the trimmed comment with the draft fields but without rootPath', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Comment'), '  fix this  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      filePath: 'src/a.ts',
      lineRange: [4, 6],
      codeSnippet: 'const a = 1;',
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

  it('does not include rootPath in the submitted values', async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText('Comment'), 'non-empty');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.not.objectContaining({ rootPath: '/home/me/proj' }),
    );
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

  it('calls onChangeRoot without submitting or validating', async () => {
    const { user, onSubmit, onChangeRoot } = setup();
    await user.click(screen.getByRole('button', { name: 'Change...' }));
    expect(onChangeRoot).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
