/**
 * @packageDocumentation
 * Vite build config for the scarce-ui React webview. Builds a single-file bundle
 * (`main.js` + `main.css`) that the extension host loads from the webview.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset URLs so the built bundle works when loaded inside a VS Code
  // webview (which serves it from a virtual https: origin, not a server root).
  base: './',
  resolve: {
    alias: {
      // `@` for webview sources; `@models` shares the extension's models package.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@models': fileURLToPath(new URL('../models', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // One stylesheet: the webview loads a fixed set of assets, no per-chunk CSS.
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Fixed filenames so the extension host can reference them without
        // parsing Vite's hashed output names.
        entryFileNames: 'main.js',
        assetFileNames: 'main.css',
      },
    },
  },
});
