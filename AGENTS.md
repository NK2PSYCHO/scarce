# Scarce: agent rules

Scarce is a VS Code extension for context-based notes called "cairns". The root is the extension (esbuild). `scarce-ui` is the React 19 + Vite 8 + Tailwind v4 webview UI. Shared types live in `models/`.

## Working style

- Work alone and sequentially. No sub-agents, no todo lists or plans, one tool call per turn.
- Read a file before editing it. Make the smallest change that satisfies the task. No refactors or renames that were not asked for.
- If a command fails or an instruction conflicts with the repo, stop and report exactly what happened. Do not work around it.
- Do not commit, push, or install anything unless the task says so.
- Paste the raw output of every verify command, then stop.

## Conventions

- TypeScript 6: never use `baseUrl`; use `paths` only. `@/*` maps to `scarce-ui/src/*` and `@models/*` maps to `models/*`.
- `scarce-ui/tsconfig.json` is solution-style: keep `"files": []`.
- `tsc -b` can leave `scarce-ui/tsconfig.tsbuildinfo` as debris. Never commit it, and always commit by explicit path.
- ESLint `restrict-template-expressions` is on: call `.toString()` on objects such as `Uri` inside template strings.
- Do not edit `scarce-ui/src/components/ui` (shadcn generated). Use our wrapper components in `scarce-ui/src/components`.
- `scarce-ui/vite.config.ts` names every emitted asset `main.css`. Do not emit fonts or other assets; `dist` must contain only `main.js` and `main.css`.
- Colors come from `--vscode-*` variables so the UI follows the user's VS Code theme.
- A husky pre-commit hook runs eslint and prettier on staged files.
