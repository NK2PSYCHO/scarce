import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import {
  ScarceItem,
  ScarceStorage,
  SeverityLevel,
  RepoRegistry,
  emptyBucket,
  emptyStorage,
} from "../types/index";

const SCARCE_DIR = path.join(os.homedir(), ".scarce");
const SCARCE_FILE = path.join(SCARCE_DIR, "scarce.json");

const CURRENT_VERSION = "1.0.0";

function isValidScarceStorage(value: unknown): value is ScarceStorage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.version !== "string") {
    return false;
  }
  if (typeof candidate.lastUpdated !== "number") {
    return false;
  }
  if (
    typeof candidate.repos !== "object" ||
    candidate.repos === null ||
    Array.isArray(candidate.repos)
  ) {
    return false;
  }

  for (const fileRegistry of Object.values(
    candidate.repos as Record<string, unknown>,
  )) {
    if (
      typeof fileRegistry !== "object" ||
      fileRegistry === null ||
      Array.isArray(fileRegistry)
    ) {
      return false;
    }
    for (const bucket of Object.values(
      fileRegistry as Record<string, unknown>,
    )) {
      if (typeof bucket !== "object" || bucket === null) {
        return false;
      }
      const b = bucket as Record<string, unknown>;
      if (
        !Array.isArray(b.critical) ||
        !Array.isArray(b.high) ||
        !Array.isArray(b.normal)
      ) {
        return false;
      }
    }
  }

  return true;
}

function migrate(storage: ScarceStorage): ScarceStorage {
  if (storage.version === CURRENT_VERSION) {
    return storage;
  }

  console.warn(
    `[Scarce] storage file version "${storage.version}" does not match ` +
      `current version "${CURRENT_VERSION}" and no migration was found. ` +
      `Using as-is.`,
  );
  return storage;
}

function quarantineCorruptedFile(reason: string): void {
  try {
    if (!fs.existsSync(SCARCE_FILE)) {
      return;
    }
    const quarantinePath = path.join(
      SCARCE_DIR,
      `scarce.json.corrupted-${Date.now()}`,
    );
    fs.copyFileSync(SCARCE_FILE, quarantinePath);
    console.error(
      `[Scarce] Storage file was corrupted or invalid (${reason}). ` +
        `The original file was preserved at: ${quarantinePath}. ` +
        `Starting from an empty store.`,
    );
  } catch (err) {
    console.error("[Scarce] Failed to quarantine corrupted storage file:", err);
  }
}

export function readStorage(): ScarceStorage {
  if (!fs.existsSync(SCARCE_FILE)) {
    return emptyStorage();
  }

  let raw: string;
  try {
    raw = fs.readFileSync(SCARCE_FILE, "utf-8");
  } catch (err) {
    console.error("[Scarce] Failed to read storage file:", err);
    return emptyStorage();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    quarantineCorruptedFile("invalid JSON syntax");
    return emptyStorage();
  }

  if (!isValidScarceStorage(parsed)) {
    quarantineCorruptedFile("parsed JSON did not match expected shape");
    return emptyStorage();
  }

  return migrate(parsed);
}

export function writeStorage(storage: ScarceStorage): void {
  try {
    if (!fs.existsSync(SCARCE_DIR)) {
      fs.mkdirSync(SCARCE_DIR, { recursive: true });
    }

    storage.version = CURRENT_VERSION;
    storage.lastUpdated = Date.now();

    const payload = JSON.stringify(storage, null, 2);
    const tempFile = path.join(
      SCARCE_DIR,
      `.scarce.json.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`,
    );

    fs.writeFileSync(tempFile, payload, "utf-8");
    fs.renameSync(tempFile, SCARCE_FILE);
  } catch (err) {
    console.error("[Scarce] Failed to write storage:", err);
  }
}

export interface AddItemResult {
  existingCount: number;
}

function getRepoRegistry(storage: ScarceStorage): RepoRegistry {
  if (
    typeof storage.repos !== "object" ||
    storage.repos === null ||
    Array.isArray(storage.repos)
  ) {
    storage.repos = {};
  }
  return storage.repos;
}

export function addItem(repoRoot: string, item: ScarceItem): AddItemResult {
  const storage = readStorage();
  const relPath = path.relative(repoRoot, item.filepath);
  const repos = getRepoRegistry(storage);

  if (!repos[repoRoot]) {
    repos[repoRoot] = {};
  }

  if (!repos[repoRoot][relPath]) {
    repos[repoRoot][relPath] = emptyBucket();
  }

  const bucket = repos[repoRoot][relPath];

  const existingCount = [
    ...bucket.critical,
    ...bucket.high,
    ...bucket.normal,
  ].filter(
    (i) => i.startLine === item.startLine && i.endLine === item.endLine,
  ).length;

  bucket[item.severity].push(item);

  writeStorage(storage);

  return { existingCount };
}

export function getItemsForFile(
  repoRoot: string,
  filepath: string,
): ScarceItem[] {
  const storage = readStorage();
  const relPath = path.relative(repoRoot, filepath);
  const bucket = getRepoRegistry(storage)[repoRoot]?.[relPath];
  if (!bucket) {
    return [];
  }
  return [...bucket.critical, ...bucket.high, ...bucket.normal];
}

export function getItemsForRepo(
  repoRoot: string,
): Record<string, ScarceItem[]> {
  const storage = readStorage();
  const fileRegistry = getRepoRegistry(storage)[repoRoot];
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
  return Object.keys(getRepoRegistry(storage));
}

export function removeItem(
  repoRoot: string,
  filepath: string,
  itemId: string,
): void {
  const storage = readStorage();
  const relPath = path.relative(repoRoot, filepath);
  const repos = getRepoRegistry(storage);
  const bucket = repos[repoRoot]?.[relPath];
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
    delete repos[repoRoot][relPath];

    if (Object.keys(repos[repoRoot]).length === 0) {
      delete repos[repoRoot];
    }
  }

  writeStorage(storage);
}
