/**
 * @packageDocumentation Chooses the root folder for a new Cairn: the remembered root when the file is inside it, else the workspace folder.
 */

import { FileOutsideRootError, toRelativePath } from './relativePath';

/**
 * Chooses the root folder for a new Cairn: the remembered root when the file is inside it, else the workspace folder.
 * @param workspaceFolder - The workspace folder path
 * @param remembered - The remembered root path, if any
 * @param absoluteFile - The absolute path of the file being processed
 * @returns The absolute root to use for the file
 */
export function pickRoot(
  workspaceFolder: string,
  remembered: string | undefined,
  absoluteFile: string,
): string {
  if (remembered === undefined) {
    return workspaceFolder;
  }
  try {
    toRelativePath(remembered, absoluteFile);
    return remembered;
  } catch (error) {
    if (error instanceof FileOutsideRootError) {
      return workspaceFolder;
    }
    throw error;
  }
}
