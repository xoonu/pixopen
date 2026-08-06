import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import {
  APP_TEMPLATES,
  createProject,
  createProjectFromTemplate,
  defaultProjectName,
  generateUniqueProjectName,
  getAppTemplate,
  isProjectNameAvailable,
  migrateProjectType,
  normalizeProjectName,
  normalizeProject,
  type ProjectType,
} from '@pixopen/core';
import {
  checkDevice,
  discoverDevices,
  formatPixooError,
  pushAnimation,
  pushFrame,
  pushTestPattern,
  proxyCommand,
  setBrightness,
  subnetMismatchHint,
} from '@pixopen/device';
import { fetchDataSource, listDataSources } from '@pixopen/datasources';
import { WIDGETS } from '@pixopen/renderer';
import { importGif, importStillImage } from './import.js';
import { importVideo, importVideoAvailable } from './videoImport.js';
import {
  deleteProject,
  duplicateProject,
  getProject,
  listProjects,
  loadDevices,
  saveDevices,
  saveProject,
} from './storage.js';
import { getRuntimeStatus, startRuntime, stopRuntime, syncRuntimeProject } from './runtime.js';
import { fetchStockQuotes, marketDataStatus } from './marketData/quotes.js';
import { fetchWeatherSnapshot, geocodeLocation } from './weatherData/index.js';
import {
  exchangeSpotifyAuthCode,
  fetchSpotifyNowPlaying,
  saveSpotifyAppCredentials,
  saveSpotifyCredentials,
  spotifyAuthStatus,
  spotifyRedirectUri,
} from './spotifyData/index.js';
import {
  clearGeminiApiKey,
  fetchAiMuseCandidates,
  fetchAiMuseSnapshot,
  geminiAuthStatus,
  generateNanoBananaImage,
  listGeneratedImages,
  saveGeminiApiKey,
} from './aiMuse/index.js';
import { resolveLibraryFilePath } from './aiMuse/library.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { WeatherLocation, WeatherTemperatureUnit } from '@pixopen/core';

