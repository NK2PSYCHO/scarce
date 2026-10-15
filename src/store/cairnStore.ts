import * as path from 'path';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';
import { isNotFound, parseCairns } from './parseCairns';

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
}

/**
 * {@link CairnStore} backed by a single JSON file. Writes go to a temporary
 * file that is renamed over the target, so a crash cannot leave a partial file.
 * Calls to {@link FileCairnStore.add} are serialized through an instance-level
 * queue, so overlapping saves cannot lose records or share the temp file.
 */
export class FileCairnStore implements CairnStore {
  /** Tail of the pending `add` operations; each new add runs after it settles. */
  private writeQueue: Promise<unknown> = Promise.resolve();

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
    const result = this.writeQueue.then(() => this.append(input));
    this.writeQueue = result.catch(() => undefined);
    return result;
  }

  /**
   * Performs one append. A missing file counts as an empty store. Reads the
   * existing cairns, writes them plus the new one to a temp file, then renames
   * it over the store file. Must only be called through the queue in `add`.
   *
   * @param input - The cairn data to persist, without an id.
   * @returns The saved cairn with its generated id.
   * @throws CorruptCairnFileError if the existing file cannot be parsed.
   */
  private async append(input: CairnInput): Promise<Cairn> {
    await this.fs.mkdir(path.dirname(this.storePath));

    let cairns: Cairn[] = [];
    try {
      cairns = parseCairns(await this.fs.readFile(this.storePath));
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    const saved: Cairn = { id: this.generateId(), ...input };
    const tmpPath = `${this.storePath}.tmp`;
    const data = JSON.stringify({ version: 1, cairns: [...cairns, saved] }, null, 2);
    await this.fs.writeFile(tmpPath, data);
    await this.fs.rename(tmpPath, this.storePath);
    return saved;
  }
}
