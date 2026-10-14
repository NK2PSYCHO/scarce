/**
 * @packageDocumentation
 * Unit tests for `captureSelection`: draft creation with a 0-indexed line
 * range, exact preservation of multi-line text, and rejection of empty or
 * whitespace-only selections.
 */
import * as assert from 'assert';
import { captureSelection, EmptySelectionError } from '../captureSelection';

suite('captureSelection', () => {
  test('returns the draft with a 0-indexed line range', () => {
    const draft = captureSelection({
      filePath: '/a/b.ts',
      text: 'const x = 1;',
      startLine: 4,
      endLine: 4,
    });
    assert.deepStrictEqual(draft, {
      filePath: '/a/b.ts',
      codeSnippet: 'const x = 1;',
      lineRange: [4, 4],
    });
  });

  test('keeps multi-line text exactly as selected', () => {
    const draft = captureSelection({
      filePath: '/a/b.ts',
      text: 'a\n  b\nc',
      startLine: 2,
      endLine: 4,
    });
    assert.strictEqual(draft.codeSnippet, 'a\n  b\nc');
    assert.deepStrictEqual(draft.lineRange, [2, 4]);
  });

  test('rejects an empty selection', () => {
    assert.throws(
      () => captureSelection({ filePath: '/a/b.ts', text: '', startLine: 0, endLine: 0 }),
      EmptySelectionError,
    );
  });

  test('rejects a whitespace-only selection', () => {
    assert.throws(
      () => captureSelection({ filePath: '/a/b.ts', text: '  \n\t ', startLine: 0, endLine: 0 }),
      EmptySelectionError,
    );
  });
});
