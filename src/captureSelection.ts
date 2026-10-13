import type { CairnDraft } from '../models/messages';

export interface SelectionInput {
  filePath: string;
  text: string;
  startLine: number;
  endLine: number;
}

export class EmptySelectionError extends Error {
  constructor() {
    super('A cairn needs a stone: select some code first.');
    this.name = 'EmptySelectionError';
  }
}

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
