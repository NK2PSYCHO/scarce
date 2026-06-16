import * as vscode from "vscode";
import { ScarceItem } from "../types/index";

export function notifyForItems(items: ScarceItem[], reveal: () => void): void {
  if (items.length === 0) {
    return;
  }

  const critical = items.filter((i) => i.severity === "critical");
  const high = items.filter((i) => i.severity === "high");
  const normal = items.filter((i) => i.severity === "normal");

  const summary = buildSummary(critical.length, high.length, normal.length);

  if (critical.length > 0) {
    void showCriticalModal(summary, reveal);
    return;
  }

  if (high.length > 0) {
    void showHighToast(summary, reveal);
    return;
  }

  showNormalStatusBar(summary);
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
  reveal: () => void,
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Scarce: ${summary} cairns present — review before continuing.`,
    { modal: true },
    "Open Cairns",
  );

  if (choice === "Open Cairns") {
    reveal();
  }
}

async function showHighToast(
  summary: string,
  reveal: () => void,
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Scarce: ${summary} cairns present in this file.`,
    "Open Cairns",
  );

  if (choice === "Open Cairns") {
    reveal();
  }
}

function showNormalStatusBar(summary: string): void {
  vscode.window.setStatusBarMessage(
    `$(info) Scarce: ${summary} cairns present in this file`,
    5000,
  );
}
