import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { randomBytes } from "crypto";
import { ScarceItem, SeverityLevel } from "../types/index";
import {
  getAllRepos,
  getItemsForRepo,
  getSharedItemsForRepo,
  removeItem,
  removeSharedItem,
} from "../storage/index";
import { checkStaleness, StalenessMap } from "../staleness/index";
import { updateItemLines, updateSharedItemLines } from "../storage/index";

export type SortMode = "severity" | "newest" | "filepath";

function normalizePath(p: string): string {
  try {
    return fs
      .realpathSync(p)
      .replace(/[\\/]+$/, "")
      .toLowerCase();
  } catch {
    return path
      .normalize(p)
      .replace(/[\\/]+$/, "")
      .toLowerCase();
  }
}

function findStoredRootsUnder(folderPath: string): string[] {
  const normalizedFolder = normalizePath(folderPath);
  return getAllRepos().filter((storedRoot) => {
    return (
      storedRoot === normalizedFolder ||
      storedRoot.startsWith(normalizedFolder + path.sep) ||
      storedRoot.startsWith(normalizedFolder + "/")
    );
  });
}

export const VIEW_ID = "scarce-cairns";

interface RepoSection {
  repoRoot: string;
  repoName: string;
  itemsByFile: Record<string, ScarceItem[]>;
}

interface SidebarData {
  personal: RepoSection[];
  shared: RepoSection[];
  staleness: StalenessMap;
  sortMode: SortMode;
  activeTab: "personal" | "shared";
  searchQuery: string;
  isRepo: boolean;
}

