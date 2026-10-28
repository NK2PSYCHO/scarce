/**
 * @packageDocumentation
 * Unit tests for `pickRoot`: selects the remembered root when the file is inside it,
 * and falls back to the workspace folder otherwise.
 */
import { pickRoot } from '../pickRoot';
import * as assert from 'assert';

suite('pickRoot', () => {
  test('should return remembered root when file is inside it', () => {
    assert.strictEqual(pickRoot('/repo/sub', '/repo', '/repo/sub/a.ts'), '/repo');
  });

  test('should return workspace folder when no remembered root', () => {
    assert.strictEqual(pickRoot('/repo/sub', undefined, '/repo/sub/a.ts'), '/repo/sub');
  });

  test('should return workspace folder when remembered root is different', () => {
    assert.strictEqual(pickRoot('/repo/sub', '/other', '/repo/sub/a.ts'), '/repo/sub');
  });

  test('should return workspace folder when sibling prefix', () => {
    assert.strictEqual(pickRoot('/repo-x', '/repo', '/repo-x/a.ts'), '/repo-x');
  });

  test('should return workspace folder when remembered is the file itself', () => {
    assert.strictEqual(pickRoot('/repo', '/repo/sub/a.ts', '/repo/sub/a.ts'), '/repo');
  });
});
