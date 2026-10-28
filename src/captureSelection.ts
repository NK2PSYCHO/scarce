/**
 * @packageDocumentation
 * Turns raw editor selections into drafts for the add-Cairn form.
 */

import type { CairnDraft } from '../models/messages';
import { toRelativePath } from './relativePath';

/**
 * Raw editor selection data handed to {@link captureSelection}.
 * Kept free of VS Code types so the capture logic stays unit-testable.
 */
export interface SelectionInput {
  /**
   * Absolute path of the root folder the draft's file path is made relative to.
   */
  rootPath: string;

  /**
   * Absolute path to the file the selection came from.
   */
  filePath: string;

  /**
   * Exact selected text.
   */
  text: string;

  /**
   * First line of the selection (0-indexed, as in the VS Code API).
   */
  startLine: number;

  /**
   * Last line of the selection (0-indexed).
   */
  endLine: number;
}

/**
 * Thrown when the selection contains no code (empty or whitespace only).
 */
export class EmptySelectionError extends Error {
  constructor() {
    super('A cairn needs a stone: select some code first.');
    this.name = 'EmptySelectionError';
  }
}

/**
 * Turns a raw editor selection into a draft for the add-Cairn form.
 * The file path is made relative to the root, with forward slashes.
 * The snippet is kept exactly as selected and `lineRange` stays 0-indexed
 * (matching the VS Code API); the UI adds 1 for display.
 *
 * @param input - The selection's file path, text and line bounds.
 * @returns A {@link CairnDraft} ready to send to the webview.
 * @throws EmptySelectionError if the selected text is empty or whitespace only.
 * @throws FileOutsideRootError if the file is not inside the root.
 */
export function captureSelection(input: SelectionInput): CairnDraft {
  if (input.text.trim() === '') {
    throw new EmptySelectionError();
  }
  return {
    rootPath: input.rootPath,
    filePath: toRelativePath(input.rootPath, input.filePath),
    codeSnippet: input.text,
    lineRange: [input.startLine, input.endLine],
  };
}
