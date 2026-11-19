/**
 * @packageDocumentation
 * Pure functions that decide the sidebar scope and group Cairns for display.
 * No VS Code APIs: the caller passes the workspace folders and active file in.
 */

import * as path from 'path';
import type { Cairn, CairnSeverity } from '../models/cairn';
import type { FileGroup, RepoGroup, ScopeKind, ScopeView, SeverityGroup } from '../models/scope';

/**
 * What the extension knows about the window.
 */
export interface ScopeInput {
  /** Absolute paths of the open workspace folders (empty when none is open). */
  workspaceFolders: readonly string[];
  /** Absolute path of the active editor's file, or `undefined` if it is not a `file:` editor. */
  activeFile: string | undefined;
}

const SEVERITY_ORDER: readonly CairnSeverity[] = ['critical', 'high', 'normal'];

/**
 * Normalizes a path for equality checks (case-insensitive on Windows).
 *
 * @param p - Any path.
 * @returns The resolved path, lowercased on Windows.
 */
function normalize(p: string): string {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/**
 * Compares two strings by code unit, so ordering does not depend on locale.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns Negative, zero or positive, like `Array.prototype.sort` expects.
 */
function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

/**
 * Absolute path of the file a Cairn points at.
 *
 * @param cairn - The Cairn.
 * @returns `rootPath` joined with `filePath`, normalized.
 */
export function absolutePathOf(cairn: Cairn): string {
  return path.join(cairn.rootPath, cairn.filePath);
}

/**
 * Whether a file lies strictly inside a folder.
 *
 * @param folder - Absolute folder path.
 * @param file - Absolute file path.
 * @returns `true` if `file` is inside `folder` (not the folder itself).
 */
function isInside(folder: string, file: string): boolean {
  const relative = path.relative(normalize(folder), normalize(file));
  const escapes = relative === '..' || relative.startsWith(`..${path.sep}`);
  return relative !== '' && !escapes && !path.isAbsolute(relative);
}

/**
 * Whether a file lies strictly inside at least one of the folders.
 *
 * @param file - Absolute file path.
 * @param folders - Absolute folder paths.
 * @returns `true` if any folder contains the file.
 */
export function isInsideAnyFolder(file: string, folders: readonly string[]): boolean {
  return folders.some((folder) => isInside(folder, file));
}

/**
 * Display order: severity (critical, high, normal), then file path, then start
 * line, then end line. Ties keep their original order (stable sort).
 *
 * @param a - First Cairn.
 * @param b - Second Cairn.
 * @returns Sort comparison result.
 */
export function compareCairns(a: Cairn, b: Cairn): number {
  return (
    SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
    compareStrings(absolutePathOf(a), absolutePathOf(b)) ||
    a.lineRange[0] - b.lineRange[0] ||
    a.lineRange[1] - b.lineRange[1]
  );
}

/**
 * Decides which view applies.
 *
 * @param input - Workspace folders and active file.
 * @returns `global` with no workspace, `repo` with a workspace but no active
 *   file, otherwise `file`.
 */
export function selectScope(input: ScopeInput): ScopeKind {
  if (input.workspaceFolders.length === 0) {
    return 'global';
  }
  return input.activeFile === undefined ? 'repo' : 'file';
}

/**
 * Groups Cairns by severity in the order critical, high, normal. Empty
 * severities are omitted and each group is sorted with {@link compareCairns}.
 *
 * @param cairns - Cairns to group.
 * @returns Non-empty severity groups.
 */
export function groupBySeverity(cairns: readonly Cairn[]): SeverityGroup[] {
  const groups: SeverityGroup[] = [];
  for (const severity of SEVERITY_ORDER) {
    const matching = cairns.filter((c) => c.severity === severity).sort(compareCairns);
    if (matching.length > 0) {
      groups.push({ severity, cairns: matching });
    }
  }
  return groups;
}

/**
 * Groups Cairns by absolute file path, files sorted by path, each split by severity.
 *
 * @param cairns - Cairns to group.
 * @returns One group per file.
 */
export function groupByFile(cairns: readonly Cairn[]): FileGroup[] {
  const byPath = new Map<string, Cairn[]>();
  for (const cairn of cairns) {
    const key = absolutePathOf(cairn);
    byPath.set(key, [...(byPath.get(key) ?? []), cairn]);
  }
  const groups: FileGroup[] = [];
  for (const [absolutePath, members] of byPath) {
    const [first] = members;
    if (first) {
      groups.push({
        absolutePath,
        rootPath: first.rootPath,
        filePath: first.filePath,
        severities: groupBySeverity(members),
      });
    }
  }
  return groups.sort((a, b) => compareStrings(a.absolutePath, b.absolutePath));
}

/**
 * Groups Cairns by their stored `rootPath`. Groups are sorted by folder name
 * (then path); each group is a flat list sorted with {@link compareCairns}.
 *
 * @param cairns - Cairns to group.
 * @returns One group per root path.
 */
export function groupByRepo(cairns: readonly Cairn[]): RepoGroup[] {
  const byRoot = new Map<string, Cairn[]>();
  for (const cairn of cairns) {
    byRoot.set(cairn.rootPath, [...(byRoot.get(cairn.rootPath) ?? []), cairn]);
  }
  const groups: RepoGroup[] = [];
  for (const [rootPath, members] of byRoot) {
    groups.push({
      rootPath,
      label: path.basename(rootPath) || rootPath,
      cairns: [...members].sort(compareCairns),
    });
  }
  return groups.sort(
    (a, b) => compareStrings(a.label, b.label) || compareStrings(a.rootPath, b.rootPath),
  );
}

/**
 * Builds the view for the current scope. Resolved Cairns only ever appear in
 * the `file` view's Resolved section; the repo and global views never show them.
 *
 * @param cairns - Every stored Cairn.
 * @param input - Workspace folders and active file.
 * @returns The grouped view for the selected scope.
 */
export function buildScopeView(cairns: readonly Cairn[], input: ScopeInput): ScopeView {
  const open = cairns.filter((c) => c.resolved !== true);
  const kind = selectScope(input);

  if (kind === 'global') {
    return { kind, groups: groupByRepo(open) };
  }

  const inWorkspace = open.filter((c) =>
    input.workspaceFolders.some((folder) => isInside(folder, absolutePathOf(c))),
  );
  const repo = groupByFile(inWorkspace);
  if (kind === 'repo' || input.activeFile === undefined) {
    return { kind: 'repo', files: repo };
  }

  const active = normalize(input.activeFile);
  const ofFile = cairns.filter((c) => normalize(absolutePathOf(c)) === active);
  const resolved = ofFile
    .filter((c) => c.resolved === true)
    .sort((a, b) => compareStrings(b.resolvedAt ?? '', a.resolvedAt ?? '') || compareCairns(a, b));
  return {
    kind,
    file: groupBySeverity(ofFile.filter((c) => c.resolved !== true)),
    resolved,
    repo,
  };
}

/**
 * Decides which file counts as "open" for scoping. Only a plain `file:` text
 * editor counts; untitled buffers, output channels, diffs and non-text editors
 * (Settings, Welcome, images) do not.
 *
 * @param editor - Scheme and file-system path of the active text editor, or `undefined` if there is none.
 * @param activeTabIsDiff - Whether the active tab is a diff editor.
 * @returns The absolute path of the active file, or `undefined` for "no file open".
 */
export function activeFileOf(
  editor: { scheme: string; fsPath: string } | undefined,
  activeTabIsDiff: boolean,
): string | undefined {
  if (editor === undefined || activeTabIsDiff || editor.scheme !== 'file') {
    return undefined;
  }
  return editor.fsPath;
}
