import * as vscode from "vscode";
import * as path from "path";
import { ScarceItem, SeverityLevel } from "../types/index";
import { getItemsForRepo, removeItem } from "../storage/index";

export const VIEW_ID = "scarce-cairns";

export class CairnsViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private repoRoot?: string;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === "delete") {
        this.handleDelete(message.relPath, message.itemId);
      }
    });

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
    const workspaceFolders = vscode.workspace.workspaceFolders;
    this.repoRoot = workspaceFolders
      ? workspaceFolders[0].uri.fsPath
      : undefined;

    if (!this.view) {
      return;
    }

    if (!this.repoRoot) {
      this.view.webview.html = this.getHtml({}, undefined);
      return;
    }

    const itemsByFile = getItemsForRepo(this.repoRoot);
    this.view.webview.html = this.getHtml(itemsByFile, this.repoRoot);
  }

  private handleDelete(relPath: string, itemId: string): void {
    if (!this.repoRoot) {
      return;
    }
    const fullPath = path.join(this.repoRoot, relPath);
    removeItem(this.repoRoot, fullPath, itemId);
    this.refresh();
  }

  private getHtml(
    itemsByFile: Record<string, ScarceItem[]>,
    repoRoot: string | undefined,
  ): string {
    if (!repoRoot) {
      return this.wrapHtml(
        `<p class="empty">Open a workspace folder to see cairns.</p>`,
      );
    }

    const files = Object.keys(itemsByFile);

    if (files.length === 0) {
      return this.wrapHtml(
        `<p class="empty">No cairns yet. Select code and right-click → "Add to Scarce".</p>`,
      );
    }

    const fileSections = files
      .map((relPath) => this.renderFileSection(relPath, itemsByFile[relPath]))
      .join("\n");

    return this.wrapHtml(fileSections);
  }

  private renderFileSection(relPath: string, items: ScarceItem[]): string {
    const sorted = [...items].sort((a, b) => {
      const order: Record<SeverityLevel, number> = {
        critical: 0,
        high: 1,
        normal: 2,
      };
      return order[a.severity] - order[b.severity];
    });

    const itemsHtml = sorted
      .map((item) => this.renderItem(relPath, item))
      .join("\n");

    return `
      <div class="file-group">
        <div class="file-header">${this.escapeHtml(relPath)}</div>
        ${itemsHtml}
      </div>
    `;
  }

  private renderItem(relPath: string, item: ScarceItem): string {
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
      <div class="cairn" data-severity="${item.severity}">
        <div class="cairn-top">
          <span class="badge badge-${item.severity}">${item.severity}</span>
          <span class="line">${lineLabel}</span>
          <button class="delete-btn" onclick="deleteCairn('${relPath}', '${item.id}')" title="Delete">✕</button>
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

  private wrapHtml(bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    padding: 8px;
    margin: 0;
  }
  .empty {
    opacity: 0.7;
    padding: 16px 4px;
    text-align: center;
  }
  .file-group {
    margin-bottom: 16px;
  }
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
  .cairn-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .badge-critical {
    background-color: var(--vscode-errorForeground);
    color: white;
  }
  .badge-high {
    background-color: var(--vscode-editorWarning-foreground);
    color: black;
  }
  .badge-normal {
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .line {
    font-size: 11px;
    opacity: 0.7;
  }
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
  .delete-btn:hover {
    opacity: 1;
  }
  .comment {
    font-size: 12px;
    margin-bottom: 4px;
  }
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
  ${bodyContent}
  <script>
    const vscode = acquireVsCodeApi();
    function deleteCairn(relPath, itemId) {
      vscode.postMessage({ type: "delete", relPath, itemId });
    }
  </script>
</body>
</html>`;
  }
}