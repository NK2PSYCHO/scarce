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

/**
 * Thrown when an update targets a Cairn id that is not in the store, for
 * example because it was deleted from another window.
 */
export class CairnNotFoundError extends Error {
  /**
   * @param id - The id that was not found.
   */
  constructor(id: string) {
    super(`Cairn ${id} was not found. It may have been deleted.`);
    this.name = 'CairnNotFoundError';
  }
}
