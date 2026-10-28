/**
 * @packageDocumentation
 * Per-workspace-folder memory of the root chosen with Change...
 */

/**
 * Interface for managing root memory.
 */
export interface RootMemory {
  /**
   * Gets the root for a workspace folder.
   *
   * @param workspaceFolder - The workspace folder to get the root for.
   * @returns The root for the workspace folder, or undefined if not set.
   */
  get(workspaceFolder: string): string | undefined;

  /**
   * Sets the root for a workspace folder.
   *
   * @param workspaceFolder - The workspace folder to set the root for.
   * @param root - The root to set.
   */
  set(workspaceFolder: string, root: string): PromiseLike<void>;
}
