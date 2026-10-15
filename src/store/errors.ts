/**
 * @packageDocumentation
 * Errors thrown by the cairn store.
 */

/**
 * Thrown when the cairns file exists but is not valid JSON or has an
 * unexpected shape.
 */
export class CorruptCairnFileError extends Error {
  /**
   * @param message - Description of what is wrong with the file.
   */
  constructor(message: string) {
    super(message);
    this.name = 'CorruptCairnFileError';
  }
}
