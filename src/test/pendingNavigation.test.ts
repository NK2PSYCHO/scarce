/**
 * @packageDocumentation
 * Tests for the pending-navigation handoff: write, consume, expiry and the
 * "not my repo" case.
 */
import * as assert from 'assert';
import {
  consumePendingNavigation,
  PENDING_NAVIGATION_TTL_MS,
  writePending,
  type ConsumeDeps,
  type PendingStore,
} from '../pendingNavigation';
import type { Cairn } from '../../models/cairn';

const CAIRN: Cairn = {
  id: 'c1',
  rootPath: '/repo',
  filePath: 'a.ts',
  codeSnippet: 'x',
  lineRange: [1, 2],
  comment: 'c',
  severity: 'normal',
};

function memory(initial?: unknown): { store: PendingStore; value: () => unknown } {
  let v = initial;
  return {
    store: {
      get: () => v,
      set: (x) => {
        v = x;
        return Promise.resolve();
      },
    },
    value: () => v,
  };
}

function setup(raw: unknown, folders: string[], cairns: Cairn[] = [CAIRN], now = 1000) {
  const mem = memory(raw);
  const navigated: Cairn[] = [];
  const deps: ConsumeDeps = {
    pending: mem.store,
    listCairns: () => Promise.resolve(cairns),
    workspaceFolders: () => folders,
    now: () => now,
    navigate: (c) => {
      navigated.push(c);
      return Promise.resolve(true);
    },
  };
  return { deps, navigated, value: mem.value };
}

suite('pendingNavigation', () => {
  test('writePending stores the id and the time', async () => {
    const mem = memory();
    await writePending(mem.store, 'c1', 42);
    assert.deepStrictEqual(mem.value(), { id: 'c1', at: 42 });
  });

  test('navigates and clears when the cairn is inside an open folder', async () => {
    const { deps, navigated, value } = setup({ id: 'c1', at: 900 }, ['/repo']);
    assert.strictEqual(await consumePendingNavigation(deps), true);
    assert.deepStrictEqual(navigated, [CAIRN]);
    assert.strictEqual(value(), undefined);
  });

  test('does nothing when nothing is pending', async () => {
    const { deps, navigated } = setup(undefined, ['/repo']);
    assert.strictEqual(await consumePendingNavigation(deps), false);
    assert.deepStrictEqual(navigated, []);
  });

  test('clears an expired record without navigating', async () => {
    const { deps, navigated, value } = setup(
      { id: 'c1', at: 0 },
      ['/repo'],
      [CAIRN],
      PENDING_NAVIGATION_TTL_MS + 1,
    );
    assert.strictEqual(await consumePendingNavigation(deps), false);
    assert.deepStrictEqual(navigated, []);
    assert.strictEqual(value(), undefined);
  });

  test('clears a record for a cairn that no longer exists', async () => {
    const { deps, navigated, value } = setup({ id: 'gone', at: 900 }, ['/repo']);
    assert.strictEqual(await consumePendingNavigation(deps), false);
    assert.deepStrictEqual(navigated, []);
    assert.strictEqual(value(), undefined);
  });

  test('clears a malformed record', async () => {
    const { deps, value } = setup({ id: 5 }, ['/repo']);
    assert.strictEqual(await consumePendingNavigation(deps), false);
    assert.strictEqual(value(), undefined);
  });

  test('leaves the record for another window when the repo is not open here', async () => {
    for (const folders of [[], ['/other']]) {
      const { deps, navigated, value } = setup({ id: 'c1', at: 900 }, folders);
      assert.strictEqual(await consumePendingNavigation(deps), false);
      assert.deepStrictEqual(navigated, []);
      assert.deepStrictEqual(value(), { id: 'c1', at: 900 });
    }
  });
});
