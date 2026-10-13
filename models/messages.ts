import type { CairnSeverity } from './cairn';

/**
 * Captured editor context for a Cairn that is about to be created.
 * Sent from the extension to the webview to populate the add form.
 */
export interface CairnDraft {
  /**
   * Absolute path to the file the selection came from.
   */
  filePath: string;

  /**
   * Exact selected text.
   */
  codeSnippet: string;

  /**
   * Line range [start, end] of the selection (0-indexed).
   */
  lineRange: [number, number];
}

/**
 * Everything the user submits from the add form: the draft context plus the
 * editable fields. The extension turns this into a Cairn by generating an id.
 */
export interface CairnInput extends CairnDraft {
  /**
   * User-provided notes explaining why the code snippet was flagged.
   */
  comment: string;

  /**
   * Assigned severity level determining sorting and notification behavior.
   */
  severity: CairnSeverity;
}

/**
 * Extension -> webview: show the add form pre-filled with the captured draft.
 */
export interface ShowFormMessage {
  type: 'showForm';
  draft: CairnDraft;
}

/**
 * Extension -> webview: outcome of a save attempt.
 */
export interface SaveResultOkMessage {
  type: 'saveResult';
  ok: true;
}

export interface SaveResultErrorMessage {
  type: 'saveResult';
  ok: false;
  /**
   * Error message describing why the save failed.
   */
  error: string;
}

export type SaveResultMessage = SaveResultOkMessage | SaveResultErrorMessage;

/**
 * Webview -> extension: the user submitted the form.
 */
export interface SaveCairnMessage {
  type: 'saveCairn';
  input: CairnInput;
}

/**
 * Webview -> extension: the user cancelled the form.
 */
export interface CancelMessage {
  type: 'cancel';
}

/** Extension -> webview: show the add form pre-filled with the captured draft, or report save outcome. */
export type ExtensionToWebviewMessage = ShowFormMessage | SaveResultMessage;

/** Webview -> extension: submit a Cairn to save, or cancel the form. */
export type WebviewToExtensionMessage = SaveCairnMessage | CancelMessage;
