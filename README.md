# Scarce

Context-based to-do and notes for VS Code. Attach a comment to a piece of code
(a **cairn**) and find it again later, right where it matters.

> **Status:** Alpha (`0.0.x`). Personal, local-only cairns. See the
> [changelog](CHANGELOG.md) and the [alpha scope](docs/ALPHA.md).

## Features (alpha)

- Select code and run **Add as Cairn** from the editor context menu.
- Cairns carry a comment, a severity (`normal`, `high`, `critical`), the file
  path, and the line range.
- Browse, edit, resolve, delete, and jump to your cairns from the sidebar.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22
- [pnpm](https://pnpm.io/) (the exact version is pinned in `package.json`
  under `packageManager`; use [Corepack](https://nodejs.org/api/corepack.html):
  `corepack enable`)
- VS Code `^1.134.0`
- Git

### Setup

```bash
git clone https://github.com/NK2PSYCHO/scarce.git
cd scarce
pnpm install
```

### Run locally

1. Build the webview UI: `pnpm build:ui`
2. Open the repo in VS Code and press **F5** to launch the Extension
   Development Host.
3. In the new window, open a folder, select some code, right-click, and choose
   **Add as Cairn**. Open the Scarce icon in the activity bar to see the sidebar.

For a rebuild-on-save loop, run `pnpm watch` (extension bundle and type-check)
and `pnpm watch:ui` (webview) in separate terminals, then reload the
Extension Development Host (**Developer: Reload Window**) after changes.

### Test

| What                              | Command                                                 |
| --------------------------------- | ------------------------------------------------------- |
| Type-check (extension + UI)       | `pnpm check-types`                                      |
| Lint                              | `pnpm lint`                                             |
| Formatting                        | `pnpm format:check` (fix with `pnpm format`)            |
| UI unit tests (Vitest)            | `pnpm --filter scarce-ui test`                          |
| Extension tests (VS Code host)    | `pnpm test`                                             |
| Manual checks (theme, layout, UX) | follow [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md) |

`pnpm test` downloads and launches a real VS Code instance. On Linux without a
display, run it under `xvfb-run -a pnpm test`.

**WSL without a login session:** if `pnpm test` fails with
`listen EACCES ... /run/user/<uid>/vscode-...sock`, `/run/user/<uid>` does not
exist. Either enable lingering (requires systemd enabled in `/etc/wsl.conf`):

```bash
sudo loginctl enable-linger "$USER"
```

or do a one-off run with a private runtime dir:

```bash
mkdir -p ~/.xdg-runtime && chmod 700 ~/.xdg-runtime
XDG_RUNTIME_DIR="$HOME/.xdg-runtime" pnpm test
```

Contributing? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
