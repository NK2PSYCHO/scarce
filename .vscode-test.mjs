/**
 * @packageDocumentation
 * VS Code extension test runner configuration (@vscode/test-cli).
 * Points the runner at the compiled test files produced by `compile-tests`,
 * covering both the extension host tests (`out/src/test`) and the model tests
 * (`out/models`).
 */
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  // Glob over compiled CommonJS output; both dirs share one runner invocation.
  files: ['out/src/test/**/*.test.js', 'out/models/**/*.test.js'],
});
