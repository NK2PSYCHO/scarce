import * as vscode from "vscode";
import { ScarceItem } from "../types/index";

export interface NotifyScope {
  fileCount?: number;
}

export function notifyForItems(
  items: ScarceItem[],
  reveal: () => void,
  scope: NotifyScope = {},
): void {
  if (items.length === 0) {
    return;
  }

  const critical = items.filter((i) => i.severity === "critical");
  const high = items.filter((i) => i.severity === "high");
  const normal = items.filter((i) => i.severity === "normal");

  const summary = buildSummary(critical.length, high.length, normal.length);
  const location = buildLocation(scope.fileCount ?? 1);

  if (critical.length > 0) {
    void showCriticalModal(summary, location, reveal);
    return;
  }

  if (high.length > 0) {
    void showHighToast(summary, location, reveal);
    return;
  }

  showNormalStatusBar(summary, location);
}

function buildLocation(fileCount: number): string {
  return fileCount > 1 ? `across ${fileCount} open files` : "in this file";
}

function buildSummary(critical: number, high: number, normal: number): string {
  const parts: string[] = [];
  if (critical > 0) {
    parts.push(`${critical} critical`);
  }
  if (high > 0) {
    parts.push(`${high} high`);
  }
  if (normal > 0) {
    parts.push(`${normal} normal`);
  }
  return parts.join(", ");
}

async function showCriticalModal(
  summary: string,
  location: string,
  reveal: () => void,
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Scarce: ${summary} cairns present ${location}, review before continuing.`,
    { modal: true },
    "Open Cairns",
  );

  if (choice === "Open Cairns") {
    reveal();
  }
}

async function showHighToast(
  summary: string,
  location: string,
  reveal: () => void,
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Scarce: ${summary} cairns present ${location}.`,
    "Open Cairns",
  );

  if (choice === "Open Cairns") {
    reveal();
  }
}

function showNormalStatusBar(summary: string, location: string): void {
  vscode.window.setStatusBarMessage(
    `$(info) Scarce: ${summary} cairns present ${location}`,
    5000,
  );
}
