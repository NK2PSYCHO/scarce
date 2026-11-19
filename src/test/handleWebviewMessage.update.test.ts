/**
 * @packageDocumentation
 * Tests for the `updateCairn` branch of `handleWebviewMessage`.
 */
import * as assert from 'assert';
import { handleWebviewMessage } from '../handleWebviewMessage';
import { CairnNotFoundError } from '../store/errors';
import type { CairnPatch, CairnStore } from '../store/cairnStore';
import type { Cairn } from '../../models/cairn';

function fakeStore(failWith?: Error) {
  const calls: { id: string; patch: CairnPatch }[] = [];
  const store: CairnStore = {
    list: () => Promise.resolve([]),
    add: () => Promise.reject(new Error('not used')),
    update(id, patch) {
      calls.push({ id, patch });
      return failWith ? Promise.reject(failWith) : Promise.resolve({ id } as Cairn);
    },
  };
  return { store, calls };
}

suite('handleWebviewMessage updateCairn', () => {
  test('patches only comment and severity and reports ok', async () => {
    const { store, calls } = fakeStore();
    const message = {
      type: 'updateCairn' as const,
      id: 'c1',
      update: { comment: 'new', severity: 'high' as const, rootPath: '/evil' },
    };
    const result = await handleWebviewMessage(message, store);
    assert.deepStrictEqual(result, { type: 'saveResult', ok: true });
    assert.deepStrictEqual(calls, [{ id: 'c1', patch: { comment: 'new', severity: 'high' } }]);
  });

  test('reports a not-found error instead of throwing', async () => {
    const { store } = fakeStore(new CairnNotFoundError('c1'));
    const result = await handleWebviewMessage(
      { type: 'updateCairn', id: 'c1', update: { comment: 'x', severity: 'normal' } },
      store,
    );
    assert.strictEqual(result?.ok, false);
  });
});
