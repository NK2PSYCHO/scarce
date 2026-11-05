# Alpha scope

Alpha is the first usable release: a **personal, local-only** cairn workflow
with complete CRUD. It exists to prove the save, view, jump, edit and delete
loop. Everything else in the [roadmap](#roadmap) comes later.

## In scope

| Area     | Behaviour                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Create   | Select code, **Add as Cairn**, fill comment and severity, Save. Path, lines and snippet are read-only. |
| Read     | Sidebar lists all saved cairns, sorted critical, high, normal. Resolved cairns sort last, muted.       |
| Navigate | Click a cairn to open its file and select its lines.                                                   |
| Update   | Edit comment and severity with the same form as add.                                                   |
| Delete   | Delete with a confirmation prompt.                                                                     |
| Resolve  | Mark a cairn resolved; reopen it later. Never removed automatically.                                   |
| Storage  | One JSON file in the extension's global storage. See [ARCHITECTURE.md](ARCHITECTURE.md).               |

## Out of scope (deliberately)

- File-open notifications and their settings (Beta).
- "Current file" / "All files" tabs and workspace scoping (Beta).
- Snippet-click-to-expand versus click-to-navigate split (Beta). Alpha cards
  keep the behaviour already implemented in the UI.
- Editing the snippet or line range (Beta).
- Drift detection: shifted, stale, renamed or deleted files (v0.1).
- Export, settings page, marketplace listing (v0.2).
- Global/team cairns, authorship, collision handling (v0.3, v0.4).

## Definition of done

Alpha is releasable when all of the following hold:

1. Every item in "In scope" works end to end in the Extension Development Host.
2. Every test in [MANUAL_TESTING.md](MANUAL_TESTING.md) marked **Alpha** passes
   on the release candidate, and its "Last verified" line is updated.
3. `pnpm check-types`, `pnpm lint`, `pnpm format:check`,
   `pnpm --filter scarce-ui test` and `pnpm test` pass locally and in CI.
4. The temporary fixture list (`TEMP-FIXTURE` markers) is removed.
5. `CHANGELOG.md` is up to date and the release steps in
   [RELEASING.md](RELEASING.md) are done.

## Roadmap

| Release | Theme                                                |
| ------- | ---------------------------------------------------- |
| Alpha   | Personal local CRUD (this document)                  |
| Beta    | Scoped sidebar, notifications, click-behaviour split |
| v0.1    | Drift detection (shifted, stale, renamed, deleted)   |
| v0.2    | Export, settings, marketplace polish                 |
| v0.3    | Global (team) cairns, phase 1                        |
| v0.4    | Team collision handling and ownership                |
| v1.0    | Stability pass, merge-conflict behaviour, full docs  |
