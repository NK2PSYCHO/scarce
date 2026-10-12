export class CorruptCairnFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptCairnFileError';
  }
}
