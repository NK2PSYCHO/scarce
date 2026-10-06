import type { CairnSeverity } from './cairn';

/**
 * Captured editor context for a Cairn that is about to be created.
 * Sent from the extension to the webview to populate the add form.
 *
 * @property filePath - Absolute path to the file the selection came from.
 * @property codeSnippet - Exact selected text.
 * @property lineRange - Line range [start, end] of the selection (0-indexed).
 */
export interface CairnDraft {
  filePath: string;
  codeSnippet: string;
  lineRange: [number, number];
}

/**
 * Everything the user submits from the add form: the draft context plus the
 * editable fields. The extension turns this into a Cairn by generating an id.
 */
export interface CairnInput extends CairnDraft {
  comment: string;
  severity: CairnSeverity;
}

/** Extension -> webview: show the add form pre-filled with the captured draft. */
export interface ShowFormMessage {
  type: 'showForm';
  draft: CairnDraft;
}

/** Extension -> webview: outcome of a save attempt. */
export interface SaveResultOkMessage {
  type: 'saveResult';
  ok: true;
}

export interface SaveResultErrorMessage {
  type: 'saveResult';
  ok: false;
  error: string;
}

export type SaveResultMessage = SaveResultOkMessage | SaveResultErrorMessage;

/** Webview -> extension: the user submitted the form. */
export interface SaveCairnMessage {
  type: 'saveCairn';
  input: CairnInput;
}

/** Webview -> extension: the user cancelled the form. */
export interface CancelMessage {
  type: 'cancel';
}

/** Every message the extension may post to the webview. */
export type ExtensionToWebviewMessage = ShowFormMessage | SaveResultMessage;

/** Every message the webview may post to the extension. */
export type WebviewToExtensionMessage = SaveCairnMessage | CancelMessage;
