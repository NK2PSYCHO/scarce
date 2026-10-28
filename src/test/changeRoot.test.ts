/**
 * @packageDocumentation
 * Unit tests for `resolveRootChange`: ok results carry the new root and relative path,
 * files outside the root produce an error result instead of throwing.
 */
import * as assert from 'assert';
import { resolveRootChange } from '../changeRoot';
import { FileOutsideRootError } from '../relativePath';

suite('resolveRootChange', () => {
  test('returns ok with the new root and relative path for a nested file', () => {
    assert.deepStrictEqual(resolveRootChange('/repo', '/repo/src/a.ts'), {
      type: 'changeRootResult',
      ok: true,
      rootPath: '/repo',
      filePath: 'src/a.ts',
    });
  });

  test('recomputes the relative path against a deeper root', () => {
    assert.deepStrictEqual(resolveRootChange('/repo/src', '/repo/src/a.ts'), {
      type: 'changeRootResult',
      ok: true,
      rootPath: '/repo/src',
      filePath: 'a.ts',
    });
  });

  test('returns an error result when the file is outside the root', () => {
    assert.deepStrictEqual(resolveRootChange('/other', '/repo/a.ts'), {
      type: 'changeRootResult',
      ok: false,
      error: new FileOutsideRootError('/other', '/repo/a.ts').message,
    });
  });

  test('returns an error result for a sibling folder sharing the root name prefix', () => {
    const result = resolveRootChange('/repo', '/repo-other/a.ts');
    assert.strictEqual(result.ok, false);
  });

  test('returns an error result when the file is the root itself', () => {
    const result = resolveRootChange('/repo', '/repo');
    assert.strictEqual(result.ok, false);
  });
});
