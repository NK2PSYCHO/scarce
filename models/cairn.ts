/**
 * @packageDocumentation
 * Core domain model for Cairns: severity tiers and the persisted Cairn shape.
 */

/**
 * Severity tiers for Cairns, affecting sorting behavior and user notifications.
 *
 * - `normal`: Standard behavior. Added to the file's Cairn list with no special
 *   sorting or notifications.
 * - `high`: Added to the file's Cairn list and sorted above normal Cairns.
 *   Triggers a one-time-per-session toast notification when the file is opened,
 *   warning that the file contains a high-severity Cairn and displaying the
 *   counts of high and normal Cairns.
 * - `critical`: Added to the file's Cairn list and sorted above both high and
 *   normal Cairns. Triggers a one-time-per-session modal warning when the file
 *   is opened, warning that the file contains a critical Cairn and displaying
 *   the counts of critical, high, and normal Cairns.
 */
export type CairnSeverity = 'normal' | 'high' | 'critical';

/**
 * Represents a flagged code snippet (Cairn) with associated metadata,
 * location, and severity.
 */
export interface Cairn {
  /**
   * Auto-generated unique identifier for the Cairn.
   */
  id: string;

  /**
   * Path to the file containing the Cairn, relative to the root folder it was
   * saved under, with forward slashes.
   */
  filePath: string;

  /**
   * Exact text snippet selected when the Cairn was created.
   */
  codeSnippet: string;

  /**
   * Line range [start, end] of the code snippet in the file (0-indexed).
   */
  lineRange: [number, number];

  /**
   * User-provided notes explaining why the code snippet was flagged.
   */
  comment: string;

  /**
   * Assigned severity level determining sorting and notification behavior.
   */
  severity: CairnSeverity;
}
