/**
 * @packageDocumentation
 * Opens a Cairn's file in the editor and selects its lines.
 */

import * as vscode from 'vscode';
import type { Cairn } from '../models/cairn';
import { absolutePathOf } from './scope';

/**
 * Opens the Cairn's file and selects its line range, clamped to the file's
 * current length so a file that shrank since the Cairn was saved still opens.
 *
 * @param cairn - The Cairn to open.
 * @returns `true` if the file was opened, `false` if it could not be opened (for example, deleted).
 */
export async function navigateToCairn(cairn: Cairn): Promise<boolean> {
  try {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absolutePathOf(cairn)));
    const last = Math.max(doc.lineCount - 1, 0);
    const start = Math.min(cairn.lineRange[0], last);
    const end = Math.min(Math.max(cairn.lineRange[1], start), last);
    const selection = new vscode.Range(start, 0, end, doc.lineAt(end).text.length);
    await vscode.window.showTextDocument(doc, { selection, preview: false });
    return true;
  } catch {
    return false;
  }
}
