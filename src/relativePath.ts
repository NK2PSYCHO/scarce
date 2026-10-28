/**
 * @packageDocumentation
 * Converts absolute file paths into repo-root-relative paths for storage in Cairns.
 */

import * as path from 'path';

/**
 * Thrown when a file is not strictly inside the chosen root.
 */
export class FileOutsideRootError extends Error {
  constructor(root: string, filePath: string) {
    super(`${filePath} is not inside the root ${root}.`);
    this.name = 'FileOutsideRootError';
  }
}

/**
 * Returns the path of a file relative to a root, using forward slashes.
 *
 * @param root - Absolute path of the root folder.
 * @param filePath - Absolute path of the file.
 * @returns The relative path, e.g. `src/a.ts`.
 * @throws FileOutsideRootError if the file is the root itself or not inside it.
 */
export function toRelativePath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath);
  const escapes = relative === '..' || relative.startsWith(`..${path.sep}`);
  if (relative === '' || escapes || path.isAbsolute(relative)) {
    throw new FileOutsideRootError(root, filePath);
  }
  return relative.split(path.sep).join('/');
}
