/**
 * @packageDocumentation
 * Unit tests for `FileCairnStore.add` using an in-memory fake filesystem:
 * file/directory creation, appending, atomic temp-file + rename writes, and
 * corrupt-file / I/O error handling.
 */
import * as assert from 'assert';
import { FileCairnStore } from '../store/cairnStore';
import { CorruptCairnFileError } from '../store/errors';
import { createFakeFs, fsError } from './helpers/fakeFs';
import type { FakeFsHandle } from './helpers/fakeFs';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';

const STORE_PATH = '/storage/cairns.json';
const TMP_PATH = '/storage/cairns.json.tmp';

interface StoredFile {
  version: number;
  cairns: Cairn[];
}

const input: CairnInput = {
  filePath: '/repo/a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
  comment: 'check this',
  severity: 'high',
};

const existing: Cairn = {
  id: 'old-id',
  filePath: '/repo/b.ts',
  codeSnippet: 'let b;',
  lineRange: [0, 0],
  comment: 'old',
  severity: 'normal',
};

function makeStore(handle: FakeFsHandle): FileCairnStore {
  return new FileCairnStore(STORE_PATH, handle.fs, () => 'new-id');
}

function readStored(files: Map<string, string>): StoredFile {
  return JSON.parse(files.get(STORE_PATH) ?? '') as StoredFile;
}

function writeOps(ops: string[]): string[] {
  return ops.filter((op) => op.startsWith('write ') || op.startsWith('rename '));
}

suite('FileCairnStore.add', () => {
  test('creates the file (and its directory) when it is missing', async () => {
    const handle = createFakeFs();
    const saved = await makeStore(handle).add(input);

    assert.ok(handle.ops.includes('mkdir /storage'));
    assert.deepStrictEqual(readStored(handle.files), { version: 1, cairns: [saved] });
  });

  test('returns the saved cairn with the generated id', async () => {
    const handle = createFakeFs();
    const saved = await makeStore(handle).add(input);

    assert.deepStrictEqual(saved, { id: 'new-id', ...input });
  });

  test('appends to existing cairns and keeps them intact', async () => {
    const handle = createFakeFs({
      files: { [STORE_PATH]: JSON.stringify({ version: 1, cairns: [existing] }) },
    });
    const saved = await makeStore(handle).add(input);

    assert.deepStrictEqual(readStored(handle.files).cairns, [existing, saved]);
  });

  test('writes a temp file, then renames it over the store file', async () => {
    const handle = createFakeFs();
    await makeStore(handle).add(input);

    assert.deepStrictEqual(writeOps(handle.ops), [
      `write ${TMP_PATH}`,
      `rename ${TMP_PATH} -> ${STORE_PATH}`,
    ]);
    assert.strictEqual(handle.files.has(TMP_PATH), false);
  });

  test('reports a corrupt file instead of overwriting it', async () => {
    const corrupt = '{not json';
    const handle = createFakeFs({ files: { [STORE_PATH]: corrupt } });

    await assert.rejects(makeStore(handle).add(input), CorruptCairnFileError);
    assert.strictEqual(handle.files.get(STORE_PATH), corrupt);
    assert.deepStrictEqual(writeOps(handle.ops), []);
  });

  for (const content of ['[]', '{"version":1}', '{"version":1,"cairns":"x"}']) {
    test(`treats valid JSON of the wrong shape as corrupt: ${content}`, async () => {
      const handle = createFakeFs({ files: { [STORE_PATH]: content } });

      await assert.rejects(makeStore(handle).add(input), CorruptCairnFileError);
      assert.strictEqual(handle.files.get(STORE_PATH), content);
      assert.deepStrictEqual(writeOps(handle.ops), []);
    });
  }

  test('propagates read errors other than ENOENT without writing', async () => {
    const handle = createFakeFs({ readError: fsError('EACCES') });

    await assert.rejects(makeStore(handle).add(input), { message: 'EACCES' });
    assert.deepStrictEqual(writeOps(handle.ops), []);
  });

  test('leaves the existing file untouched when the rename fails', async () => {
    const original = JSON.stringify({ version: 1, cairns: [existing] });
    const handle = createFakeFs({
      files: { [STORE_PATH]: original },
      renameError: fsError('EIO'),
    });

    await assert.rejects(makeStore(handle).add(input), { message: 'EIO' });
    assert.strictEqual(handle.files.get(STORE_PATH), original);
  });

  test('keeps every cairn when adds overlap', async () => {
    const handle = createFakeFs();
    let n = 0;
    const store = new FileCairnStore(STORE_PATH, handle.fs, () => `id-${String(++n)}`);

    const [first, second] = await Promise.all([
      store.add({ ...input, comment: 'first' }),
      store.add({ ...input, comment: 'second' }),
    ]);

    assert.deepStrictEqual(readStored(handle.files).cairns, [first, second]);
    assert.deepStrictEqual([first.id, second.id], ['id-1', 'id-2']);
  });

  test('runs overlapping adds one at a time, each with its own temp write', async () => {
    const handle = createFakeFs();
    const store = makeStore(handle);

    await Promise.all([store.add(input), store.add(input), store.add(input)]);

    assert.deepStrictEqual(
      writeOps(handle.ops),
      Array.from({ length: 3 }).flatMap(() => [
        `write ${TMP_PATH}`,
        `rename ${TMP_PATH} -> ${STORE_PATH}`,
      ]),
    );
    assert.strictEqual(readStored(handle.files).cairns.length, 3);
  });

  test('a failed add rejects only itself and does not block later adds', async () => {
    const handle = createFakeFs();
    let reads = 0;
    const realRead = handle.fs.readFile.bind(handle.fs);
    handle.fs.readFile = (p) => {
      reads += 1;
      return reads === 1 ? Promise.reject(fsError('EACCES')) : realRead(p);
    };
    const store = makeStore(handle);

    const [failed, ok] = await Promise.allSettled([store.add(input), store.add(input)]);

    assert.strictEqual(failed.status, 'rejected');
    assert.strictEqual(ok.status, 'fulfilled');
    assert.strictEqual(readStored(handle.files).cairns.length, 1);
  });
});
