#!/usr/bin/env node
import { serve } from '@hono/node-server';
import { assertPrefabLiveFrameSetupComplete } from '@pixopen/core';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createApp } from './app.js';
import { ensureDataDirs } from './storage.js';
import { registerPreviewClient } from './runtime.js';

const PORT = Number(process.env.PORT ?? 3847);
const VITE_DEV_URL = process.env.PIXOPEN_VITE_URL ?? 'http://localhost:5173';
/** When set (by root `npm run dev`), send browsers to Vite so studio UI stays in sync with source. */
const preferViteUi = process.env.PIXOPEN_DEV_UI === '1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  assertPrefabLiveFrameSetupComplete();
  await ensureDataDirs();
  const webDist = path.resolve(__dirname, '../../web/dist');
  const hasWebUi = existsSync(webDist);
  const app = createApp({
    webDist: hasWebUi ? webDist : undefined,
    viteDevUrl: preferViteUi ? VITE_DEV_URL : undefined,
  });
  const server = serve({ fetch: app.fetch, port: PORT });

  const httpServer = server as unknown as ReturnType<typeof createServer>;
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  wss.on('connection', (ws) => registerPreviewClient(ws));

  const uiLine = preferViteUi
    ? `${VITE_DEV_URL}  (Vite — use this while developing)`
    : hasWebUi
      ? `http://localhost:${PORT}`
      : `not built — run "npm run build -w @pixopen/web" then restart`;
  console.log(`
  Pixopen server running
  ----------------------
  API:     http://localhost:${PORT}/api/health
  Web UI:  ${uiLine}
  ${preferViteUi ? `Static:  http://localhost:${PORT} redirects to Vite\n` : ''}`.trimEnd() + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
