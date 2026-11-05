# Manual test plan

Automated tests (Vitest for the UI, `pnpm test` for the extension host) cover
logic. This plan covers what only a human sees: theme, layout, flow, and real
files.

## How to use

1. Prepare: `pnpm install && pnpm build:ui`.
2. Open the repo in VS Code and press **F5** (Extension Development Host).
3. In the new window, open a scratch folder containing at least two text files
   with several lines of code each.
4. Follow each test's steps exactly. Report failures as
   "fails MT-05 step 3" with the observed result.

**Reset between runs:** run `Developer: Open Extension Logs Folder`, or delete
`cairns.json` from the extension's global storage folder (the Extension Host
profile directory under `globalStorage/nk2psycho.scarce/`).

After a release candidate passes, update every "Last verified" line.

## Tests

### MT-01: Sidebar opens with an empty state (Alpha)

Preconditions: fresh storage (no `cairns.json`).
Steps:

1. Click the Scarce icon in the activity bar.

Expected: the sidebar shows the empty message ("No cairns yet...") and no
fixture/sample cairns.
Last verified: not yet verified

### MT-02: Add form shows captured context (Alpha)

Preconditions: a file open with lines 3 to 5 selected.
Steps:

1. Right-click the selection and choose **Add as Cairn**.

Expected: the sidebar replaces the list with the form. Root, file path
(relative, forward slashes), and the snippet with "(3 - 5)" are shown
read-only. Comment is empty and severity is Normal. Save and Cancel are shown.
Last verified: not yet verified

### MT-03: Add and save a cairn (Alpha)

Preconditions: MT-02 form open.
Steps:

1. Type a comment.
2. Choose severity High.
3. Click Save.

Expected: the form closes, the list returns, and the new cairn appears with
its file, "Lines 3-5", High badge, comment, and snippet.
Last verified: not yet verified

### MT-04: Comment is required (Alpha)

Preconditions: add form open.
Steps:

1. Leave the comment empty, or type only spaces, and click Save.

Expected: "Comment is required" appears; nothing is saved; the form stays open.
Last verified: not yet verified

### MT-05: Cancel discards the draft (Alpha)

Preconditions: add form open, some text typed.
Steps:

1. Click Cancel.

Expected: the list returns; no cairn was added.
Last verified: not yet verified

### MT-06: Empty selection is rejected (Alpha)

Preconditions: a file open, nothing selected (or whitespace only).
Steps:

1. Run **Add as Cairn**.

Expected: an error message says to select some code; the sidebar does not
change.
Last verified: not yet verified

### MT-07: Change root (Alpha)

Preconditions: add form open for a file in a subfolder.
Steps:

1. Click **Change...** and pick a parent folder that contains the file.
2. Click **Change...** again and pick a folder that does NOT contain the file.

Expected: step 1 updates root and relative path without clearing the comment.
Step 2 shows an error and keeps the previous root. Remembered root is reused
for the next cairn in the same workspace folder.
Last verified: not yet verified

### MT-08: Severity ordering (Alpha)

Preconditions: save one Normal, one Critical, and one High cairn (in that order).
Steps:

1. Look at the list.

Expected: order is Critical, High, Normal.
Last verified: not yet verified

### MT-09: Navigate to a cairn (Alpha)

Preconditions: a cairn exists for a file that is currently closed.
Steps:

1. Click the cairn card.

Expected: the file opens and exactly the cairn's lines are selected and
revealed. Repeat with the file name button via keyboard (Tab, then Enter).
Last verified: not yet verified

### MT-10: Navigate to a missing file (Alpha)

Preconditions: a cairn exists; then delete or rename its file on disk.
Steps:

1. Click the cairn.

Expected: an error message appears; the cairn is still in the list and
unchanged; no crash.
Last verified: not yet verified

### MT-11: Edit a cairn (Alpha)

Preconditions: at least one cairn exists.
Steps:

1. Click **Edit** on a cairn.
2. Confirm file path, lines, and snippet are shown read-only and comment/severity
   are pre-filled.
3. Change the comment and severity, then Save.

Expected: the list returns showing the new comment and severity, re-sorted if
severity changed. Cancel in step 3 leaves the cairn unchanged.
Last verified: not yet verified

### MT-12: Delete a cairn (Alpha)

Preconditions: at least two cairns exist.
Steps:

1. Click **Delete** on one cairn.
2. Dismiss the confirmation (Cancel).
3. Click **Delete** again and confirm.

Expected: step 2 changes nothing. Step 3 removes only that cairn.
Last verified: not yet verified

### MT-13: Resolve and reopen (Alpha)

Preconditions: at least two cairns exist.
Steps:

1. Click **Resolve** on the top cairn.
2. Click **Reopen** on it.

Expected: after step 1 the cairn is muted and sorted below unresolved cairns
and is NOT deleted. After step 2 it returns to its severity position.
Last verified: not yet verified

### MT-14: Persistence across reloads (Alpha)

Preconditions: several cairns exist, including a resolved one.
Steps:

1. Run **Developer: Reload Window** in the Extension Development Host.
2. Open the Scarce sidebar.

Expected: all cairns, comments, severities and resolved state are intact.
Last verified: not yet verified

### MT-15: Corrupt storage file (Alpha)

Preconditions: stop the extension, then replace the contents of `cairns.json`
with `not json`.
Steps:

1. Start the extension and open the sidebar.
2. Try to add a cairn.

Expected: a clear error is shown; the corrupt file is NOT overwritten (verify its
contents are still `not json`); the extension stays usable once the file is fixed.
Last verified: not yet verified

### MT-16: Narrow sidebar and themes (Alpha)

Preconditions: several cairns including a very long file path and long comment.
Steps:

1. Drag the sidebar to its minimum width.
2. Switch to a light theme, a dark theme, and a high-contrast theme.

Expected: no horizontal scrolling of the page, long paths truncate or wrap
inside the card, buttons remain reachable, text is legible in every theme.
Last verified: not yet verified

### MT-17: Sidebar hidden and shown mid-form (Alpha)

Preconditions: add form open with text typed.
Steps:

1. Switch to the Explorer view, then back to Scarce.

Expected: the form and typed text are still there (the view retains context).
Last verified: not yet verified
