/**
 * @packageDocumentation
 * Vitest setup for scarce-ui webview tests (shared extension host / webview layer
 * boundary: this file runs only in the webview test environment). Registers jest-dom
 * matchers, unmounts React trees between tests, and stubs DOM APIs jsdom lacks.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered components after every test so DOM state never leaks between them.
afterEach(() => {
  cleanup();
});

// jsdom does not implement pointer capture or programmatic scrolling; Radix-based
// components call these during open/focus behaviour, so stub them as no-ops.
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.scrollIntoView = () => undefined;
