/**
 * @packageDocumentation
 * Fake filesystem utilities for extension unit tests. The fake `CairnFs` mimics
 * minimal file operations that test helpers exercise (mkdir, read/write, rename).
 */
import type { CairnFs } from '../../store/cairnStore';

/**
 * Options for creating a fake filesystem.
 */
export interface FakeOptions {
  /** Optional map of file paths to contents to pre-populate the fake FS with. */
  files?: Record<string, string>;
  /** Optional Error thrown when `readFile` is called (for error-path testing). */
  readError?: Error;
  /** Optional Error thrown when `rename` is called (for error-path testing). */
  renameError?: Error;
}

/**
 * Handle to a fake filesystem and its recorded state.
 */
export interface FakeFsHandle {
  /** The underlying fake CairnFs implementation being mocked. */
  fs: CairnFs;
  /** Mapping of file paths to their stored string contents. */
  files: Map<string, string>;
  /** Sequential log of every filesystem operation performed (for debugging). */
  ops: string[];
}

/**
 * Creates an Error carrying a `code`, like Node's `ErrnoException`.
 *
 * @param code - The error code, e.g. `ENOENT`.
 * @returns An Error with the given `code`.
 */
export function fsError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

/**
 * Creates an in-memory {@link CairnFs} with optional seeded files and error hooks.
 *
 * @param options - Seed files and errors to inject.
 * @returns The fake file system plus its recorded files and operations.
 */
export function createFakeFs(options: FakeOptions = {}): FakeFsHandle {
  const files = new Map<string, string>(Object.entries(options.files ?? {}));
  const ops: string[] = [];
  const fs: CairnFs = {
    mkdir: (dir) => {
      ops.push(`mkdir ${dir}`);
      return Promise.resolve();
    },
    readFile: (path) => {
      ops.push(`read ${path}`);
      if (options.readError) {
        return Promise.reject(options.readError);
      }
      const data = files.get(path);
      return data === undefined ? Promise.reject(fsError('ENOENT')) : Promise.resolve(data);
    },
    writeFile: (path, data) => {
      ops.push(`write ${path}`);
      files.set(path, data);
      return Promise.resolve();
    },
    rename: (from, to) => {
      ops.push(`rename ${from} -> ${to}`);
      if (options.renameError) {
        return Promise.reject(options.renameError);
      }
      const data = files.get(from);
      if (data === undefined) {
        return Promise.reject(fsError('ENOENT'));
      }
      files.delete(from);
      files.set(to, data);
      return Promise.resolve();
    },
  };
  return { fs, files, ops };
}
