/**
 * @packageDocumentation
 * Vitest config for the scarce-ui webview tests. Reuses the Vite config (for the
 * `@`/`@models` aliases and JSX handling) and runs tests in jsdom.
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // DOM environment: components are rendered with @testing-library/react.
      environment: 'jsdom',
      // Shared per-file setup (jest-dom matchers, cleanup, DOM API stubs).
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
);
