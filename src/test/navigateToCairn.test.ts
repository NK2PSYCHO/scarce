/**
 * @packageDocumentation
 * Tests for `navigateToCairn`: opens the file, selects the lines, clamps stale
 * ranges and reports a missing file.
 */
import * as assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { navigateToCairn } from '../navigateToCairn';
import type { Cairn } from '../../models/cairn';

suite('navigateToCairn', () => {
  let dir: string;

  setup(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scarce-nav-'));
    fs.writeFileSync(path.join(dir, 'a.ts'), 'one\ntwo\nthree\nfour\n');
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function cairn(filePath: string, lineRange: [number, number]): Cairn {
    return {
      id: 'c1',
      rootPath: dir,
      filePath,
      codeSnippet: '',
      lineRange,
      comment: '',
      severity: 'normal',
    };
  }

  test('opens the file and selects the lines', async () => {
    assert.strictEqual(await navigateToCairn(cairn('a.ts', [1, 2])), true);
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor);
    assert.strictEqual(editor.document.uri.fsPath, path.join(dir, 'a.ts'));
    assert.strictEqual(editor.selection.start.line, 1);
    assert.strictEqual(editor.selection.start.character, 0);
    assert.strictEqual(editor.selection.end.line, 2);
    assert.strictEqual(editor.selection.end.character, 'three'.length);
  });

  test('clamps a range past the end of the file', async () => {
    assert.strictEqual(await navigateToCairn(cairn('a.ts', [10, 20])), true);
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor);
    const last = editor.document.lineCount - 1;
    assert.strictEqual(editor.selection.start.line, last);
    assert.strictEqual(editor.selection.end.line, last);
  });

  test('returns false when the file does not exist', async () => {
    assert.strictEqual(await navigateToCairn(cairn('missing.ts', [0, 0])), false);
  });
});
