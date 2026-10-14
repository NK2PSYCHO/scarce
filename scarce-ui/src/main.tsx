/**
 * Entry point for the Scarce webview React application. Creates the extension
 * client and renders the App component.
 *
 * @packageDocumentation
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app.tsx';
import { createExtensionClient } from '@/lib/extensionClient';
import type { VsCodeApi } from '@/lib/extensionClient';

/** Injected by VS Code into the webview global scope; may be called only once. */
declare function acquireVsCodeApi(): VsCodeApi;

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element "#root" not Found');
}

const client = createExtensionClient(acquireVsCodeApi());

createRoot(container).render(
  <StrictMode>
    <App client={client} />
  </StrictMode>,
);
