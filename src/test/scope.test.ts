/**
 * @packageDocumentation
 * Unit tests for the pure scope and grouping functions: scope selection,
 * global/repo/file views, resolved handling and ordering.
 */
import * as assert from 'assert';
import { buildScopeView, groupByRepo, groupBySeverity, selectScope } from '../scope';
import type { Cairn } from '../../models/cairn';
import type { FileScopeView, GlobalScopeView, RepoScopeView } from '../../models/scope';

function cairn(id: string, overrides: Partial<Cairn> = {}): Cairn {
  return {
    id,
    rootPath: '/repo',
    filePath: 'src/a.ts',
    codeSnippet: 'x',
    lineRange: [0, 0],
    comment: id,
    severity: 'normal',
    ...overrides,
  };
}

function ids(cairns: Cairn[]): string[] {
  return cairns.map((c) => c.id);
}

suite('selectScope', () => {
  test('global when no workspace is open, even with an active file', () => {
    assert.strictEqual(selectScope({ workspaceFolders: [], activeFile: undefined }), 'global');
    assert.strictEqual(selectScope({ workspaceFolders: [], activeFile: '/x/y.ts' }), 'global');
  });

  test('repo when a workspace is open and no file is active', () => {
    assert.strictEqual(selectScope({ workspaceFolders: ['/repo'], activeFile: undefined }), 'repo');
  });

  test('file when a workspace is open and a file is active', () => {
    assert.strictEqual(
      selectScope({ workspaceFolders: ['/repo'], activeFile: '/repo/a.ts' }),
      'file',
    );
  });
});

suite('groupBySeverity', () => {
  test('orders critical, high, normal and omits empty severities', () => {
    const groups = groupBySeverity([
      cairn('n', { severity: 'normal' }),
      cairn('c', { severity: 'critical' }),
    ]);
    assert.deepStrictEqual(
      groups.map((g) => g.severity),
      ['critical', 'normal'],
    );
  });

  test('sorts by start line within a severity and keeps ties in input order', () => {
    const [group] = groupBySeverity([
      cairn('late', { lineRange: [9, 9] }),
      cairn('tie-1', { lineRange: [2, 2] }),
      cairn('tie-2', { lineRange: [2, 2] }),
    ]);
    assert.deepStrictEqual(ids(group?.cairns ?? []), ['tie-1', 'tie-2', 'late']);
  });
});

suite('groupByRepo', () => {
  test('labels by folder name, tolerates a trailing slash, falls back to the path for a root', () => {
    const groups = groupByRepo([
      cairn('a', { rootPath: '/work/app/' }),
      cairn('b', { rootPath: '/' }),
    ]);
    assert.deepStrictEqual(
      groups.map((g) => g.label),
      ['/', 'app'],
    );
  });
});

