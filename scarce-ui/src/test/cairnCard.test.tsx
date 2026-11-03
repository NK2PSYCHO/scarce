/**
 * @packageDocumentation
 * Component tests for `CairnCard`: displayed fields, 1-indexed line labels,
 * navigation by click and keyboard, and isolation of the snippet and actions slot.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cairn } from '@models/cairn';
import { CairnCard } from '@/components/cairnCard';

const baseCairn: Cairn = {
  id: 'cairn-1',
  rootPath: '/work/repo',
  filePath: 'src/utils/parse.ts',
  codeSnippet: 'line 1\nline 2\nline 3\nline 4\nline 5',
  lineRange: [4, 7],
  comment: 'Fix this later',
  severity: 'high',
};

describe('CairnCard', () => {
  it('shows file name, directory, 1-indexed lines, severity, comment and snippet', () => {
    render(<CairnCard cairn={baseCairn} onNavigate={vi.fn()} />);

    expect(screen.getByText('parse.ts')).toBeInTheDocument();
    expect(screen.getByText('src/utils')).toBeInTheDocument();
    expect(screen.getByText('Lines 5–8')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Fix this later')).toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: false }).textContent).toContain('line 1');
  });

  it('labels a single-line cairn as "Line N"', () => {
    render(<CairnCard cairn={{ ...baseCairn, lineRange: [9, 9] }} onNavigate={vi.fn()} />);
    expect(screen.getByText('Line 10')).toBeInTheDocument();
  });

  it('omits the directory for a file at the root', () => {
    render(<CairnCard cairn={{ ...baseCairn, filePath: 'README.md' }} onNavigate={vi.fn()} />);
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.queryByText('src/utils')).not.toBeInTheDocument();
  });

  it('navigates with the cairn when the card is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CairnCard cairn={baseCairn} onNavigate={onNavigate} />);

    await user.click(screen.getByText('Fix this later'));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(baseCairn);
  });

  it('exposes navigation as a named button for assistive technology', () => {
    render(<CairnCard cairn={baseCairn} onNavigate={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Go to src/utils/parse.ts, Lines 5–8, high severity' }),
    ).toBeInTheDocument();
  });

  it.each(['{Enter}', ' '])(
    'navigates once when %j is pressed on the focused navigation button',
    async (key) => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      render(<CairnCard cairn={baseCairn} onNavigate={onNavigate} />);
      screen.getByRole('button', { name: /^Go to / }).focus();

      await user.keyboard(key);
      expect(onNavigate).toHaveBeenCalledExactlyOnceWith(baseCairn);
    },
  );

  it('navigates once when the navigation button is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CairnCard cairn={baseCairn} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: /^Go to / }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(baseCairn);
  });

  it('expands the snippet without navigating when the snippet is clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CairnCard cairn={baseCairn} onNavigate={onNavigate} />);
    const snippet = screen.getByRole('button', { expanded: false });

    await user.click(snippet);
    expect(snippet).toHaveAttribute('aria-expanded', 'true');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when Enter toggles the focused snippet', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CairnCard cairn={baseCairn} onNavigate={onNavigate} />);
    screen.getByRole('button', { expanded: false }).focus();

    await user.keyboard('{Enter}');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('renders the actions slot without navigating when its buttons are used', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onDelete = vi.fn();
    render(
      <CairnCard
        cairn={baseCairn}
        onNavigate={onNavigate}
        actions={<button onClick={onDelete}>Delete</button>}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when Enter is pressed on an action button', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CairnCard cairn={baseCairn} onNavigate={onNavigate} actions={<button>Edit</button>} />);
    screen.getByRole('button', { name: 'Edit' }).focus();

    await user.keyboard('{Enter}');
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
