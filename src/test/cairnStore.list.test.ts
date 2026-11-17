/**
 * @packageDocumentation
 * Unit tests for `FileCairnStore.list` using an in-memory fake filesystem.
 */
import * as assert from 'assert';
import { FileCairnStore } from '../store/cairnStore';
import { CorruptCairnFileError } from '../store/errors';
import { createFakeFs, fsError } from './helpers/fakeFs';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';

const STORE_PATH = '/storage/cairns.json';

const old: Cairn = {
  id: 'old',
  rootPath: '/repo',
  filePath: 'a.ts',
  codeSnippet: 'a',
  lineRange: [0, 0],
  comment: 'old',
  severity: 'normal',
};
const resolved: Cairn = {
  ...old,
  id: 'done',
  resolved: true,
  resolvedAt: '2026-01-01T00:00:00.000Z',
};

const input: CairnInput = {
  rootPath: '/repo',
  filePath: 'b.ts',
  codeSnippet: 'b',
  lineRange: [1, 1],
  comment: 'new',
  severity: 'high',
};

function seeded(content: string) {
  const handle = createFakeFs({ files: { [STORE_PATH]: content } });
  return { handle, store: new FileCairnStore(STORE_PATH, handle.fs, () => 'new-id') };
}

suite('FileCairnStore.list', () => {
  test('returns an empty list and writes nothing when the file is missing', async () => {
    const handle = createFakeFs();
    const store = new FileCairnStore(STORE_PATH, handle.fs, () => 'id');

    assert.deepStrictEqual(await store.list(), []);
    assert.deepStrictEqual(
      handle.ops.filter((op) => !op.startsWith('read ')),
      [],
    );
  });

  test('returns every cairn in storage order, resolved ones included', async () => {
    const { store } = seeded(JSON.stringify({ version: 1, cairns: [old, resolved] }));
    assert.deepStrictEqual(await store.list(), [old, resolved]);
  });

  test('reads old records that have no resolved fields', async () => {
    const { store } = seeded(JSON.stringify({ version: 1, cairns: [old] }));
    assert.deepStrictEqual(await store.list(), [old]);
  });

  test('rejects a corrupt file without touching it', async () => {
    const { handle, store } = seeded('{not json');
    await assert.rejects(store.list(), CorruptCairnFileError);
    assert.strictEqual(handle.files.get(STORE_PATH), '{not json');
  });

  test('rejects a file containing a malformed record', async () => {
    const { store } = seeded(JSON.stringify({ version: 1, cairns: [{ id: 'x' }] }));
    await assert.rejects(store.list(), CorruptCairnFileError);
  });

  test('propagates read errors other than ENOENT', async () => {
    const handle = createFakeFs({ readError: fsError('EACCES') });
    const store = new FileCairnStore(STORE_PATH, handle.fs, () => 'id');
    await assert.rejects(store.list(), { message: 'EACCES' });
  });

  test('sees an add that was started before it', async () => {
    const handle = createFakeFs();
    const store = new FileCairnStore(STORE_PATH, handle.fs, () => 'new-id');

    const adding = store.add(input);
    const listed = await store.list();
    const saved = await adding;

    assert.deepStrictEqual(listed, [saved]);
  });

  test('a failed list does not block later calls', async () => {
    const handle = createFakeFs({ files: { [STORE_PATH]: '{not json' } });
    const store = new FileCairnStore(STORE_PATH, handle.fs, () => 'id');

    await assert.rejects(store.list(), CorruptCairnFileError);
    handle.files.set(STORE_PATH, JSON.stringify({ version: 1, cairns: [old] }));
    assert.deepStrictEqual(await store.list(), [old]);
  });
});
