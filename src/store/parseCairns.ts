import type { Cairn } from '../../models/cairn';
import { CorruptCairnFileError } from './errors';

export function isNotFound(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

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
