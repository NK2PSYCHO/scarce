/**
 * @packageDocumentation
 * Decides whether a newly chosen root folder is valid for the file in the add-Cairn form.
 */

import type { ChangeRootResultMessage } from '../models/messages';
import { FileOutsideRootError, toRelativePath } from './relativePath';

/**
 * Checks that the file is inside the newly chosen root and recomputes its relative path.
 *
 * @param newRoot - Absolute path of the folder the user picked.
 * @param absoluteFile - Absolute path of the file the cairn is being created for.
 * @returns An ok result with the new root and relative path, or an error result
 *   carrying the {@link FileOutsideRootError} message when the file is not inside the root.
 */
export function resolveRootChange(newRoot: string, absoluteFile: string): ChangeRootResultMessage {
  try {
    return {
      type: 'changeRootResult',
      ok: true,
      rootPath: newRoot,
      filePath: toRelativePath(newRoot, absoluteFile),
    };
  } catch (error) {
    if (error instanceof FileOutsideRootError) {
      return { type: 'changeRootResult', ok: false, error: error.message };
    }
    throw error;
  }
}