suite('buildScopeView: global', () => {
  const view = (cairns: Cairn[]): GlobalScopeView =>
    buildScopeView(cairns, { workspaceFolders: [], activeFile: undefined }) as GlobalScopeView;

  test('groups open cairns by rootPath, sorted by folder name', () => {
    const result = view([
      cairn('z', { rootPath: '/w/zeta' }),
      cairn('a', { rootPath: '/w/alpha' }),
    ]);
    assert.strictEqual(result.kind, 'global');
    assert.deepStrictEqual(
      result.groups.map((g) => [g.label, g.rootPath]),
      [
        ['alpha', '/w/alpha'],
        ['zeta', '/w/zeta'],
      ],
    );
  });

  test('keeps a flat list per repo sorted critical, high, normal', () => {
    const [group] = view([
      cairn('n', { severity: 'normal' }),
      cairn('c', { severity: 'critical' }),
      cairn('h', { severity: 'high' }),
    ]).groups;
    assert.deepStrictEqual(ids(group?.cairns ?? []), ['c', 'h', 'n']);
  });

  test('never shows resolved cairns and drops a group that only had resolved ones', () => {
    const result = view([
      cairn('open', { rootPath: '/a' }),
      cairn('done', { rootPath: '/b', resolved: true, resolvedAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    assert.deepStrictEqual(
      result.groups.map((g) => g.rootPath),
      ['/a'],
    );
  });

  test('shows the same repo name under two different roots as two groups', () => {
    const result = view([
      cairn('a', { rootPath: '/one/app' }),
      cairn('b', { rootPath: '/two/app' }),
    ]);
    assert.strictEqual(result.groups.length, 2);
  });

  test('returns no groups when there are no cairns', () => {
    assert.deepStrictEqual(view([]).groups, []);
  });
});

suite('buildScopeView: repo', () => {
  const view = (cairns: Cairn[], folders: string[] = ['/repo']): RepoScopeView =>
    buildScopeView(cairns, { workspaceFolders: folders, activeFile: undefined }) as RepoScopeView;

  test('shows only cairns inside the open workspace folder', () => {
    const result = view([
      cairn('in', { filePath: 'a.ts' }),
      cairn('out', { rootPath: '/elsewhere' }),
    ]);
    assert.deepStrictEqual(
      result.files.map((f) => f.severities.flatMap((s) => ids(s.cairns))),
      [['in']],
    );
  });

  test('matches by absolute path, so a subfolder root inside the workspace counts', () => {
    const result = view([cairn('sub', { rootPath: '/repo/packages/a', filePath: 'x.ts' })]);
    assert.strictEqual(result.files.length, 1);
  });

  test('does not match a sibling folder that shares a name prefix', () => {
    assert.deepStrictEqual(view([cairn('x', { rootPath: '/repo-other' })]).files, []);
  });

  test('treats a multi-root workspace as the union of its folders', () => {
    const result = view(
      [
        cairn('a', { rootPath: '/one' }),
        cairn('b', { rootPath: '/two' }),
        cairn('c', { rootPath: '/three' }),
      ],
      ['/one', '/two'],
    );
    assert.deepStrictEqual(
      result.files.map((f) => f.rootPath),
      ['/one', '/two'],
    );
  });

  test('groups by file (sorted by path), then by severity, expanded in order', () => {
    const result = view([
      cairn('b-normal', { filePath: 'b.ts' }),
      cairn('a-high', { filePath: 'a.ts', severity: 'high' }),
      cairn('a-critical', { filePath: 'a.ts', severity: 'critical' }),
    ]);
    assert.deepStrictEqual(
      result.files.map((f) => [f.filePath, f.severities.map((s) => s.severity)]),
      [
        ['a.ts', ['critical', 'high']],
        ['b.ts', ['normal']],
      ],
    );
  });

  test('keeps the same relative path under two roots as two file groups', () => {
    const result = view(
      [
        cairn('a', { rootPath: '/one', filePath: 'x.ts' }),
        cairn('b', { rootPath: '/two', filePath: 'x.ts' }),
      ],
      ['/one', '/two'],
    );
    assert.strictEqual(result.files.length, 2);
  });

  test('hides resolved cairns', () => {
    const result = view([
      cairn('done', { resolved: true, resolvedAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    assert.deepStrictEqual(result.files, []);
  });

  test('accepts a workspace folder with a trailing slash', () => {
    assert.strictEqual(view([cairn('a')], ['/repo/']).files.length, 1);
  });
});

suite('buildScopeView: file', () => {
  const ACTIVE = '/repo/src/a.ts';
  const view = (cairns: Cairn[], active = ACTIVE, folders = ['/repo']): FileScopeView =>
    buildScopeView(cairns, { workspaceFolders: folders, activeFile: active }) as FileScopeView;

  test('"This file" holds only the active file, by severity; "Repo" holds the workspace', () => {
    const result = view([
      cairn('here-high', { severity: 'high' }),
      cairn('here-normal'),
      cairn('other', { filePath: 'src/b.ts' }),
    ]);
    assert.strictEqual(result.kind, 'file');
    assert.deepStrictEqual(
      result.file.map((g) => [g.severity, ids(g.cairns)]),
      [
        ['high', ['here-high']],
        ['normal', ['here-normal']],
      ],
    );
    assert.deepStrictEqual(
      result.repo.map((f) => f.filePath),
      ['src/a.ts', 'src/b.ts'],
    );
  });

  test('a file with no cairns gets empty sections, not a fallback to the repo list', () => {
    const result = view([cairn('other', { filePath: 'src/b.ts' })]);
    assert.deepStrictEqual(result.file, []);
    assert.deepStrictEqual(result.resolved, []);
    assert.strictEqual(result.repo.length, 1);
  });

  test('puts resolved cairns of this file in Resolved, newest first, and out of the open list and Repo', () => {
    const result = view([
      cairn('open'),
      cairn('old', { resolved: true, resolvedAt: '2026-01-01T00:00:00.000Z' }),
      cairn('new', { resolved: true, resolvedAt: '2026-03-01T00:00:00.000Z' }),
    ]);
    assert.deepStrictEqual(ids(result.resolved), ['new', 'old']);
    assert.deepStrictEqual(
      result.file.flatMap((g) => ids(g.cairns)),
      ['open'],
    );
    assert.deepStrictEqual(
      result.repo.flatMap((f) => f.severities.flatMap((s) => ids(s.cairns))),
      ['open'],
    );
  });

  test('matches the file by rootPath + filePath, even across a subfolder root', () => {
    const result = view([cairn('sub', { rootPath: '/repo/src', filePath: 'a.ts' })]);
    assert.deepStrictEqual(
      result.file.flatMap((g) => ids(g.cairns)),
      ['sub'],
    );
  });

  test('tolerates a trailing slash in the stored rootPath', () => {
    const result = view([cairn('slash', { rootPath: '/repo/' })]);
    assert.strictEqual(result.file.length, 1);
  });

  test('an active file outside the workspace still shows its own cairns but not in Repo', () => {
    const result = view([cairn('loose', { rootPath: '/loose', filePath: 'f.ts' })], '/loose/f.ts');
    assert.deepStrictEqual(
      result.file.flatMap((g) => ids(g.cairns)),
      ['loose'],
    );
    assert.deepStrictEqual(result.repo, []);
  });
});
