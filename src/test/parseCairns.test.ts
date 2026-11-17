/**
 * @packageDocumentation
 * Unit tests for `parseCairns`: tolerance of records written before `resolved`
 * existed, preservation of unknown fields, and rejection of malformed records.
 */
import * as assert from 'assert';
import { parseCairns } from '../store/parseCairns';
import { CorruptCairnFileError } from '../store/errors';

const record = {
  id: 'a',
  rootPath: '/repo',
  filePath: 'src/a.ts',
  codeSnippet: 'x',
  lineRange: [0, 1],
  comment: 'c',
  severity: 'normal',
};

function file(...cairns: unknown[]): string {
  return JSON.stringify({ version: 1, cairns });
}

suite('parseCairns', () => {
  test('accepts an empty list', () => {
    assert.deepStrictEqual(parseCairns(file()), []);
  });

  test('accepts an old record with no resolved fields and does not add them', () => {
    const [parsed] = parseCairns(file(record));
    assert.deepStrictEqual(parsed, record);
    assert.ok(parsed && !('resolved' in parsed));
  });

  test('keeps resolved and resolvedAt', () => {
    const resolved = { ...record, resolved: true, resolvedAt: '2026-01-02T03:04:05.000Z' };
    assert.deepStrictEqual(parseCairns(file(resolved)), [resolved]);
  });

  test('keeps unknown fields so a rewrite loses nothing', () => {
    const extra = { ...record, futureField: 42 };
    assert.deepStrictEqual(parseCairns(file(extra)), [extra]);
  });

  const malformed: Record<string, unknown> = {
    'a non-object record': 'nope',
    'a null record': null,
    'an array record': [],
    'a missing id': { ...record, id: undefined },
    'a non-string rootPath': { ...record, rootPath: 1 },
    'a missing comment': { ...record, comment: undefined },
    'an unknown severity': { ...record, severity: 'urgent' },
    'a lineRange of the wrong length': { ...record, lineRange: [1] },
    'a non-integer lineRange': { ...record, lineRange: [1, 'x'] },
    'a non-boolean resolved': { ...record, resolved: 'yes' },
    'a non-string resolvedAt': { ...record, resolvedAt: 5 },
  };
  for (const [name, bad] of Object.entries(malformed)) {
    test(`rejects ${name}`, () => {
      assert.throws(() => parseCairns(file(record, bad)), CorruptCairnFileError);
    });
  }

  test('names the index of the malformed record', () => {
    assert.throws(() => parseCairns(file(record, { ...record, severity: 'x' })), {
      message: /index 1/,
    });
  });
});
