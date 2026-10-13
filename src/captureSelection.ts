import type { CairnDraft } from '../models/messages';

/**
 * Raw editor selection data handed to {@link captureSelection}.
 * Kept free of VS Code types so the capture logic stays unit-testable.
 *
 * @property filePath - Absolute path to the file the selection came from.
 * @property text - Exact selected text.
 * @property startLine - First line of the selection (0-indexed, as in the VS Code API).
 * @property endLine - Last line of the selection (0-indexed).
 */
export interface SelectionInput {
  filePath: string;
  text: string;
  startLine: number;
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
 * The snippet is kept exactly as selected and `lineRange` stays 0-indexed
 * (matching the VS Code API); the UI adds 1 for display.
 *
 * @param input - The selection's file path, text and line bounds.
 * @returns A {@link CairnDraft} ready to send to the webview.
 * @throws {EmptySelectionError} If the selected text is empty or whitespace only.
 */
export function captureSelection(input: SelectionInput): CairnDraft {
  if (input.text.trim() === '') {
    throw new EmptySelectionError();
  }
  return {
    filePath: input.filePath,
    codeSnippet: input.text,
    lineRange: [input.startLine, input.endLine],
  };
}
