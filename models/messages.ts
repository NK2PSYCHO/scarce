/**
 * @packageDocumentation
 * Message types for communication between the extension and the webview.
 */

import type { CairnSeverity } from './cairn';
import type { ScopeView } from './scope';

/**
 * Captured editor context for a Cairn that is about to be created.
 * Sent from the extension to the webview to populate the add form.
 */
export interface CairnDraft {
  /**
   * Absolute path of the root folder that `filePath` is relative to.
   */
  rootPath: string;

  /**
   * Path of the file the selection came from, relative to `rootPath`, with forward slashes.
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
 * Extension to webview: show the add form pre-filled with the captured draft.
 */
export interface ShowFormMessage {
  type: 'showForm';
  draft: CairnDraft;
}

/**
 * Extension to webview: outcome of a save attempt.
 * Sent when the extension saves a cairn successfully.
 */
export interface SaveResultOkMessage {
  type: 'saveResult';
  ok: true;
}

/**
 * Extension to webview: outcome of a save attempt.
 * Sent when the extension fails to save a cairn.
 */
export interface SaveResultErrorMessage {
  type: 'saveResult';
  ok: false;
  /**
   * Error message describing why the save failed.
   */
  error: string;
}

/**
 * Extension to webview: outcome of a save attempt.
 * Discriminated by `ok`: success carries no payload, failure carries an error message.
 */
export type SaveResultMessage = SaveResultOkMessage | SaveResultErrorMessage;

/**
 * Webview to extension: the user submitted the form.
 */
export interface SaveCairnMessage {
  type: 'saveCairn';
  input: CairnInput;
}

/**
 * Webview to extension: the user cancelled the form.
 */
export interface CancelMessage {
  type: 'cancel';
}

/**
 * Webview to extension: the React app has mounted and is listening for messages.
 */
export interface ReadyMessage {
  type: 'ready';
}

/**
 * Webview to extension: the user wants to pick a different root folder.
 */
export interface ChangeRootMessage {
  type: 'changeRoot';
}

/**
 * Extension to webview: outcome of a root change.
 * Sent when the new root contains the file; carries the recomputed relative path.
 */
export interface ChangeRootResultOkMessage {
  type: 'changeRootResult';
  ok: true;
  /**
   * Absolute path of the newly chosen root folder.
   */
  rootPath: string;
  /**
   * Path of the file relative to the new root, with forward slashes.
   */
  filePath: string;
}

/**
 * Extension to webview: outcome of a root change.
 * Sent when the chosen folder does not contain the file; the previous root stays.
 */
export interface ChangeRootResultErrorMessage {
  type: 'changeRootResult';
  ok: false;
  /**
   * Error message describing why the root was rejected.
   */
  error: string;
}

/**
 * Extension to webview: outcome of a root change.
 * Discriminated by `ok`: success carries the new root and relative path, failure an error message.
 */
export type ChangeRootResultMessage = ChangeRootResultOkMessage | ChangeRootResultErrorMessage;

/**
 * Extension to webview: the Cairns or the scope changed. Carries the full view for
 * the current scope, already filtered and grouped by the extension.
 */
export interface CairnsChangedMessage {
  type: 'cairnsChanged';
  view: ScopeView;
}

/**
 * Extension to webview: the Cairns could not be read (for example, a corrupt file).
 */
export interface ListErrorMessage {
  type: 'listError';
  /**
   * Error message describing why the list could not be read.
   */
  error: string;
}

/** Any message the extension can send to the webview. */
export type ExtensionToWebviewMessage =
  | ShowFormMessage
  | SaveResultMessage
  | ChangeRootResultMessage
  | CairnsChangedMessage
  | ListErrorMessage;

/** Any message the webview can send to the extension. */
export type WebviewToExtensionMessage =
  SaveCairnMessage | CancelMessage | ReadyMessage | ChangeRootMessage;
