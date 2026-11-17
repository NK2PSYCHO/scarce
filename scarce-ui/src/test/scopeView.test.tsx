/**
 * @packageDocumentation
 * Component tests for `ScopeViewPanel`: the global, repo and file views.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cairn, CairnSeverity } from '@models/cairn';
import type { FileGroup, ScopeView } from '@models/scope';
import { ScopeViewPanel } from '@/components/scopeView';

function cairn(id: string, severity: CairnSeverity = 'normal', filePath = 'src/a.ts'): Cairn {
  return {
    id,
    rootPath: '/repo',
    filePath,
    codeSnippet: 'x',
    lineRange: [0, 0],
    comment: `comment ${id}`,
    severity,
  };
}

function fileGroup(filePath: string, cairns: Cairn[]): FileGroup {
  return {
    absolutePath: `/repo/${filePath}`,
    rootPath: '/repo',
    filePath,
    severities: [{ severity: 'normal', cairns }],
  };
}

describe('ScopeViewPanel: global', () => {
  const view: ScopeView = {
    kind: 'global',
    groups: [
      { rootPath: '/work/alpha', label: 'alpha', cairns: [cairn('a1'), cairn('a2')] },
      { rootPath: '/work/beta', label: 'beta', cairns: [cairn('b1')] },
    ],
  };

  it('shows repo groups collapsed, without any cards', () => {
    render(<ScopeViewPanel view={view} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'alpha (2)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: 'beta (1)' })).toHaveAttribute('title', '/work/beta');
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('expands a group to show its cards and navigates on click', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ScopeViewPanel view={view} onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'beta (1)' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await user.click(screen.getByText('comment b1'));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(
      view.kind === 'global' && view.groups[1]?.cairns[0],
    );
  });

  it('shows an empty state with no groups', () => {
    render(<ScopeViewPanel view={{ kind: 'global', groups: [] }} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('No cairns yet');
  });
});

describe('ScopeViewPanel: repo', () => {
  it('shows file groups and severity groups expanded', () => {
    const view: ScopeView = {
      kind: 'repo',
      files: [
        {
          absolutePath: '/repo/src/a.ts',
          rootPath: '/repo',
          filePath: 'src/a.ts',
          severities: [
            { severity: 'critical', cairns: [cairn('c1', 'critical')] },
            { severity: 'normal', cairns: [cairn('n1'), cairn('n2')] },
          ],
        },
      ],
    };
    render(<ScopeViewPanel view={view} onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'src/a.ts (3)' })).toHaveAttribute(
      'title',
      '/repo/src/a.ts',
    );
    expect(screen.getByRole('button', { name: 'Critical (1)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Normal (2)' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('shows an empty state with no files', () => {
    render(<ScopeViewPanel view={{ kind: 'repo', files: [] }} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('No cairns in this repo yet');
  });

  it('has no tabs', () => {
    render(<ScopeViewPanel view={{ kind: 'repo', files: [] }} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});

describe('ScopeViewPanel: file', () => {
  const view: ScopeView = {
    kind: 'file',
    file: [{ severity: 'high', cairns: [cairn('h1', 'high')] }],
    resolved: [],
    repo: [
      fileGroup('src/a.ts', [cairn('n1')]),
      fileGroup('src/b.ts', [cairn('n2', 'normal', 'src/b.ts')]),
    ],
  };

  it('opens on the This file tab', () => {
    render(<ScopeViewPanel view={view} onNavigate={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'This file' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Repo' })).toHaveAttribute('aria-selected', 'false');
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('button', { name: 'High (1)' })).toBeInTheDocument();
    expect(within(panel).getAllByRole('article')).toHaveLength(1);
  });

  it('switches to the Repo tab and back', async () => {
    const user = userEvent.setup();
    render(<ScopeViewPanel view={view} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Repo' }));
    expect(screen.getByRole('tab', { name: 'Repo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'src/b.ts (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'This file' }));
    expect(screen.queryByRole('button', { name: 'src/b.ts (1)' })).toBeNull();
  });

  it('shows an empty state for a file without cairns, not the repo list', () => {
    render(<ScopeViewPanel view={{ ...view, kind: 'file', file: [] }} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('No open cairns in this file');
    expect(screen.queryByRole('button', { name: /src\/a\.ts/ })).toBeNull();
  });

  it('keeps the selected tab when the view updates', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ScopeViewPanel view={view} onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Repo' }));
    rerender(<ScopeViewPanel view={{ ...view }} onNavigate={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Repo' })).toHaveAttribute('aria-selected', 'true');
  });
});
