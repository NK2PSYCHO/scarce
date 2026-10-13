import type { Cairn } from '../../models/cairn';
import { CorruptCairnFileError } from './errors';

/**
 * Checks if an error represents a "file not found" condition (ENOENT).
 *
 * @param error - The error to check.
 * @returns true if the error is ENOENT, false otherwise.
 */
export function isNotFound(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Parses the cairns.json file contents into an array of cairns. Validates
 * the JSON structure and version number.
 *
 * @param raw - The raw JSON string from the cairns file.
 * @returns Array of parsed cairns.
 * @throws {CorruptCairnFileError} If the file is not valid JSON or has an
 *   unexpected shape.
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
  return cairns as Cairn[];
}
