import * as path from 'path';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';
import { isNotFound, parseCairns } from './parseCairns';

/**
 * File system abstraction for cairn store operations. Allows testability by
 * injecting mock file operations.
 *
 * @param mkdir - Creates a directory recursively.
 * @param readFile - Reads a file as UTF-8 text.
 * @param writeFile - Writes data to a file.
 * @param rename - Renames or moves a file.
 */
export interface CairnFs {
  mkdir(dir: string): Promise<unknown>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<unknown>;
  rename(from: string, to: string): Promise<unknown>;
}

/**
 * Interface for persisting cairns. Defines the add operation for storing a
 * cairn input and returning the saved cairn with its generated ID.
 *
 * @param add - Persists a cairn input and returns the saved cairn.
 */
export interface CairnStore {
  add(input: CairnInput): Promise<Cairn>;
}

/**
 * A cairn store backed by a JSON file in the file system. Uses atomic writes
 * via temporary file and rename to prevent corruption.
 *
 * @param storePath - Path to the JSON file storing cairns.
 * @param fs - File system operations abstraction.
 * @param generateId - Function for generating unique IDs.
 */
export class FileCairnStore implements CairnStore {
  constructor(
    private readonly storePath: string,
    private readonly fs: CairnFs,
    private readonly generateId: () => string,
  ) {}

  /**
   * Adds a new cairn to the store. Reads existing cairns, appends the new one
   * with a generated ID, writes to a temp file, then atomically renames.
   *
   * @param input - The cairn data to persist (without ID).
   * @returns The saved cairn with its generated ID.
   */
  async add(input: CairnInput): Promise<Cairn> {
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
