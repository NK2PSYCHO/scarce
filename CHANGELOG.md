# Changelog

All notable changes to the "scarce" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions below `0.1.0` are alpha: behaviour and the stored data format may
change without notice.

## [Unreleased]

### Added

- Add as Cairn: capture the selected code, file path (relative to a chosen
  root), and line range from the editor context menu.
- Sidebar webview (React) with an add form, severity (`normal`, `high`,
  `critical`) and a required comment.
- Change the root folder a cairn's path is relative to; remembered per
  workspace folder.
- Local persistence of cairns as JSON in the extension's global storage, with
  atomic writes.
- Cairn list in the sidebar, sorted by severity.
- Click a cairn to jump to its file and lines.
- Edit a cairn's comment and severity using the same form as add.
- Delete a cairn (with confirmation).
- Resolve and reopen a cairn.
- Manual test plan (`docs/MANUAL_TESTING.md`), architecture notes, and
  contributor documentation.

[Unreleased]: https://github.com/NK2PSYCHO/scarce/compare/HEAD