export function createApp(options?: { webDist?: string }) {
  const app = new Hono();

  app.use('/*', cors());

  app.get('/api/health', (c) => c.json({ ok: true, name: 'pixopen' }));

  app.get('/api/devices', async (c) => c.json(await loadDevices()));

  app.post('/api/devices/discover', async (c) => {
    const discovered = await discoverDevices();
    const existing = await loadDevices();
    const merged = [...existing];
    for (const d of discovered) {
      const idx = merged.findIndex((m) => m.ip === d.ip || m.id === d.id);
      if (idx >= 0) merged[idx] = { ...merged[idx], ...d, lastSeenAt: d.lastSeenAt };
      else merged.push(d);
    }
    // One row per IP; prefer the discovered device when IPs collide.
    const discoveredIds = new Set(discovered.map((d) => d.id));
    const byIp = new Map<string, (typeof merged)[number]>();
    for (const m of merged) {
      const prev = byIp.get(m.ip);
      if (!prev || (discoveredIds.has(m.id) && !discoveredIds.has(prev.id))) byIp.set(m.ip, m);
    }
    const next = [...byIp.values()];
    await saveDevices(next);
    return c.json({ devices: next, discovered });
  });

  app.post('/api/devices', async (c) => {
    const body = await c.req.json<{ name?: string; ip: string }>();
    const ip = body.ip?.trim();
    if (!ip) return c.json({ error: 'IP is required' }, 400);
    const devices = await loadDevices();
    const existingIdx = devices.findIndex((d) => d.ip === ip);
    if (existingIdx >= 0) {
      const updated = {
        ...devices[existingIdx],
        name: body.name?.trim() || devices[existingIdx].name,
        lastSeenAt: new Date().toISOString(),
      };
      devices[existingIdx] = updated;
      await saveDevices(devices);
      return c.json(updated);
    }
    const device = {
      id: crypto.randomUUID(),
      name: body.name?.trim() || 'Pixoo',
      ip,
      source: 'manual' as const,
      lastSeenAt: new Date().toISOString(),
    };
    devices.push(device);
    await saveDevices(devices);
    return c.json(device, 201);
  });

  app.delete('/api/devices', async (c) => {
    await saveDevices([]);
    return c.json({ ok: true, devices: [] as Awaited<ReturnType<typeof loadDevices>> });
  });

  app.delete('/api/devices/id/:id', async (c) => {
    const id = c.req.param('id');
    const devices = await loadDevices();
    const next = devices.filter((d) => d.id !== id);
    if (next.length === devices.length) return c.json({ error: 'Device not found' }, 404);
    await saveDevices(next);
    return c.json({ ok: true, devices: next });
  });

  app.post('/api/devices/:ip/ping', async (c) => {
    const ip = c.req.param('ip');
    const result = await checkDevice(ip);
    return c.json(result);
  });

  app.post('/api/devices/:ip/test-pattern', async (c) => {
    const ip = c.req.param('ip');
    try {
      await pushTestPattern(ip);
      return c.json({ ok: true });
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Test pattern failed';
      const mismatch = subnetMismatchHint(ip);
      const message = mismatch ? `${formatPixooError(raw, ip)} ${mismatch}` : formatPixooError(raw, ip);
      return c.json({ error: message }, 502);
    }
  });

  app.post('/api/devices/:ip/brightness', async (c) => {
    const ip = c.req.param('ip');
    const { brightness } = await c.req.json<{ brightness: number }>();
    await setBrightness(ip, brightness);
    return c.json({ ok: true });
  });

  app.post('/api/devices/:ip/command', async (c) => {
    const ip = c.req.param('ip');
    const body = await c.req.json<Record<string, unknown>>();
    const result = await proxyCommand(ip, body);
    return c.json(result);
  });

  app.get('/api/apps', (c) => c.json(APP_TEMPLATES));

  app.get('/api/import/video/status', async (c) =>
    c.json({ available: await importVideoAvailable() }),
  );

  app.get('/api/projects', async (c) => c.json(await listProjects()));

  app.post('/api/projects', async (c) => {
    const body = await c.req.json<{ name?: string; type?: ProjectType | 'animation' | 'live'; templateId?: string }>();
    const existing = await listProjects();
    const existingNames = existing.map((p) => p.name);

    let project;
    if (body.templateId) {
      const resolvedTemplateId = body.templateId === 'vesta-note' ? 'flip-note' : body.templateId;
      const template = getAppTemplate(resolvedTemplateId);
      if (!template) return c.json({ error: `Unknown app template: ${body.templateId}` }, 400);
      const name = body.name
        ? normalizeProjectName(body.name)
        : generateUniqueProjectName(existingNames, template.name);
      if (!name) return c.json({ error: 'Project name is required' }, 400);
      if (!isProjectNameAvailable(existing, name)) {
        return c.json({ error: `A project named "${name}" already exists` }, 409);
      }
      project = createProjectFromTemplate(resolvedTemplateId, name, existingNames);
    } else {
      const type = migrateProjectType(body.type ?? 'animator');
      const name = body.name
        ? normalizeProjectName(body.name)
        : defaultProjectName(type, existingNames);
      if (!name) return c.json({ error: 'Project name is required' }, 400);
      if (!isProjectNameAvailable(existing, name)) {
        return c.json({ error: `A project named "${name}" already exists` }, 409);
      }
      project = createProject(name, type);
    }

    await saveProject(project);
    return c.json(project, 201);
  });

  app.get('/api/projects/:id', async (c) => {
    const project = await getProject(c.req.param('id'));
    if (!project) return c.json({ error: 'Not found' }, 404);
    return c.json(project);
  });

  app.put('/api/projects/:id', async (c) => {
    const existing = await getProject(c.req.param('id'));
    if (!existing) return c.json({ error: 'Not found' }, 404);
    const body = await c.req.json<typeof existing>();
    const name = normalizeProjectName(body.name ?? existing.name);
    if (!name) return c.json({ error: 'Project name is required' }, 400);
    const all = await listProjects();
    if (!isProjectNameAvailable(all, name, existing.id)) {
      return c.json({ error: `A project named "${name}" already exists` }, 409);
    }
    const project = normalizeProject({
      ...existing,
      ...body,
      id: existing.id,
      name,
      updatedAt: new Date().toISOString(),
    });
    await saveProject(project);
    syncRuntimeProject(project);
    return c.json(project);
  });

  app.post('/api/projects/:id/duplicate', async (c) => {
    let requestedName: string | undefined;
    try {
      const body = await c.req.json<{ name?: string }>();
      requestedName = body.name;
    } catch {
      requestedName = undefined;
    }
    const copy = await duplicateProject(c.req.param('id'), requestedName);
    if (!copy) return c.json({ error: 'Not found' }, 404);
    return c.json(copy, 201);
  });

  app.delete('/api/projects/:id', async (c) => {
    await deleteProject(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/api/projects/:id/deploy', async (c) => {
    let deviceIp = '';
    try {
      const project = await getProject(c.req.param('id'));
      if (!project) return c.json({ error: 'Project not found' }, 404);
      ({ deviceIp } = await c.req.json<{ deviceIp: string }>());
      if (!deviceIp?.trim()) return c.json({ error: 'No Pixoo device selected' }, 400);
      if (project.type === 'live-sign') return c.json({ error: 'Use Run on Pixoo for live frames' }, 400);
      if (project.frames.length === 0) return c.json({ error: 'Project has no frames to deploy' }, 400);

      const reachable = await checkDevice(deviceIp);
      if (!reachable.ok) return c.json({ error: reachable.error }, 502);

      await stopRuntime();

      if (project.frames.length === 1) {
        await pushFrame(deviceIp, project.frames[0]);
      } else {
        await pushAnimation(deviceIp, project.frames, project.frameDurationMs);
      }
      return c.json({ ok: true });
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Deploy failed';
      const mismatch = subnetMismatchHint(deviceIp?.trim() ?? '');
      const message = mismatch
        ? `${formatPixooError(raw, deviceIp?.trim())} ${mismatch}`
        : formatPixooError(raw, deviceIp?.trim());
      return c.json({ error: message }, 502);
    }
  });

  app.post('/api/projects/:id/run', async (c) => {
    let deviceIp = '';
    try {
      const project = await getProject(c.req.param('id'));
      if (!project) return c.json({ error: 'Project not found' }, 404);
      ({ deviceIp } = await c.req.json<{ deviceIp: string }>());
      if (!deviceIp?.trim()) return c.json({ error: 'No Pixoo device selected' }, 400);

      const reachable = await checkDevice(deviceIp);
      if (!reachable.ok) return c.json({ error: reachable.error }, 502);

      await startRuntime(project, deviceIp);
      return c.json({ ok: true });
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Run failed';
      const mismatch = subnetMismatchHint(deviceIp?.trim() ?? '');
      const message = mismatch
        ? `${formatPixooError(raw, deviceIp?.trim())} ${mismatch}`
        : formatPixooError(raw, deviceIp?.trim());
      return c.json({ error: message }, 502);
    }
  });

  app.post('/api/projects/:id/stop', async (c) => {
    await stopRuntime();
    return c.json({ ok: true });
  });

  app.get('/api/runtime/status', (c) => c.json(getRuntimeStatus()));

  app.get('/api/market/status', (c) => {
    const finnhubApiKey = c.req.query('finnhubApiKey')?.trim() || undefined;
    return c.json(marketDataStatus(finnhubApiKey));
  });

  app.post('/api/market/quotes', async (c) => {
    const body = await c.req.json<{ symbols?: string[]; period?: string; finnhubApiKey?: string }>();
    const symbols = Array.isArray(body.symbols) ? body.symbols : [];
    const finnhubApiKey = typeof body.finnhubApiKey === 'string' ? body.finnhubApiKey.trim() : undefined;
    const periodRaw = String(body.period ?? '1d');
    const period =
      periodRaw === '1w' || periodRaw === '1m' || periodRaw === 'ytd' ? periodRaw : ('1d' as const);
    if (symbols.length === 0) return c.json({ quotes: [], ...marketDataStatus(finnhubApiKey), errors: [] });
    try {
      const result = await fetchStockQuotes(symbols, period, finnhubApiKey);
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Quote fetch failed';
      return c.json({ error: message }, 502);
    }
  });

  app.get('/api/weather/geocode', async (c) => {
    const q = c.req.query('q')?.trim() ?? '';
    const countRaw = Number(c.req.query('count') ?? 8);
    const count = Number.isFinite(countRaw) ? countRaw : 8;
    if (q.length < 2) return c.json({ results: [] });
    try {
      const results = await geocodeLocation(q, count);
      return c.json({ results });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Geocoding failed';
      return c.json({ error: message }, 502);
    }
  });

  app.post('/api/weather/snapshot', async (c) => {
    const body = await c.req.json<{ location?: WeatherLocation; temperatureUnit?: string }>();
    const loc = body.location;
    if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon) || !loc.name?.trim()) {
      return c.json({ error: 'Valid location required' }, 400);
    }
    const unitRaw = String(body.temperatureUnit ?? 'fahrenheit');
    const temperatureUnit: WeatherTemperatureUnit = unitRaw === 'celsius' ? 'celsius' : 'fahrenheit';
    try {
      const snapshot = await fetchWeatherSnapshot(loc, temperatureUnit);
      return c.json(snapshot);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Weather fetch failed';
      return c.json({ error: message }, 502);
    }
  });

  app.get('/api/spotify/status', async (c) => c.json(await spotifyAuthStatus()));

  app.post('/api/spotify/auth/start', async (c) => {
    const body = await c.req.json<{ clientId?: string; clientSecret?: string }>();
    try {
      const result = await saveSpotifyAppCredentials({
        clientId: String(body.clientId ?? ''),
        clientSecret: String(body.clientSecret ?? ''),
      });
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start Spotify login';
      return c.json({ error: message }, 400);
    }
  });

  async function handleSpotifyCallback(c: Context) {
    const error = c.req.query('error');
    const code = c.req.query('code');
    const redirectHome = (query: string) => c.redirect(`/?${query}`, 302);
    if (error) {
      return redirectHome(`spotify=error&message=${encodeURIComponent(error)}`);
    }
    if (!code?.trim()) {
      return redirectHome(`spotify=error&message=${encodeURIComponent('Missing authorization code')}`);
    }
    try {
      await exchangeSpotifyAuthCode(code);
      return redirectHome('spotify=connected');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Spotify authorization failed';
      return redirectHome(`spotify=error&message=${encodeURIComponent(message)}`);
    }
  }

  // Default redirect URI is /callback — keep /api/spotify/callback as an alias.
  app.get('/callback', (c) => handleSpotifyCallback(c));
  app.get('/api/spotify/callback', (c) => handleSpotifyCallback(c));

  app.post('/api/spotify/credentials', async (c) => {
    const body = await c.req.json<{
      clientId?: string;
      clientSecret?: string;
      refreshToken?: string;
    }>();
    try {
      const status = await saveSpotifyCredentials({
        clientId: String(body.clientId ?? ''),
        clientSecret: String(body.clientSecret ?? ''),
        refreshToken: String(body.refreshToken ?? ''),
      });
      return c.json(status);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save Spotify credentials';
      return c.json({ error: message }, 400);
    }
  });

  app.post('/api/ai-muse/snapshot', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const projectId = typeof body.projectId === 'string' && body.projectId ? body.projectId : 'preview';
      const appConfig =
        body.appConfig && typeof body.appConfig === 'object'
          ? (body.appConfig as Record<string, unknown>)
          : {};
      return c.json(await fetchAiMuseSnapshot(projectId, appConfig));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI Muse fetch failed';
      return c.json({ error: message }, 502);
    }
  });

  app.post('/api/ai-muse/candidates', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const appConfig =
        body.appConfig && typeof body.appConfig === 'object'
          ? (body.appConfig as Record<string, unknown>)
          : {};
      const excludeIds = Array.isArray(body.excludeIds)
        ? body.excludeIds.map((id: unknown) => String(id))
        : [];
      return c.json(await fetchAiMuseCandidates(appConfig, excludeIds));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI Muse candidates failed';
      return c.json({ error: message }, 502);
    }
  });

  app.get('/api/ai-muse/library/:name', async (c) => {
    const filePath = resolveLibraryFilePath(c.req.param('name'));
    if (!filePath) return c.json({ error: 'Not found' }, 404);
    try {
      const bytes = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
        : ext === '.gif' ? 'image/gif'
        : 'image/jpeg';
      return new Response(bytes, {
        headers: {
          'Content-Type': type,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      return c.json({ error: 'Not found' }, 404);
    }
  });

  app.get('/api/ai-muse/gemini/status', async (c) => c.json(await geminiAuthStatus()));

  app.post('/api/ai-muse/gemini/credentials', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      if (body.clear) {
        await clearGeminiApiKey();
        return c.json(await geminiAuthStatus());
      }
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey : '';
      await saveGeminiApiKey(apiKey);
      return c.json(await geminiAuthStatus());
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save Gemini API key';
      return c.json({ error: message }, 400);
    }
  });

  app.get('/api/ai-muse/generated', async (c) => c.json({ items: await listGeneratedImages() }));

  app.post('/api/ai-muse/generate', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const userPrompt = typeof body.prompt === 'string' ? body.prompt : '';
      const model = typeof body.model === 'string' ? body.model : undefined;
      const appConfig =
        body.appConfig && typeof body.appConfig === 'object'
          ? (body.appConfig as Record<string, unknown>)
          : {};
      const result = await generateNanoBananaImage({ userPrompt, appConfig, model });
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Nano Banana generation failed';
      return c.json({ error: message }, 502);
    }
  });

  app.post('/api/spotify/now-playing', async (c) => {
    try {
      const snapshot = await fetchSpotifyNowPlaying();
      return c.json(snapshot);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Spotify fetch failed';
      return c.json({ error: message }, 502);
    }
  });

  // Expose redirect URI for docs/UI copy (no secrets).
  app.get('/api/spotify/redirect-uri', (c) => c.json({ redirectUri: spotifyRedirectUri() }));

  app.post('/api/runtime/sync', async (c) => {
    const body = await c.req.json<{ projectId: string; appConfig: Record<string, unknown> }>();
    if (!body.projectId) return c.json({ error: 'projectId required' }, 400);
    const status = getRuntimeStatus();
    if (!status.running || status.projectId !== body.projectId) {
      return c.json({ ok: true, synced: false });
    }
    const current = await getProject(body.projectId);
    if (!current) return c.json({ error: 'Project not found' }, 404);
    syncRuntimeProject({
      ...current,
      appConfig: { ...current.appConfig, ...body.appConfig },
    });
    return c.json({ ok: true, synced: true });
  });

  app.get('/api/datasources', (c) => c.json(listDataSources()));
  app.get('/api/widgets', (c) => c.json(WIDGETS));

  app.post('/api/datasources/:id/preview', async (c) => {
    const config = await c.req.json<Record<string, unknown>>();
    const result = await fetchDataSource(c.req.param('id'), config);
    return c.json(result);
  });

  app.post('/api/import/image', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!(file instanceof File)) return c.json({ error: 'file required' }, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const frame = await importStillImage(buffer);
    return c.json({ frame });
  });

  app.post('/api/import/gif', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!(file instanceof File)) return c.json({ error: 'file required' }, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { frames, delays } = await importGif(buffer);
    return c.json({ frames, delays });
  });

  app.post('/api/import/video', async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body['file'];
      if (!(file instanceof File)) return c.json({ error: 'file required' }, 400);
      const buffer = Buffer.from(await file.arrayBuffer());
      const maxFramesRaw = body['maxFrames'];
      const maxFrames =
        maxFramesRaw != null && String(maxFramesRaw).trim() !== ''
          ? Number(maxFramesRaw)
          : undefined;
      const startSecRaw = body['startSec'];
      const startSec =
        startSecRaw != null && String(startSecRaw).trim() !== ''
          ? Number(startSecRaw)
          : undefined;
      const focusXRaw = body['focusX'];
      const focusX =
        focusXRaw != null && String(focusXRaw).trim() !== ''
          ? Number(focusXRaw)
          : undefined;
      const focusYRaw = body['focusY'];
      const focusY =
        focusYRaw != null && String(focusYRaw).trim() !== ''
          ? Number(focusYRaw)
          : undefined;
      const { frames, delays } = await importVideo(buffer, { maxFrames, startSec, focusX, focusY });
      return c.json({ frames, delays });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Video import failed';
      return c.json({ error: message }, 502);
    }
  });


  app.post('/api/runtime/stop', async (c) => {
    await stopRuntime();
    return c.json({ ok: true });
  });

  const webDist = options?.webDist;
  if (webDist && existsSync(webDist)) {
    app.use('/assets/*', serveStatic({ root: webDist }));
    app.get('/', serveStatic({ root: webDist, path: 'index.html' }));
    app.get('/index.html', serveStatic({ root: webDist, path: 'index.html' }));
  }

  return app;
}
