import * as vscode from "vscode";
import * as path from "path";
import { ScarceItem } from "../types/index";

export interface NotifyScope {
  filePaths?: string[];
}

export interface CairnCounts {
  personal: ScarceItem[];
  shared: ScarceItem[];
}

export function notifyForItems(
  counts: CairnCounts,
  reveal: () => void,
  scope: NotifyScope = {},
): void {
  const items = [...counts.personal, ...counts.shared];
  if (items.length === 0) {
    return;
  }

  const critical = items.filter((i) => i.severity === "critical");
  const high = items.filter((i) => i.severity === "high");
  const normal = items.filter((i) => i.severity === "normal");

  const summary = buildSummary(critical.length, high.length, normal.length);
  const breakdown = buildBreakdown(counts);
  const location = buildLocation(scope.filePaths ?? []);

  if (critical.length > 0) {
    void showCriticalModal(summary, breakdown, location, reveal);
    return;
  }

  if (high.length > 0) {
    void showHighToast(summary, breakdown, location, reveal);
    return;
  }

  showNormalStatusBar(summary, location);
}

function buildBreakdown(counts: CairnCounts): string {
  const parts: string[] = [];
  if (counts.personal.length > 0) {
    parts.push(`${counts.personal.length} personal`);
  }
  if (counts.shared.length > 0) {
    parts.push(`${counts.shared.length} shared`);
  }
  return parts.join(", ");
}

function buildLocation(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return "in this file";
  }
  if (filePaths.length === 1) {
    return `in ${parentSlashFilename(filePaths[0])}`;
  }
  return `across ${filePaths.length} open files`;
}

function parentSlashFilename(filePath: string): string {
  const filename = path.basename(filePath);
  const parent = path.basename(path.dirname(filePath));
  return parent ? `${parent}/${filename}` : filename;
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
  breakdown: string,
  location: string,
  reveal: () => void,
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Scarce: ${summary} cairns ${location} (${breakdown}), review before continuing.`,
    { modal: true },
    "Open Cairns",
  );
  if (choice === "Open Cairns") {
    reveal();
  }
}

async function showHighToast(
  summary: string,
  breakdown: string,
  location: string,
  reveal: () => void,
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Scarce: ${summary} cairns ${location} (${breakdown}).`,
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
