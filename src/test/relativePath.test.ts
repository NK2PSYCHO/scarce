/**
 * @packageDocumentation
 * Unit tests for `toRelativePath`: relative forward-slash output and rejection
 * of files that are not strictly inside the root.
 */
import * as assert from 'assert';
import { FileOutsideRootError, toRelativePath } from '../relativePath';

suite('toRelativePath', () => {
  test('returns the path for a nested file', () => {
    assert.strictEqual(toRelativePath('/repo', '/repo/src/a.ts'), 'src/a.ts');
  });

  test('returns the bare name for a file directly in the root', () => {
    assert.strictEqual(toRelativePath('/repo', '/repo/a.ts'), 'a.ts');
  });

  test('accepts a root with a trailing slash', () => {
    assert.strictEqual(toRelativePath('/repo/', '/repo/src/a.ts'), 'src/a.ts');
  });

  test('keeps a file name that starts with two dots', () => {
    assert.strictEqual(toRelativePath('/repo', '/repo/..foo.ts'), '..foo.ts');
  });

  test('throws for a file outside the root', () => {
    assert.throws(() => toRelativePath('/repo', '/other/a.ts'), FileOutsideRootError);
  });

  test('throws for a sibling folder sharing the root name prefix', () => {
    assert.throws(() => toRelativePath('/repo', '/repo-other/a.ts'), FileOutsideRootError);
  });

  test('throws when the file path is the root itself', () => {
    assert.throws(() => toRelativePath('/repo', '/repo'), FileOutsideRootError);
  });
});
