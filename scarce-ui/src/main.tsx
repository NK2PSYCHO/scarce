import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app.tsx';
import { createExtensionClient } from '@/lib/extensionClient';
import type { VsCodeApi } from '@/lib/extensionClient';

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
