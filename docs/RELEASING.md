# Releasing

Scarce follows [Semantic Versioning](https://semver.org/). Versions below
`0.1.0` are alpha. The Marketplace listing arrives in v0.2; until then,
releases are GitHub releases with an attached `.vsix`.

## Checklist

1. Confirm [ALPHA.md](ALPHA.md) "Definition of done" is met.
2. Run the full manual plan ([MANUAL_TESTING.md](MANUAL_TESTING.md)) on the
   release candidate and update every "Last verified" line.
3. Make sure CI is green on `main`.
4. In `CHANGELOG.md`, rename `[Unreleased]` to `[x.y.z] - YYYY-MM-DD`, add a
   fresh empty `[Unreleased]` above it, and update the compare links.
5. Bump `version` in `package.json` (no `v` prefix there).
6. Build the package:

   ```bash
   pnpm install --frozen-lockfile
   pnpm exec vsce package --no-dependencies
   ```

   (`vsce` is `@vscode/vsce`; install it with `pnpm add -D @vscode/vsce` if it
   is not already a dev dependency.)

7. Install the `.vsix` in a clean VS Code profile
   (**Extensions: Install from VSIX...**) and run MT-01 to MT-03 as a smoke test.
8. Commit (`chore(release): vX.Y.Z`), tag, and push:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --follow-tags
   ```

9. Create a GitHub release from the tag, mark it **pre-release** while below
   `0.1.0`, paste the changelog section, and attach the `.vsix`.
