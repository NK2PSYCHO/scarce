import * as path from 'path';
import type { Cairn } from '../../models/cairn';
import type { CairnInput } from '../../models/messages';

export interface CairnFs {
  mkdir(dir: string): Promise<unknown>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<unknown>;
  rename(from: string, to: string): Promise<unknown>;
}

export interface CairnStore {
  add(input: CairnInput): Promise<Cairn>;
}

export class CorruptCairnFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptCairnFileError';
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function parseCairns(raw: string): Cairn[] {
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

export class FileCairnStore implements CairnStore {
  constructor(
    private readonly storePath: string,
    private readonly fs: CairnFs,
    private readonly generateId: () => string,
  ) {}

  async add(input: CairnInput): Promise<Cairn> {
    await this.fs.mkdir(path.dirname(this.storePath));

    let cairns: Cairn[] = [];
    try {
      cairns = parseCairns(await this.fs.readFile(this.storePath));
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    const saved: Cairn = { id: this.generateId(), ...input };
    const tmpPath = `${this.storePath}.tmp`;
    const data = JSON.stringify({ version: 1, cairns: [...cairns, saved] }, null, 2);
    await this.fs.writeFile(tmpPath, data);
    await this.fs.rename(tmpPath, this.storePath);
    return saved;
  }
}
