/**
 * @packageDocumentation
 * Short-lived handoff that lets a Cairn click in a window without the repo open
 * continue in the window that has it: the clicking window writes the Cairn id and a
 * timestamp, and the window that contains the Cairn's file consumes it.
 */

import type { Cairn } from '../models/cairn';
import { absolutePathOf, isInsideAnyFolder } from './scope';

/** How long a pending navigation stays valid; covers a slow new-window start. */
export const PENDING_NAVIGATION_TTL_MS = 2 * 60 * 1000;

/** The persisted handoff record. */
export interface PendingNavigation {
  /** Id of the Cairn to open. */
  id: string;
  /** When it was written, in milliseconds since the epoch. */
  at: number;
}

/** Storage shared by all windows (backed by `globalState`). */
export interface PendingStore {
  get(): unknown;
  set(value: PendingNavigation | undefined): PromiseLike<void>;
}

/**
 * Records that the Cairn with this id should be opened by the window that has its repo.
 *
 * @param store - Shared storage.
 * @param id - Id of the Cairn to open.
 * @param now - Current time in milliseconds since the epoch.
 */
export function writePending(store: PendingStore, id: string, now: number): PromiseLike<void> {
  return store.set({ id, at: now });
}

function parsePending(raw: unknown): PendingNavigation | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const { id, at } = raw as { id?: unknown; at?: unknown };
  return typeof id === 'string' && typeof at === 'number' ? { id, at } : undefined;
}

/** What {@link consumePendingNavigation} needs from the host. */
export interface ConsumeDeps {
  pending: PendingStore;
  listCairns(): Promise<readonly Cairn[]>;
  /** Absolute paths of this window's workspace folders. */
  workspaceFolders(): string[];
  now(): number;
  navigate(cairn: Cairn): Promise<unknown>;
}

/**
 * Opens the pending Cairn if this window has its file inside an open workspace folder.
 * Malformed, expired and unknown-Cairn records are cleared. A record for a repo this
 * window does not have is left for the window that does, until it expires.
 *
 * @param deps - Host dependencies.
 * @returns `true` if this window navigated.
 */
export async function consumePendingNavigation(deps: ConsumeDeps): Promise<boolean> {
  const raw = deps.pending.get();
  if (raw === undefined || raw === null) {
    return false;
  }
  const pending = parsePending(raw);
  if (pending === undefined || deps.now() - pending.at > PENDING_NAVIGATION_TTL_MS) {
    await deps.pending.set(undefined);
    return false;
  }
  const cairn = (await deps.listCairns()).find((c) => c.id === pending.id);
  if (cairn === undefined) {
    await deps.pending.set(undefined);
    return false;
  }
  if (!isInsideAnyFolder(absolutePathOf(cairn), deps.workspaceFolders())) {
    return false;
  }
  await deps.pending.set(undefined);
  await deps.navigate(cairn);
  return true;
}
