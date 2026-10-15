/**
 * @packageDocumentation
 * Unit tests for `captureSelection`: draft creation with a root-relative path and
 * a 0-indexed line range, exact preservation of multi-line text, rejection of
 * empty or whitespace-only selections, and rejection of files outside the root.
 */
import * as assert from 'assert';
import { captureSelection, EmptySelectionError } from '../captureSelection';
import { FileOutsideRootError } from '../relativePath';

suite('captureSelection', () => {
  test('returns the draft with a relative path and a 0-indexed line range', () => {
    const draft = captureSelection({
      rootPath: '/a',
      filePath: '/a/b.ts',
      text: 'const x = 1;',
      startLine: 4,
      endLine: 4,
    });
    assert.deepStrictEqual(draft, {
      rootPath: '/a',
      filePath: 'b.ts',
      codeSnippet: 'const x = 1;',
      lineRange: [4, 4],
    });
  });

  test('makes a nested file path relative with forward slashes', () => {
    const draft = captureSelection({
      rootPath: '/a',
      filePath: '/a/src/lib/b.ts',
      text: 'x',
      startLine: 0,
      endLine: 0,
    });
    assert.strictEqual(draft.filePath, 'src/lib/b.ts');
  });

  test('keeps multi-line text exactly as selected', () => {
    const draft = captureSelection({
      rootPath: '/a',
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
      () =>
        captureSelection({
          rootPath: '/a',
          filePath: '/a/b.ts',
          text: '',
          startLine: 0,
          endLine: 0,
        }),
      EmptySelectionError,
    );
  });

  test('rejects a whitespace-only selection', () => {
    assert.throws(
      () =>
        captureSelection({
          rootPath: '/a',
          filePath: '/a/b.ts',
          text: '  \n\t ',
          startLine: 0,
          endLine: 0,
        }),
      EmptySelectionError,
    );
  });

  test('rejects a file outside the root', () => {
    assert.throws(
      () =>
        captureSelection({
          rootPath: '/a',
          filePath: '/other/b.ts',
          text: 'x',
          startLine: 0,
          endLine: 0,
        }),
      FileOutsideRootError,
    );
  });
});
