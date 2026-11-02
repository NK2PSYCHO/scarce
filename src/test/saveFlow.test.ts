/**
 * @packageDocumentation
 * Save-flow tests: a selection captured in the editor, saved through
 * `handleWebviewMessage` into `FileCairnStore`, must keep enough information
 * (`rootPath` + `filePath`) to recover the original absolute file.
 */
import * as assert from 'assert';
import * as path from 'path';
import { captureSelection } from '../captureSelection';
import { resolveRootChange } from '../changeRoot';
import { handleWebviewMessage } from '../handleWebviewMessage';
import { FileCairnStore } from '../store/cairnStore';
import { parseCairns } from '../store/parseCairns';
import type { Cairn } from '../../models/cairn';
import type { CairnDraft, CairnInput } from '../../models/messages';
import { createFakeFs } from './helpers/fakeFs';

const STORE_PATH = '/storage/cairns.json';

function setupStore() {
  const handle = createFakeFs();
  let counter = 0;
  const store = new FileCairnStore(STORE_PATH, handle.fs, () => `id-${(++counter).toString()}`);
  return { handle, store };
}

function select(rootPath: string, filePath: string): CairnDraft {
  return captureSelection({ rootPath, filePath, text: 'const a = 1;', startLine: 2, endLine: 2 });
}

function toInput(draft: CairnDraft): CairnInput {
  return { ...draft, comment: 'check this', severity: 'high' };
}

function readCairns(files: Map<string, string>): Cairn[] {
  return parseCairns(files.get(STORE_PATH) ?? '');
}

/** Rebuilds the absolute file path a stored cairn points at. */
function originalFile(cairn: Cairn): string {
  return path.join(cairn.rootPath, ...cairn.filePath.split('/'));
}

suite('save flow: capture -> save -> stored cairn', () => {
  test('a saved cairn recovers the absolute file it was captured from', async () => {
    const { handle, store } = setupStore();
    const root = path.resolve('/repo');
    const file = path.join(root, 'src', 'a.ts');

    const result = await handleWebviewMessage(
      { type: 'saveCairn', input: toInput(select(root, file)) },
      store,
    );

    assert.deepStrictEqual(result, { type: 'saveResult', ok: true });
    const [saved, ...rest] = readCairns(handle.files);
    assert.strictEqual(rest.length, 0);
    assert.strictEqual(saved?.rootPath, root);
    assert.strictEqual(saved.filePath, 'src/a.ts');
    assert.strictEqual(originalFile(saved), file);
  });

  test('the same relative path under two roots is saved as two distinct files', async () => {
    const { handle, store } = setupStore();
    const fileA = path.join(path.resolve('/repo-a'), 'src', 'a.ts');
    const fileB = path.join(path.resolve('/repo-b'), 'src', 'a.ts');

    await handleWebviewMessage(
      { type: 'saveCairn', input: toInput(select(path.resolve('/repo-a'), fileA)) },
      store,
    );
    await handleWebviewMessage(
      { type: 'saveCairn', input: toInput(select(path.resolve('/repo-b'), fileB)) },
      store,
    );

    const saved = readCairns(handle.files);
    assert.deepStrictEqual(
      saved.map((c) => c.filePath),
      ['src/a.ts', 'src/a.ts'],
    );
    assert.deepStrictEqual(saved.map(originalFile), [fileA, fileB]);
  });

  test('a root chosen with Change... is the root that gets saved', async () => {
    const { handle, store } = setupStore();
    const file = path.join(path.resolve('/repo'), 'src', 'a.ts');
    const draft = select(path.resolve('/repo/src'), file);
    assert.strictEqual(draft.filePath, 'a.ts');

    const change = resolveRootChange(path.resolve('/repo'), file);
    assert.ok(change.ok);
    const input = { ...toInput(draft), rootPath: change.rootPath, filePath: change.filePath };
    await handleWebviewMessage({ type: 'saveCairn', input }, store);

    const [saved] = readCairns(handle.files);
    assert.strictEqual(saved?.rootPath, path.resolve('/repo'));
    assert.strictEqual(saved.filePath, 'src/a.ts');
    assert.strictEqual(originalFile(saved), file);
  });
});
