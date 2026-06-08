export type SeverityLevel = "normal" | "high" | "critical";

export interface ScarceItem {
  id: string;
  text: string;
  filepath: string;
  startLine: number;
  endLine: number;
  comment: string;
  severity: SeverityLevel;
  timestamp: number;
  codeSnapshot: string;
}

export interface SeverityBucket {
  critical: ScarceItem[];
  high: ScarceItem[];
  normal: ScarceItem[];
}

export type FileRegistry = Record<string, SeverityBucket>;

export type RepoRegistry = Record<string, FileRegistry>;

export interface ScarceStorage {
  version: string;
  lastUpdated: number;
  repos: RepoRegistry;
}

export function emptyBucket(): SeverityBucket {
  return { critical: [], high: [], normal: [] };
}

export function emptyStorage(): ScarceStorage {
  return {
    version: "1.0.0",
    lastUpdated: Date.now(),
    repos: {},
  };
}
