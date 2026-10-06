import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { FileCairnStore } from '../store/CairnStore';
import type { CairnFs } from '../store/CairnStore';
import type { CairnInput } from '../../models/messages';

const realFs: CairnFs = {
  mkdir: (dir) => fs.mkdir(dir, { recursive: true }),
  readFile: (filePath) => fs.readFile(filePath, 'utf8'),
  writeFile: (filePath, data) => fs.writeFile(filePath, data, 'utf8'),
  rename: (from, to) => fs.rename(from, to),
};

const input: CairnInput = {
  filePath: '/repo/a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
  comment: 'check this',
  severity: 'high',
};

suite('FileCairnStore (real filesystem)', () => {
  let dir = '';

  setup(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'scarce-store-'));
  });

  teardown(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('creates a nested directory, appends across calls, leaves no temp file', async () => {
    const storePath = path.join(dir, 'nested', 'cairns.json');
    let counter = 0;
    const store = new FileCairnStore(storePath, realFs, () => `id-${(++counter).toString()}`);

    const first = await store.add(input);
    const second = await store.add({ ...input, comment: 'second' });

    const stored = JSON.parse(await fs.readFile(storePath, 'utf8')) as unknown;
    assert.deepStrictEqual(stored, { version: 1, cairns: [first, second] });
    assert.deepStrictEqual(await fs.readdir(path.dirname(storePath)), ['cairns.json']);
  });
});
