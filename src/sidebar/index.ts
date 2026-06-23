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

export class CairnsViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === "delete") {
        this.handleDelete(
          message.scope,
          message.repoRoot,
          message.relPath,
          message.itemId,
        );
      }
    });

    const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() =>
      this.refresh(),
    );

    webviewView.onDidDispose(() => workspaceListener.dispose());

    this.refresh();
  }

  public reveal(): void {
    if (this.view) {
      this.view.show(true);
    } else {
      void vscode.commands.executeCommand("workbench.view.extension.scarce");
    }
  }

  public refresh(): void {
    if (!this.view) {
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      this.view.webview.html = this.getHtml([], []);
      return;
    }

    const personalSections: RepoSection[] = [];
    const sharedSections: RepoSection[] = [];

    for (const folder of workspaceFolders) {
      const storedRoots = findStoredRootsUnder(folder.uri.fsPath);

      const roots =
        storedRoots.length === 0 ? [folder.uri.fsPath] : storedRoots;

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

    this.view.webview.html = this.getHtml(personalSections, sharedSections);
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
    this.refresh();
  }

  private getHtml(
    personalSections: RepoSection[],
    sharedSections: RepoSection[],
  ): string {
    const personalHtml = this.renderSections(
      personalSections,
      "personal",
      "No personal cairns yet.",
    );
    const sharedHtml = this.renderSections(
      sharedSections,
      "shared",
      "No shared cairns yet.",
    );
    return this.wrapHtml(personalHtml, sharedHtml);
  }

  private renderSections(
    sections: RepoSection[],
    scope: string,
    emptyMsg: string,
  ): string {
    const nonEmpty = sections.filter(
      (s) => Object.keys(s.itemsByFile).length > 0,
    );
    if (nonEmpty.length === 0) {
      return `<p class="empty">${emptyMsg}</p>`;
    }

    const showRepoHeaders = nonEmpty.length > 1;
    return nonEmpty
      .map((s) => this.renderRepoSection(s, scope, showRepoHeaders))
      .join("\n");
  }

  private renderRepoSection(
    section: RepoSection,
    scope: string,
    showHeader: boolean,
  ): string {
    const files = Object.keys(section.itemsByFile);
    const fileSections = files
      .map((relPath) =>
        this.renderFileSection(
          scope,
          section.repoRoot,
          relPath,
          section.itemsByFile[relPath],
        ),
      )
      .join("\n");

    if (!showHeader) {
      return fileSections;
    }

    return `
      <div class="repo-group">
        <div class="repo-header">${this.escapeHtml(section.repoName)}</div>
        ${fileSections}
      </div>
    `;
  }

  private renderFileSection(
    scope: string,
    repoRoot: string,
    relPath: string,
    items: ScarceItem[],
  ): string {
    const sorted = [...items].sort((a, b) => {
      const order: Record<SeverityLevel, number> = {
        critical: 0,
        high: 1,
        normal: 2,
      };
      return order[a.severity] - order[b.severity];
    });

    const itemsHtml = sorted
      .map((item) => this.renderItem(scope, repoRoot, relPath, item))
      .join("\n");

    return `
      <div class="file-group">
        <div class="file-header">${this.escapeHtml(relPath)}</div>
        ${itemsHtml}
      </div>
    `;
  }

  private renderItem(
    scope: string,
    repoRoot: string,
    relPath: string,
    item: ScarceItem,
  ): string {
    const lineLabel =
      item.startLine === item.endLine
        ? `L${item.startLine}`
        : `L${item.startLine}-${item.endLine}`;

    const snapshotPreview = this.escapeHtml(
      item.codeSnapshot.length > 120
        ? item.codeSnapshot.slice(0, 120) + "…"
        : item.codeSnapshot,
    );

    const commentHtml = item.comment
      ? `<div class="comment">${this.escapeHtml(item.comment)}</div>`
      : "";

    return `
      <div class="cairn" data-severity="${item.severity}" data-scope="${scope}" data-reporoot="${this.escapeHtml(repoRoot)}" data-relpath="${this.escapeHtml(relPath)}" data-itemid="${this.escapeHtml(item.id)}">
        <div class="cairn-top">
          <span class="badge badge-${item.severity}">${item.severity}</span>
          <span class="line">${lineLabel}</span>
          <button class="delete-btn" data-action="delete" title="Delete">✕</button>
        </div>
        ${commentHtml}
        <pre class="snapshot">${snapshotPreview}</pre>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private wrapHtml(personalHtml: string, sharedHtml: string): string {
    const nonce = randomBytes(16).toString("base64");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    padding: 0;
    margin: 0;
  }
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--vscode-panel-border);
    position: sticky;
    top: 0;
    background: var(--vscode-sideBar-background);
    z-index: 1;
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
  .tab.active {
    opacity: 1;
    border-bottom: 2px solid var(--vscode-focusBorder);
  }
  .tab-content {
    display: none;
    padding: 8px;
  }
  .tab-content.active {
    display: block;
  }
  .empty {
    opacity: 0.7;
    padding: 16px 4px;
    text-align: center;
  }
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
  .cairn-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
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
  .comment { font-size: 12px; margin-bottom: 4px; }
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
  <div class="tabs">
    <button class="tab active" data-tab="personal">Personal</button>
    <button class="tab" data-tab="shared">Shared</button>
  </div>
  <div id="personal" class="tab-content active">
    ${personalHtml}
  </div>
  <div id="shared" class="tab-content">
    ${sharedHtml}
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
      });
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest('[data-action="delete"]');
      if (!button) return;
      const cairn = button.closest(".cairn");
      if (!cairn) return;
      vscode.postMessage({
        type: "delete",
        scope: cairn.dataset.scope,
        repoRoot: cairn.dataset.reporoot,
        relPath: cairn.dataset.relpath,
        itemId: cairn.dataset.itemid,
      });
    });
  </script>
</body>
</html>`;
  }
}
