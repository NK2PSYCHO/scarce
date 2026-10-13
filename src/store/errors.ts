/**
 * Error thrown when the cairns.json file exists but cannot be parsed.
 *
 * @param message - The error message describing the corruption.
 */
export class CorruptCairnFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptCairnFileError';
  }
}
