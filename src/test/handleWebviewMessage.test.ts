import * as assert from 'assert';
import { handleWebviewMessage } from '../handleWebviewMessage';
import { CorruptCairnFileError } from '../store/errors';
import type { CairnStore } from '../store/CairnStore';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';

const INPUT: CairnInput = {
  filePath: '/repo/a.ts',
  codeSnippet: 'const a = 1;',
  lineRange: [2, 2],
  comment: 'check this',
  severity: 'high',
};

interface FakeStore {
  store: CairnStore;
  calls: CairnInput[];
}

function fakeStore(failWith?: Error): FakeStore {
  const calls: CairnInput[] = [];
  const store: CairnStore = {
    add(input: CairnInput): Promise<Cairn> {
      calls.push(input);
      if (failWith) {
        return Promise.reject(failWith);
      }
      return Promise.resolve({ id: 'id-1', ...input });
    },
  };
  return { store, calls };
}

suite('handleWebviewMessage', () => {
  test('saveCairn adds once and resolves ok', async () => {
    const { store, calls } = fakeStore();
    const result = await handleWebviewMessage({ type: 'saveCairn', input: INPUT }, store);
    assert.deepStrictEqual(calls, [INPUT]);
    assert.deepStrictEqual(result, { type: 'saveResult', ok: true });
  });

  test('saveCairn resolves error when add rejects', async () => {
    const { store } = fakeStore(new Error('disk full'));
    const result = await handleWebviewMessage({ type: 'saveCairn', input: INPUT }, store);
    assert.deepStrictEqual(result, { type: 'saveResult', ok: false, error: 'disk full' });
  });

  test('saveCairn resolves error for CorruptCairnFileError', async () => {
    const { store } = fakeStore(new CorruptCairnFileError('Cairn file is not valid JSON'));
    const result = await handleWebviewMessage({ type: 'saveCairn', input: INPUT }, store);
    assert.deepStrictEqual(result, {
      type: 'saveResult',
      ok: false,
      error: 'Cairn file is not valid JSON',
    });
  });

  test('cancel resolves undefined and never touches the store', async () => {
    const { store, calls } = fakeStore();
    const result = await handleWebviewMessage({ type: 'cancel' }, store);
    assert.strictEqual(result, undefined);
    assert.strictEqual(calls.length, 0);
  });
});
