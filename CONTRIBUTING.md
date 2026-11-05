# Contributing to Scarce

Thanks for your interest. This guide covers how to set up, what we expect in a
pull request, and how to test.

## Getting started

Follow the **Development** section of the [README](README.md) to install,
run, and test locally. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before
changing the data model or the message protocol.

## Workflow

1. Open an issue first for anything beyond a small fix, so the approach can be
   agreed before you write code.
2. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, or
   `chore/<topic>`.
3. Keep pull requests small and focused on one concern.
4. Add or update tests, and the manual test plan if behaviour a human sees
   changes.
5. Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`.
6. Open a pull request against `main` and fill in the template.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`. Use the
imperative mood and keep the subject under 72 characters, for example:
`feat(store): add update and delete`.

## Code standards

- TypeScript is strict; do not use `any` or disable lint rules without a
  comment explaining why.
- Exported symbols have TSDoc comments (enforced by `eslint-plugin-tsdoc`).
- Keep VS Code API usage at the edges (`extension.ts`, `sidebarProvider.ts`) and
  logic in plain functions that can be tested without the editor.
- Types shared by the extension and UI go in `models/`; never duplicate them.
- Formatting is Prettier and linting is ESLint. A pre-commit hook (Husky and
  lint-staged) runs both on staged files.

## Testing

Before opening a pull request, all of these must pass:

```bash
pnpm check-types
pnpm lint
pnpm format:check
pnpm --filter scarce-ui test
pnpm test
```

Manual tests live in [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md). Each test
has an ID, preconditions, numbered steps, and an expected result. When you
change behaviour covered by a test, update it and its "Last verified" line.
Cite failures as "fails MT-05 step 3" in bug reports.

## Reporting bugs and requesting features

Use the issue templates. For security problems, do **not** open a public issue;
see [SECURITY.md](SECURITY.md).

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
