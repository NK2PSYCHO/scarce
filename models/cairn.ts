/**

* Severity tiers for Cairns, affecting sorting behavior and user notifications.
*
* * `normal`: Standard behavior. Added to the file's Cairn list with no special
* sorting or notifications.
* * `high`: Added to the file's Cairn list and sorted above normal Cairns.
* Triggers a one-time-per-session toast notification when the file is opened,
* warning that the file contains a high-severity Cairn and displaying the
* counts of high and normal Cairns.
* * `critical`: Added to the file's Cairn list and sorted above both high and
* normal Cairns. Triggers a one-time-per-session modal warning when the file
* is opened, warning that the file contains a critical Cairn and displaying
* the counts of critical, high, and normal Cairns.
  */
export type CairnSeverity = "normal" | "high" | "critical";

/**

* Represents a flagged code snippet (Cairn) with associated metadata,
* location, and severity.
*
* @property id - Auto-generated unique identifier for the Cairn.
* @property filePath - Absolute path to the file containing the Cairn.
* @property codeSnippet - Exact text snippet selected when the Cairn was created.
* @property lineRange - Line range [start, end] of the code snippet in the file (0-indexed).
* @property comment - User-provided notes explaining why the code snippet was flagged.
* @property severity - Assigned severity level determining sorting and notification behavior.
  */
export interface Cairn {
  id: string;
  filePath: string;
  codeSnippet: string;
  lineRange: [number, number];
  comment: string;
  severity: CairnSeverity;
}
