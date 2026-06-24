import * as fs from "fs";
import { ScarceItem } from "../types/index";

export type StaleState = "fresh" | "changed" | "missing";

export type StalenessMap = Record<string, StaleState>;

interface StalenessResult {
  map: StalenessMap;
  shifted: ScarceItem[];
}

function normalize(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function extractLines(
  content: string,
  startLine: number,
  endLine: number,
): string {
  const lines = content.split("\n");
  return lines.slice(startLine - 1, endLine).join("\n");
}

function searchSnippet(
  content: string,
  normalizedSnippet: string,
): number | null {
  const lines = content.split("\n");
  const snippetLines = normalizedSnippet.split("\n");
  const snippetLen = snippetLines.length;

  for (let i = 0; i <= lines.length - snippetLen; i++) {
    const candidate = lines
      .slice(i, i + snippetLen)
      .map((l) => l.trim())
      .join("\n");
    if (candidate === normalizedSnippet) {
      return i + 1;
    }
  }

  return null;
}

export function checkStaleness(
  items: ScarceItem[],
  updateItem: (itemId: string, newStart: number, newEnd: number) => void,
): StalenessResult {
  const map: StalenessMap = {};
  const shifted: ScarceItem[] = [];

  const byFile = new Map<string, ScarceItem[]>();
  for (const item of items) {
    const existing = byFile.get(item.filepath) ?? [];
    existing.push(item);
    byFile.set(item.filepath, existing);
  }

  for (const [filepath, fileItems] of byFile) {
    if (!fs.existsSync(filepath)) {
      for (const item of fileItems) {
        map[item.id] = "missing";
      }
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(filepath, "utf-8");
    } catch {
      for (const item of fileItems) {
        map[item.id] = "missing";
      }
      continue;
    }

    for (const item of fileItems) {
      const stored = normalize(item.codeSnapshot);
      const atLines = normalize(
        extractLines(content, item.startLine, item.endLine),
      );

      if (atLines === stored) {
        map[item.id] = "fresh";
        continue;
      }

      const foundAt = searchSnippet(content, stored);
      if (foundAt !== null) {
        const newStart = foundAt;
        const newEnd = foundAt + (item.endLine - item.startLine);
        updateItem(item.id, newStart, newEnd);
        map[item.id] = "fresh";
        shifted.push({ ...item, startLine: newStart, endLine: newEnd });
      } else {
        map[item.id] = "changed";
      }
    }
  }

  return { map, shifted };
}
