/**
 * @packageDocumentation
 * Component tests for `CairnList`: empty state, severity ordering, input
 * immutability, navigation callback and per-card actions.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cairn, CairnSeverity } from '@models/cairn';
import { CairnList } from '@/components/cairnList';

function makeCairn(id: string, severity: CairnSeverity): Cairn {
  return {
    id,
    rootPath: '/work/repo',
    filePath: `src/${id}.ts`,
    codeSnippet: 'const a = 1;',
    lineRange: [0, 0],
    comment: `comment ${id}`,
    severity,
  };
}

function shownIds(): (string | null)[] {
  return screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));
}

describe('CairnList', () => {
  it('shows an empty state when there are no cairns', () => {
    render(<CairnList cairns={[]} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('No cairns yet');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders one card per cairn', () => {
    render(
      <CairnList
        cairns={[makeCairn('a', 'normal'), makeCairn('b', 'high')]}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('sorts critical first, then high, then normal, keeping order within a severity', () => {
    render(
      <CairnList
        cairns={[
          makeCairn('n1', 'normal'),
          makeCairn('h1', 'high'),
          makeCairn('c1', 'critical'),
          makeCairn('n2', 'normal'),
          makeCairn('c2', 'critical'),
          makeCairn('h2', 'high'),
        ]}
        onNavigate={vi.fn()}
      />,
    );
    expect(shownIds()).toEqual([
      'Cairn in src/c1.ts, Line 1',
      'Cairn in src/c2.ts, Line 1',
      'Cairn in src/h1.ts, Line 1',
      'Cairn in src/h2.ts, Line 1',
      'Cairn in src/n1.ts, Line 1',
      'Cairn in src/n2.ts, Line 1',
    ]);
  });

  it('does not mutate the cairns array it was given', () => {
    const cairns = [makeCairn('n1', 'normal'), makeCairn('c1', 'critical')];
    render(<CairnList cairns={cairns} onNavigate={vi.fn()} />);
    expect(cairns.map((cairn) => cairn.id)).toEqual(['n1', 'c1']);
  });

  it('calls onNavigate with the cairn that was clicked', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const target = makeCairn('b', 'high');
    render(<CairnList cairns={[makeCairn('a', 'normal'), target]} onNavigate={onNavigate} />);

    await user.click(screen.getByText('comment b'));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(target);
  });

  it('renders per-cairn actions from renderActions', () => {
    render(
      <CairnList
        cairns={[makeCairn('a', 'normal'), makeCairn('b', 'high')]}
        onNavigate={vi.fn()}
        renderActions={(cairn) => <button>{`Delete ${cairn.id}`}</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Delete a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete b' })).toBeInTheDocument();
  });
});
