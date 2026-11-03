/**
 * @packageDocumentation
 * Component tests for `SnippetBlock`: collapsed preview, expand/collapse via
 * mouse and keyboard, indentation, and click isolation from a parent.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnippetBlock } from '@/components/snippetBlock';

const longSnippet = 'line 1\nline 2\nline 3\nline 4\nline 5';

describe('SnippetBlock', () => {
  it('shows a short snippet in full and is not expandable', () => {
    render(<SnippetBlock snippet={'const a = 1;\nconst b = 2;'} />);
    expect(screen.getByText(/const b = 2;/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/Show/)).not.toBeInTheDocument();
  });

  it('shows only the first lines of a long snippet when collapsed', () => {
    render(<SnippetBlock snippet={longSnippet} />);
    const block = screen.getByRole('button');
    expect(block).toHaveAttribute('aria-expanded', 'false');
    expect(block.textContent).toContain('line 3');
    expect(block.textContent).not.toContain('line 4');
    expect(screen.getByText('Show 2 more lines')).toBeInTheDocument();
  });

  it('uses the singular form when one line is hidden', () => {
    render(<SnippetBlock snippet={'a\nb\nc\nd'} />);
    expect(screen.getByText('Show 1 more line')).toBeInTheDocument();
  });

  it('respects a custom previewLines', () => {
    render(<SnippetBlock snippet={longSnippet} previewLines={1} />);
    const block = screen.getByRole('button');
    expect(block.textContent).toContain('line 1');
    expect(block.textContent).not.toContain('line 2');
  });

  it('expands to the full snippet on click and collapses on the next click', async () => {
    const user = userEvent.setup();
    render(<SnippetBlock snippet={longSnippet} />);
    const block = screen.getByRole('button');

    await user.click(block);
    expect(block).toHaveAttribute('aria-expanded', 'true');
    expect(block.textContent).toContain('line 5');
    expect(screen.getByText('Show less')).toBeInTheDocument();

    await user.click(block);
    expect(block).toHaveAttribute('aria-expanded', 'false');
    expect(block.textContent).not.toContain('line 4');
  });

  it.each(['{Enter}', ' '])('toggles from the keyboard with %j', async (key) => {
    const user = userEvent.setup();
    render(<SnippetBlock snippet={longSnippet} />);
    const block = screen.getByRole('button');
    block.focus();

    await user.keyboard(key);
    expect(block).toHaveAttribute('aria-expanded', 'true');
  });

  it('preserves leading indentation and drops trailing whitespace', () => {
    const { container } = render(<SnippetBlock snippet={'if (x) {\n    run();\n}\n\n'} />);
    expect(container.querySelector('code')?.textContent).toBe('if (x) {\n    run();\n}');
  });

  it.each([
    ['short', 'const a = 1;'],
    ['long', longSnippet],
  ])('does not bubble clicks from a %s snippet to its parent', async (_name, snippet) => {
    const user = userEvent.setup();
    const onParentClick = vi.fn();
    render(
      <div onClick={onParentClick}>
        <SnippetBlock snippet={snippet} />
      </div>,
    );

    await user.click(screen.getByText(/line 1|const a/));
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('does not bubble Enter or Space keydown to its parent', async () => {
    const user = userEvent.setup();
    const onParentKeyDown = vi.fn();
    render(
      <div onKeyDown={onParentKeyDown}>
        <SnippetBlock snippet={longSnippet} />
      </div>,
    );
    screen.getByRole('button').focus();

    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onParentKeyDown).not.toHaveBeenCalled();
  });
});
