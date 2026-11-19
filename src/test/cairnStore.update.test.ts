/**
 * @packageDocumentation
 * Unit tests for `FileCairnStore.update` using an in-memory fake filesystem.
 */
import * as assert from 'assert';
import { FileCairnStore } from '../store/cairnStore';
import { CairnNotFoundError, CorruptCairnFileError } from '../store/errors';
import { createFakeFs } from './helpers/fakeFs';
import type { Cairn } from '../../models/cairn';

const STORE_PATH = '/storage/cairns.json';

const a: Cairn = {
  id: 'a',
  rootPath: '/repo',
  filePath: 'a.ts',
  codeSnippet: 'a',
  lineRange: [0, 0],
  comment: 'first',
  severity: 'normal',
};
const b: Cairn = { ...a, id: 'b', comment: 'second', severity: 'high' };

function seeded(content: string) {
  const handle = createFakeFs({ files: { [STORE_PATH]: content } });
  return { handle, store: new FileCairnStore(STORE_PATH, handle.fs, () => 'new-id') };
}

function stored(handle: { files: Map<string, string> }): Cairn[] {
  return (JSON.parse(handle.files.get(STORE_PATH) ?? '{}') as { cairns: Cairn[] }).cairns;
}

suite('FileCairnStore.update', () => {
  test('changes only the patched fields of one cairn and returns it', async () => {
    const { handle, store } = seeded(JSON.stringify({ version: 1, cairns: [a, b] }));
    const result = await store.update('a', { comment: 'edited', severity: 'critical' });
    assert.deepStrictEqual(result, { ...a, comment: 'edited', severity: 'critical' });
    assert.deepStrictEqual(stored(handle), [result, b]);
  });

  test('supports resolve fields in one patch', async () => {
    const { handle, store } = seeded(JSON.stringify({ version: 1, cairns: [a] }));
    await store.update('a', { resolved: true, resolvedAt: '2026-01-01T00:00:00.000Z' });
    assert.deepStrictEqual(stored(handle), [
      { ...a, resolved: true, resolvedAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  test('rejects an unknown id and leaves the file alone', async () => {
    const content = JSON.stringify({ version: 1, cairns: [a] });
    const { handle, store } = seeded(content);
    await assert.rejects(store.update('nope', { comment: 'x' }), CairnNotFoundError);
    assert.strictEqual(handle.files.get(STORE_PATH), content);
  });

  test('rejects with not found when the file does not exist', async () => {
    const store = new FileCairnStore(STORE_PATH, createFakeFs().fs, () => 'id');
    await assert.rejects(store.update('a', { comment: 'x' }), CairnNotFoundError);
  });

  test('rejects a corrupt file without touching it', async () => {
    const { handle, store } = seeded('{not json');
    await assert.rejects(store.update('a', { comment: 'x' }), CorruptCairnFileError);
    assert.strictEqual(handle.files.get(STORE_PATH), '{not json');
  });

  test('a failed update does not block the next one', async () => {
    const { handle, store } = seeded(JSON.stringify({ version: 1, cairns: [a] }));
    const failed = store.update('nope', { comment: 'x' });
    const ok = store.update('a', { comment: 'y' });
    await assert.rejects(failed, CairnNotFoundError);
    assert.strictEqual((await ok).comment, 'y');
    assert.strictEqual(stored(handle)[0]?.comment, 'y');
  });
});
