import type { CairnFs } from '../../store/CairnStore';

export interface FakeOptions {
  files?: Record<string, string>;
  readError?: Error;
  renameError?: Error;
}

export interface FakeFsHandle {
  fs: CairnFs;
  files: Map<string, string>;
  ops: string[];
}

export function fsError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

export function createFakeFs(options: FakeOptions = {}): FakeFsHandle {
  const files = new Map<string, string>(Object.entries(options.files ?? {}));
  const ops: string[] = [];
  const fs: CairnFs = {
    mkdir: (dir) => {
      ops.push(`mkdir ${dir}`);
      return Promise.resolve();
    },
    readFile: (path) => {
      ops.push(`read ${path}`);
      if (options.readError) {
        return Promise.reject(options.readError);
      }
      const data = files.get(path);
      return data === undefined ? Promise.reject(fsError('ENOENT')) : Promise.resolve(data);
    },
    writeFile: (path, data) => {
      ops.push(`write ${path}`);
      files.set(path, data);
      return Promise.resolve();
    },
    rename: (from, to) => {
      ops.push(`rename ${from} -> ${to}`);
      if (options.renameError) {
        return Promise.reject(options.renameError);
      }
      const data = files.get(from);
      if (data === undefined) {
        return Promise.reject(fsError('ENOENT'));
      }
      files.delete(from);
      files.set(to, data);
      return Promise.resolve();
    },
  };
  return { fs, files, ops };
}
