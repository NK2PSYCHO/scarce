import * as path from 'path';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';
import { isNotFound, parseCairns } from './parseCairns';
import { CairnNotFoundError } from './errors';

/**
 * File system operations the cairn store depends on. Injected so tests can
 * substitute an in-memory fake.
 */
export interface CairnFs {
  /** Creates a directory, including any missing parents. */
  mkdir(dir: string): Promise<unknown>;
  /** Reads a file as UTF-8 text. */
  readFile(path: string): Promise<string>;
  /** Writes UTF-8 text to a file, replacing any existing content. */
  writeFile(path: string, data: string): Promise<unknown>;
  /** Renames or moves a file. */
  rename(from: string, to: string): Promise<unknown>;
}

/**
 * Fields of an existing cairn that can be patched. Identity and location
 * (`id`, `rootPath`, `filePath`, `codeSnippet`, `lineRange`) never change.
 */
export type CairnPatch = Partial<Pick<Cairn, 'comment' | 'severity' | 'resolved' | 'resolvedAt'>>;

/**
 * Persistence contract for cairns.
 */
export interface CairnStore {
  /**
   * Persists a new cairn.
   *
   * @param input - The cairn data to save, without an id.
   * @returns The saved cairn with its generated id.
   */
  add(input: CairnInput): Promise<Cairn>;

  /**
   * Reads every stored cairn, resolved ones included, in storage order.
   * Scope filtering is the caller's job.
   *
   * @returns All cairns; empty when nothing has been saved yet.
   */
  list(): Promise<Cairn[]>;

  /**
   * Changes fields of one stored cairn in a single write. Fields not in the
   * patch keep their values.
   *
   * @param id - Id of the cairn to change.
   * @param patch - The fields to overwrite.
   * @returns The cairn after the change.
   * @throws CairnNotFoundError if no cairn has this id.
   */
  update(id: string, patch: CairnPatch): Promise<Cairn>;
}

/**
 * {@link CairnStore} backed by a single JSON file. Writes go to a temporary
 * file that is renamed over the target, so a crash cannot leave a partial file.
 * Calls to {@link FileCairnStore.add} and {@link FileCairnStore.list} are
 * serialized through an instance-level queue, so overlapping saves cannot lose
 * records or share the temp file, and a list sees every earlier call's result.
 * The queue is per process: other windows share the file but not the queue.
 */
export class FileCairnStore implements CairnStore {
  /** Tail of the pending operations; each new operation runs after it settles. */
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * @param storePath - Path of the JSON file holding the cairns.
   * @param fs - File system operations.
   * @param generateId - Produces a unique id for each new cairn.
   */
  constructor(
    private readonly storePath: string,
    private readonly fs: CairnFs,
    private readonly generateId: () => string,
  ) {}

  /**
   * Appends a cairn to the store. Calls run one at a time, in call order, so
   * each sees the previous call's result. A failed call rejects only its own
   * promise and does not block later calls.
   *
   * @param input - The cairn data to persist, without an id.
   * @returns The saved cairn with its generated id.
   * @throws CorruptCairnFileError if the existing file cannot be parsed.
   */
  add(input: CairnInput): Promise<Cairn> {
    return this.enqueue(() => this.append(input));
  }

  /**
   * Reads every stored cairn. Runs through the same queue as writes. A missing
   * file counts as an empty store; nothing is written.
   *
   * @returns All stored cairns.
   * @throws CorruptCairnFileError if the file cannot be parsed.
   */
  list(): Promise<Cairn[]> {
    return this.enqueue(() => this.readAll());
  }

  /**
   * Patches one cairn. Runs through the same queue as the other operations.
   *
   * @param id - Id of the cairn to change.
   * @param patch - The fields to overwrite.
   * @returns The cairn after the change.
   * @throws CairnNotFoundError if no cairn has this id.
   * @throws CorruptCairnFileError if the file cannot be parsed.
   */
  update(id: string, patch: CairnPatch): Promise<Cairn> {
    return this.enqueue(() => this.applyPatch(id, patch));
  }

  /**
   * Runs an operation after every earlier one has settled.
   *
   * @param operation - The work to run.
   * @returns The operation's result. Its failure does not block later calls.
   */
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }

  /**
   * Reads and parses the store file. A missing file counts as an empty store.
   *
   * @returns The stored cairns.
   * @throws CorruptCairnFileError if the file cannot be parsed.
   */
  private async readAll(): Promise<Cairn[]> {
    try {
      return parseCairns(await this.fs.readFile(this.storePath));
    } catch (error) {
      if (isNotFound(error)) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Performs one append. Reads the existing cairns, writes them plus the new
   * one to a temp file, then renames it over the store file. Must only be
   * called through the queue.
   *
   * @param input - The cairn data to persist, without an id.
   * @returns The saved cairn with its generated id.
   * @throws CorruptCairnFileError if the existing file cannot be parsed.
   */
  private async append(input: CairnInput): Promise<Cairn> {
    await this.fs.mkdir(path.dirname(this.storePath));
    const cairns = await this.readAll();

    const saved: Cairn = { id: this.generateId(), ...input };
    await this.persist([...cairns, saved]);
    return saved;
  }

  /**
   * Performs one patch. Must only be called through the queue.
   *
   * @param id - Id of the cairn to change.
   * @param patch - The fields to overwrite.
   * @returns The cairn after the change.
   * @throws CairnNotFoundError if no cairn has this id.
   */
  private async applyPatch(id: string, patch: CairnPatch): Promise<Cairn> {
    const cairns = await this.readAll();
    const index = cairns.findIndex((c) => c.id === id);
    const current = cairns[index];
    if (current === undefined) {
      throw new CairnNotFoundError(id);
    }
    const updated: Cairn = { ...current, ...patch };
    const next = cairns.slice();
    next[index] = updated;
    await this.persist(next);
    return updated;
  }

  /**
   * Writes all cairns to a temp file and renames it over the store file.
   *
   * @param cairns - The complete new content.
   */
  private async persist(cairns: Cairn[]): Promise<void> {
    const tmpPath = `${this.storePath}.tmp`;
    await this.fs.writeFile(tmpPath, JSON.stringify({ version: 1, cairns }, null, 2));
    await this.fs.rename(tmpPath, this.storePath);
  }
}