export class CairnsViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private sortMode: SortMode = "severity";
  private activeTab: "personal" | "shared" = "personal";
  private searchQuery: string = "";
  private stalenessMap: StalenessMap = {};

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "delete":
          this.handleDelete(
            message.scope,
            message.repoRoot,
            message.relPath,
            message.itemId,
          );
          break;
        case "refresh":
          this.handleRefresh();
          break;
        case "setSortMode":
          this.sortMode = message.value as SortMode;
          this.pushData();
          break;
        case "setTab":
          this.activeTab = message.value as "personal" | "shared";
          this.pushData();
          break;
        case "setSearch":
          this.searchQuery = message.value as string;
          this.pushData();
          break;
      }
    });

    const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() =>
      this.refresh(),
    );
    webviewView.onDidDispose(() => workspaceListener.dispose());

    webviewView.webview.html = this.getShell();
    this.refresh();
  }

  public reveal(): void {
    if (this.view) {
      this.view.show(true);
    } else {
      void vscode.commands.executeCommand("workbench.view.extension.scarce");
    }
  }

  public updateStaleness(map: StalenessMap): void {
    Object.assign(this.stalenessMap, map);
    this.pushData();
  }

  public refresh(): void {
    if (!this.view) {
      return;
    }
    this.pushData();
  }

  private handleDelete(
    scope: string,
    repoRoot: string,
    relPath: string,
    itemId: string,
  ): void {
    const fullPath = path.join(repoRoot, relPath);
    if (scope === "shared") {
      removeSharedItem(repoRoot, fullPath, itemId);
    } else {
      removeItem(repoRoot, fullPath, itemId);
    }
    // remove from staleness map too
    delete this.stalenessMap[itemId];
    this.pushData();
  }

  private handleRefresh(): void {
    // re-run staleness on active editor file
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.uri.scheme === "file") {
      const repoRoot = this.resolveRoot(editor.document.uri);
      if (repoRoot) {
        const personal = getItemsForRepo(repoRoot);
        const shared = getSharedItemsForRepo(repoRoot);
        const allPersonal = Object.values(personal).flat();
        const allShared = Object.values(shared).flat();

        const personalResult = checkStaleness(
          allPersonal,
          (itemId, newStart, newEnd) => {
            const item = allPersonal.find((i) => i.id === itemId);
            if (item) {
              updateItemLines(
                repoRoot,
                item.filepath,
                itemId,
                newStart,
                newEnd,
              );
            }
          },
        );

        const sharedResult = checkStaleness(
          allShared,
          (itemId, newStart, newEnd) => {
            const item = allShared.find((i) => i.id === itemId);
            if (item) {
              updateSharedItemLines(
                repoRoot,
                item.filepath,
                itemId,
                newStart,
                newEnd,
              );
            }
          },
        );

        const allShifted = [...personalResult.shifted, ...sharedResult.shifted];
        if (allShifted.length > 0) {
          const fileNames = [
            ...new Set(allShifted.map((i) => path.basename(i.filepath))),
          ].join(", ");
          void vscode.window.showInformationMessage(
            `Scarce: updated ${allShifted.length} cairn position${allShifted.length > 1 ? "s" : ""} in ${fileNames}.`,
          );
        }

        Object.assign(this.stalenessMap, personalResult.map, sharedResult.map);
      }
    }
    this.pushData();
  }

  private resolveRoot(uri: vscode.Uri): string | null {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      return null;
    }
    const roots = findStoredRootsUnder(folder.uri.fsPath);
    return roots.length > 0 ? roots[0] : normalizePath(folder.uri.fsPath);
  }

  private collectSections(): {
    personal: RepoSection[];
    shared: RepoSection[];
    isRepo: boolean;
  } {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { personal: [], shared: [], isRepo: false };
    }

    const personalSections: RepoSection[] = [];
    const sharedSections: RepoSection[] = [];
    let isRepo = false;

    for (const folder of workspaceFolders) {
      const storedRoots = findStoredRootsUnder(folder.uri.fsPath);
      const roots =
        storedRoots.length === 0 ? [folder.uri.fsPath] : storedRoots;

      if (storedRoots.length > 0) {
        isRepo = true;
      }

      for (const root of roots) {
        const label =
          storedRoots.length > 1
            ? `${folder.name}/${path.relative(normalizePath(folder.uri.fsPath), root)}`
            : folder.name;

        const personalItems = getItemsForRepo(root);
        if (Object.keys(personalItems).length > 0) {
          personalSections.push({
            repoRoot: root,
            repoName: label,
            itemsByFile: personalItems,
          });
        }

        const sharedItems = getSharedItemsForRepo(root);
        if (Object.keys(sharedItems).length > 0) {
          sharedSections.push({
            repoRoot: root,
            repoName: label,
            itemsByFile: sharedItems,
          });
        }
      }
    }

    return { personal: personalSections, shared: sharedSections, isRepo };
  }

  private pushData(): void {
    if (!this.view) {
      return;
    }
    const { personal, shared, isRepo } = this.collectSections();
    const data: SidebarData = {
      personal,
      shared,
      staleness: this.stalenessMap,
      sortMode: this.sortMode,
      activeTab: this.activeTab,
      searchQuery: this.searchQuery,
      isRepo,
    };
    void this.view.webview.postMessage({ type: "data", ...data });
  }

  private getShell(): string {
    const nonce = randomBytes(16).toString("base64");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    padding: 0;
    margin: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
    position: sticky;
    top: 0;
    background: var(--vscode-sideBar-background);
    z-index: 10;
  }
  .search-input {
    flex: 1;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    outline: none;
  }
  .search-input:focus {
    border-color: var(--vscode-focusBorder);
  }
  .sort-select {
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 3px;
    padding: 3px 4px;
    font-size: 11px;
    font-family: var(--vscode-font-family);
    outline: none;
    cursor: pointer;
  }
  .icon-btn {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    opacity: 0.6;
    cursor: pointer;
    padding: 2px 4px;
    font-size: 14px;
    border-radius: 3px;
  }
  .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    position: sticky;
    top: 37px;
    z-index: 9;
  }
  .tab {
    flex: 1;
    padding: 6px 0;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: none;
    color: var(--vscode-foreground);
    opacity: 0.6;
    border-bottom: 2px solid transparent;
  }
  .tab.active { opacity: 1; border-bottom: 2px solid var(--vscode-focusBorder); }
  .tab-content { display: none; padding: 8px; }
  .tab-content.active { display: block; }
  .search-results { padding: 8px; }
  .search-scope-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    opacity: 0.5;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid currentColor;
    margin-left: 4px;
  }
  .empty { opacity: 0.7; padding: 16px 4px; text-align: center; font-size: 12px; }
  .repo-group { margin-bottom: 12px; }
  .repo-header { font-weight: 700; font-size: 13px; padding: 6px 0; margin-bottom: 4px; }
  .file-group { margin-bottom: 16px; }
  .file-header {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.8;
    padding: 4px 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 6px;
    word-break: break-all;
  }
  .cairn {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 6px;
  }
  .cairn-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
  .badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .badge-critical { background-color: var(--vscode-errorForeground); color: white; }
  .badge-high { background-color: var(--vscode-editorWarning-foreground); color: black; }
  .badge-normal { background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .badge-stale-changed {
    background: transparent;
    color: var(--vscode-editorWarning-foreground);
    border: 1px solid var(--vscode-editorWarning-foreground);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .badge-stale-missing {
    background: transparent;
    color: var(--vscode-errorForeground);
    border: 1px solid var(--vscode-errorForeground);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .line { font-size: 11px; opacity: 0.7; }
  .delete-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--vscode-foreground);
    opacity: 0.5;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
  }
  .delete-btn:hover { opacity: 1; }
  .comment-block {
    border-left: 3px solid var(--vscode-editorLineNumber-foreground);
    background: rgba(128,128,128,0.08);
    padding: 5px 8px;
    border-radius: 0 3px 3px 0;
    font-size: 12px;
    margin-bottom: 6px;
  }
  .expand-btn {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    opacity: 0.5;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 0;
    display: block;
    width: 100%;
    text-align: left;
  }
  .expand-btn:hover { opacity: 1; }
  .snapshot {
    background-color: var(--vscode-textCodeBlock-background);
    padding: 6px;
    border-radius: 3px;
    font-size: 11px;
    overflow-x: auto;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
</head>
<body>
  <div class="toolbar">
    <input class="search-input" id="search" type="text" placeholder="Search cairns…" />
    <select class="sort-select" id="sort">
      <option value="severity">Severity</option>
      <option value="newest">Newest</option>
      <option value="filepath">File path</option>
    </select>
    <button class="icon-btn" id="refresh-btn" title="Refresh">↺</button>
  </div>
  <div class="tabs" id="tabs">
    <button class="tab active" data-tab="personal">Personal</button>
    <button class="tab" data-tab="shared">Shared</button>
  </div>
  <div id="personal" class="tab-content active"></div>
  <div id="shared" class="tab-content"></div>
  <div id="search-results" class="search-results" style="display:none"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const expandedIds = new Set();
    let currentData = null;

    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');
    const refreshBtn = document.getElementById('refresh-btn');

    searchInput.addEventListener('input', () => {
      vscode.postMessage({ type: 'setSearch', value: searchInput.value });
    });

    sortSelect.addEventListener('change', () => {
      vscode.postMessage({ type: 'setSortMode', value: sortSelect.value });
    });

    refreshBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        vscode.postMessage({ type: 'setTab', value: tab.dataset.tab });
      });
    });

    document.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const cairn = deleteBtn.closest('.cairn');
        if (!cairn) return;
        vscode.postMessage({
          type: 'delete',
          scope: cairn.dataset.scope,
          repoRoot: cairn.dataset.reporoot,
          relPath: cairn.dataset.relpath,
          itemId: cairn.dataset.itemid,
        });
        return;
      }

      const expandBtn = e.target.closest('[data-action="expand"]');
      if (expandBtn) {
        const cairn = expandBtn.closest('.cairn');
        if (!cairn) return;
        const id = cairn.dataset.itemid;
        if (expandedIds.has(id)) {
          expandedIds.delete(id);
        } else {
          expandedIds.add(id);
        }
        if (currentData) render(currentData);
        return;
      }
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type !== 'data') return;
      currentData = msg;

      // sync toolbar state
      sortSelect.value = msg.sortMode;
      if (searchInput.value !== msg.searchQuery) {
        searchInput.value = msg.searchQuery;
      }

      render(msg);
    });

    function render(data) {
      const tabsEl = document.getElementById('tabs');
      const personalEl = document.getElementById('personal');
      const sharedEl = document.getElementById('shared');
      const searchEl = document.getElementById('search-results');

      tabsEl.style.display = data.isRepo ? 'flex' : 'none';

      if (data.searchQuery.trim().length > 0) {
        tabsEl.style.display = 'none';
        personalEl.style.display = 'none';
        sharedEl.style.display = 'none';
        searchEl.style.display = 'block';
        searchEl.innerHTML = renderSearchResults(data);
        return;
      }

      searchEl.style.display = 'none';
      personalEl.style.display = 'block';
      sharedEl.style.display = 'block';

      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.tab === data.activeTab);
      });
      document.querySelectorAll('.tab-content').forEach((c) => {
        c.classList.toggle('active', c.id === data.activeTab);
      });

      personalEl.innerHTML = renderSections(data.personal, 'personal', data);
      sharedEl.innerHTML = renderSections(data.shared, 'shared', data);
    }

    const SEV_ORDER = { critical: 0, high: 1, normal: 2 };

    function sortItems(items, mode) {
      const copy = [...items];
      if (mode === 'newest') {
        copy.sort((a, b) => b.timestamp - a.timestamp);
      } else {
        copy.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
      }
      return copy;
    }

    function fileGroupSeverityScore(items) {
      const best = items.reduce((acc, i) => Math.min(acc, SEV_ORDER[i.severity]), 99);
      return best;
    }

    function sortSections(sections, mode) {
      return sections.map((section) => {
        const sortedByFile = {};
        const fileKeys = Object.keys(section.itemsByFile);

        if (mode === 'filepath') {
          fileKeys.sort();
        } else if (mode === 'newest') {
          fileKeys.sort((a, b) => {
            const aNewest = Math.max(...section.itemsByFile[a].map((i) => i.timestamp));
            const bNewest = Math.max(...section.itemsByFile[b].map((i) => i.timestamp));
            return bNewest - aNewest;
          });
        } else {
          fileKeys.sort((a, b) => {
            return (
              fileGroupSeverityScore(section.itemsByFile[a]) -
              fileGroupSeverityScore(section.itemsByFile[b])
            );
          });
        }

        for (const key of fileKeys) {
          sortedByFile[key] = sortItems(section.itemsByFile[key], mode);
        }

        return { ...section, itemsByFile: sortedByFile };
      });
    }

    function renderSections(sections, scope, data) {
      if (!sections || sections.length === 0) {
        return '<p class="empty">No cairns here yet.</p>';
      }

      const sorted = sortSections(sections, data.sortMode);
      const nonEmpty = sorted.filter((s) => Object.keys(s.itemsByFile).length > 0);
      if (nonEmpty.length === 0) {
        return '<p class="empty">No cairns here yet.</p>';
      }

      const showRepoHeaders = nonEmpty.length > 1;
      return nonEmpty.map((s) => renderRepoSection(s, scope, showRepoHeaders, data)).join('');
    }

    function renderRepoSection(section, scope, showHeader, data) {
      const files = Object.keys(section.itemsByFile);
      const fileSections = files
        .map((relPath) =>
          renderFileSection(scope, section.repoRoot, relPath, section.itemsByFile[relPath], data),
        )
        .join('');

      if (!showHeader) return fileSections;

      return \`<div class="repo-group">
        <div class="repo-header">\${esc(section.repoName)}</div>
        \${fileSections}
      </div>\`;
    }

    function renderFileSection(scope, repoRoot, relPath, items, data) {
      const itemsHtml = items
        .map((item) => renderItem(scope, repoRoot, relPath, item, data))
        .join('');

      return \`<div class="file-group">
        <div class="file-header">\${esc(relPath)}</div>
        \${itemsHtml}
      </div>\`;
    }

    function renderItem(scope, repoRoot, relPath, item, data) {
      const lineLabel = item.startLine === item.endLine
        ? \`L\${item.startLine}\`
        : \`L\${item.startLine}-\${item.endLine}\`;

      const stale = data.staleness[item.id];
      let staleBadge = '';
      if (stale === 'changed') {
        staleBadge = '<span class="badge-stale-changed">⚠ Content changed</span>';
      } else if (stale === 'missing') {
        staleBadge = '<span class="badge-stale-missing">❌ File missing</span>';
      }

      const commentHtml = item.comment
        ? \`<div class="comment-block">\${esc(item.comment)}</div>\`
        : '';

      const isExpanded = expandedIds.has(item.id);
      const preview = item.codeSnapshot.length > 120 && !isExpanded
        ? item.codeSnapshot.slice(0, 120) + '…'
        : item.codeSnapshot;

      const expandBtn = item.codeSnapshot.length > 120
        ? \`<button class="expand-btn" data-action="expand">
            \${isExpanded ? '▲ Collapse' : '▼ Expand'}
          </button>\`
        : '';

      return \`<div class="cairn"
          data-severity="\${item.severity}"
          data-scope="\${scope}"
          data-reporoot="\${esc(repoRoot)}"
          data-relpath="\${esc(relPath)}"
          data-itemid="\${esc(item.id)}">
        <div class="cairn-top">
          <span class="badge badge-\${item.severity}">\${item.severity}</span>
          <span class="line">\${lineLabel}</span>
          \${staleBadge}
          <button class="delete-btn" data-action="delete" title="Delete">✕</button>
        </div>
        \${commentHtml}
        <pre class="snapshot">\${esc(preview)}</pre>
        \${expandBtn}
      </div>\`;
    }

    function renderSearchResults(data) {
      const query = data.searchQuery.trim().toLowerCase();
      const results = [];

      for (const section of (data.personal || [])) {
        for (const [relPath, items] of Object.entries(section.itemsByFile)) {
          for (const item of items) {
            if (matchesQuery(item, relPath, query)) {
              results.push({ item, relPath, repoRoot: section.repoRoot, scope: 'personal' });
            }
          }
        }
      }

      for (const section of (data.shared || [])) {
        for (const [relPath, items] of Object.entries(section.itemsByFile)) {
          for (const item of items) {
            if (matchesQuery(item, relPath, query)) {
              results.push({ item, relPath, repoRoot: section.repoRoot, scope: 'shared' });
            }
          }
        }
      }

      if (results.length === 0) {
        return '<p class="empty">No cairns match your search.</p>';
      }

      return results.map(({ item, relPath, repoRoot, scope }) => {
        const lineLabel = item.startLine === item.endLine
          ? \`L\${item.startLine}\`
          : \`L\${item.startLine}-\${item.endLine}\`;

        const stale = data.staleness[item.id];
        let staleBadge = '';
        if (stale === 'changed') {
          staleBadge = '<span class="badge-stale-changed">⚠ Content changed</span>';
        } else if (stale === 'missing') {
          staleBadge = '<span class="badge-stale-missing">❌ File missing</span>';
        }

        const commentHtml = item.comment
          ? \`<div class="comment-block">\${esc(item.comment)}</div>\`
          : '';

        const isExpanded = expandedIds.has(item.id);
        const preview = item.codeSnapshot.length > 120 && !isExpanded
          ? item.codeSnapshot.slice(0, 120) + '…'
          : item.codeSnapshot;

        const expandBtn = item.codeSnapshot.length > 120
          ? \`<button class="expand-btn" data-action="expand">
              \${isExpanded ? '▲ Collapse' : '▼ Expand'}
            </button>\`
          : '';

        const scopeLabel = \`<span class="search-scope-label">\${scope}</span>\`;

        return \`<div class="cairn"
            data-severity="\${item.severity}"
            data-scope="\${scope}"
            data-reporoot="\${esc(repoRoot)}"
            data-relpath="\${esc(relPath)}"
            data-itemid="\${esc(item.id)}">
          <div class="cairn-top">
            <span class="badge badge-\${item.severity}">\${item.severity}</span>
            <span class="line">\${lineLabel}</span>
            \${scopeLabel}
            \${staleBadge}
            <button class="delete-btn" data-action="delete" title="Delete">✕</button>
          </div>
          <div style="font-size:11px;opacity:0.6;margin-bottom:4px;">\${esc(relPath)}</div>
          \${commentHtml}
          <pre class="snapshot">\${esc(preview)}</pre>
          \${expandBtn}
        </div>\`;
      }).join('');
    }

    function matchesQuery(item, relPath, query) {
      return (
        item.comment.toLowerCase().includes(query) ||
        item.codeSnapshot.toLowerCase().includes(query) ||
        relPath.toLowerCase().includes(query)
      );
    }

    function esc(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  </script>
</body>
</html>`;
  }
}
