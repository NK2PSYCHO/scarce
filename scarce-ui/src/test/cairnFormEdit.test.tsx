import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CairnForm } from '@/components/cairnForm';

const INITIAL = {
  rootPath: '/repo',
  filePath: 'a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [0, 0] as [number, number],
  comment: 'old',
  severity: 'high' as const,
};

describe('CairnForm without onChangeRoot (edit mode)', () => {
  it('hides Change..., prefills the values and submits the edit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CairnForm initialValues={INITIAL} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Change...' })).toBeNull();
    const comment = screen.getByLabelText<HTMLTextAreaElement>('Comment');
    expect(comment.value).toBe('old');

    await user.clear(comment);
    await user.type(comment, '  new  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ comment: 'new', severity: 'high', filePath: 'a.ts' }),
    );
  });
});
