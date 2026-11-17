/**
 * @packageDocumentation
 * Serializable view types describing which Cairns the sidebar shows and how
 * they are grouped, depending on the workspace scope. Built by the extension
 * and consumed by the webview.
 */

import type { Cairn, CairnSeverity } from './cairn';

/**
 * Which of the three sidebar views applies.
 *
 * - `global`: no workspace is open.
 * - `repo`: a workspace is open but no file editor is active.
 * - `file`: a workspace is open and a `file:` editor is active.
 */
export type ScopeKind = 'global' | 'repo' | 'file';

/** Cairns of one severity, ordered for display. Never empty. */
export interface SeverityGroup {
  severity: CairnSeverity;
  cairns: Cairn[];
}

/** Open Cairns of one file, split by severity. */
export interface FileGroup {
  /** Absolute path of the file (`rootPath` joined with `filePath`). Unique key. */
  absolutePath: string;
  /** Root the file path is relative to; shown to tell apart equal relative paths. */
  rootPath: string;
  /** Path relative to `rootPath`, with forward slashes. Display label. */
  filePath: string;
  severities: SeverityGroup[];
}

/** Open Cairns of one repo (grouped by their stored `rootPath`), flat. */
export interface RepoGroup {
  /** Stored root path; the group key and the tooltip. */
  rootPath: string;
  /** Folder name of `rootPath`. */
  label: string;
  cairns: Cairn[];
}

/** No workspace open: every open Cairn, grouped by repo. */
export interface GlobalScopeView {
  kind: 'global';
  groups: RepoGroup[];
}

/** Workspace open, no file active: open Cairns inside the workspace, by file. */
export interface RepoScopeView {
  kind: 'repo';
  files: FileGroup[];
}

/** File active: the "This file" tab (with its Resolved section) and the "Repo" tab. */
export interface FileScopeView {
  kind: 'file';
  /** Open Cairns of the active file, by severity. */
  file: SeverityGroup[];
  /** Resolved Cairns of the active file, most recently resolved first. */
  resolved: Cairn[];
  /** Same content as {@link RepoScopeView.files}. */
  repo: FileGroup[];
}

/** What the sidebar shows for the current scope. */
export type ScopeView = GlobalScopeView | RepoScopeView | FileScopeView;
