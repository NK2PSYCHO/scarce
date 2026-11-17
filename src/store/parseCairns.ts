/**
 * @packageDocumentation
 * Parsing and validation of the persisted cairns file.
 */

import type { Cairn } from '../../models/cairn';
import { CorruptCairnFileError } from './errors';

const SEVERITIES: readonly unknown[] = ['normal', 'high', 'critical'];

/**
 * Checks if an error represents a "file not found" condition (ENOENT).
 *
 * @param error - The error to check.
 * @returns `true` if the error is ENOENT, otherwise `false`.
 */
export function isNotFound(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Checks that a value is a well-formed Cairn record. `resolved` and
 * `resolvedAt` are optional so records written before resolve existed pass.
 * Unknown extra fields are allowed.
 *
 * @param value - One element of the `cairns` array.
 * @returns `true` if the value has every required field with the right type.
 */
function isCairn(value: unknown): value is Cairn {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const r = value as Record<string, unknown>;
  const { lineRange } = r;
  return (
    typeof r.id === 'string' &&
    typeof r.rootPath === 'string' &&
    typeof r.filePath === 'string' &&
    typeof r.codeSnippet === 'string' &&
    typeof r.comment === 'string' &&
    SEVERITIES.includes(r.severity) &&
    Array.isArray(lineRange) &&
    lineRange.length === 2 &&
    lineRange.every((n) => Number.isInteger(n)) &&
    (r.resolved === undefined || typeof r.resolved === 'boolean') &&
    (r.resolvedAt === undefined || typeof r.resolvedAt === 'string')
  );
}

/**
 * Parses the cairns.json file contents into an array of cairns. Validates
 * the JSON structure, the version number and every record. Records are
 * returned as stored (unknown fields kept), so a later rewrite loses nothing.
 *
 * @param raw - The raw JSON string from the cairns file.
 * @returns Array of parsed cairns.
 * @throws CorruptCairnFileError if the file is not valid JSON, has an
 *   unexpected shape, or contains a malformed record.
 */
export function parseCairns(raw: string): Cairn[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorruptCairnFileError('Cairn file is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new CorruptCairnFileError('Cairn file has an unexpected shape');
  }
  const { version, cairns } = parsed as { version?: unknown; cairns?: unknown };
  if (version !== 1 || !Array.isArray(cairns)) {
    throw new CorruptCairnFileError('Cairn file has an unexpected shape');
  }
  const bad = (cairns as unknown[]).findIndex((c) => !isCairn(c));
  if (bad !== -1) {
    throw new CorruptCairnFileError(`Cairn file has a malformed record at index ${String(bad)}`);
  }
  return cairns as Cairn[];
}
