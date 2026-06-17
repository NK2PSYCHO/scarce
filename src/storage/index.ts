import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ScarceItem,
  ScarceStorage,
  SeverityLevel,
  emptyBucket,
  emptyStorage,
} from "../types/index";

const SCARCE_DIR = path.join(os.homedir(), ".scarce");
const SCARCE_FILE = path.join(SCARCE_DIR, "scarce.json");

export function readStorage(): ScarceStorage {
  try {
    if (!fs.existsSync(SCARCE_FILE)) {
      return emptyStorage();
    }
    const raw = fs.readFileSync(SCARCE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return emptyStorage();
  }
}

export function writeStorage(storage: ScarceStorage): void {
  try {
    if (!fs.existsSync(SCARCE_DIR)) {
      fs.mkdirSync(SCARCE_DIR, { recursive: true });
    }
    storage.lastUpdated = Date.now();
    fs.writeFileSync(SCARCE_FILE, JSON.stringify(storage, null, 2), "utf-8");
  } catch (err) {
    console.error("[Scarce] Failed to write storage:", err);
  }
}

export function addItem(repoRoot: string, item: ScarceItem): void {
  const storage = readStorage();
  const relPath = path.relative(repoRoot, item.filepath);

  if (!storage.repos[repoRoot]) {
    storage.repos[repoRoot] = {};
  }

  if (!storage.repos[repoRoot][relPath]) {
    storage.repos[repoRoot][relPath] = emptyBucket();
  }

  const bucket = storage.repos[repoRoot][relPath];

  const isDuplicate = [
    ...bucket.critical,
    ...bucket.high,
    ...bucket.normal,
  ].some((i) => i.startLine === item.startLine && i.endLine === item.endLine);

  if (isDuplicate) {
    return;
  }

  bucket[item.severity].push(item);

  writeStorage(storage);
}

export function getItemsForFile(
  repoRoot: string,
  filepath: string,
): ScarceItem[] {
  const storage = readStorage();
  const relPath = path.relative(repoRoot, filepath);
  const bucket = storage.repos?.[repoRoot]?.[relPath];
  if (!bucket) {
    return [];
  }
  return [...bucket.critical, ...bucket.high, ...bucket.normal];
}

export function getItemsForRepo(
  repoRoot: string,
): Record<string, ScarceItem[]> {
  const storage = readStorage();
  const fileRegistry = storage.repos?.[repoRoot];
  if (!fileRegistry) {
    return {};
  }

  const result: Record<string, ScarceItem[]> = {};
  for (const [relPath, bucket] of Object.entries(fileRegistry)) {
    const items = [...bucket.critical, ...bucket.high, ...bucket.normal];
    if (items.length > 0) {
      result[relPath] = items;
    }
  }
  return result;
}

export function getAllRepos(): string[] {
  const storage = readStorage();
  return Object.keys(storage.repos);
}

export function removeItem(
  repoRoot: string,
  filepath: string,
  itemId: string,
): void {
  const storage = readStorage();
  const relPath = path.relative(repoRoot, filepath);
  const bucket = storage.repos?.[repoRoot]?.[relPath];
  if (!bucket) {
    return;
  }

  (["critical", "high", "normal"] as SeverityLevel[]).forEach((severity) => {
    bucket[severity] = bucket[severity].filter((i) => i.id !== itemId);
  });

  const isEmpty =
    bucket.critical.length === 0 &&
    bucket.high.length === 0 &&
    bucket.normal.length === 0;

  if (isEmpty) {
    delete storage.repos[repoRoot][relPath];

    if (Object.keys(storage.repos[repoRoot]).length === 0) {
      delete storage.repos[repoRoot];
    }
  }

  writeStorage(storage);
}
