import { compositeFrame, parseVestaNoteConfig, renderVestaNoteBoard } from '@pixopen/renderer';
import { fetchDataSource, getDataSource } from '@pixopen/datasources';
import { openPixooStream, type PixooStream } from '@pixopen/device';
import type { DataSourceResult } from '@pixopen/datasources';
import { shouldUseVestaNoteUi, type Project } from '@pixopen/core';
import type { WebSocket } from 'ws';

type RuntimeState = {
  projectId: string;
  deviceIp: string;
  interval: ReturnType<typeof setInterval> | null;
  tick: number;
  startedAt: number;
  lastFrame: number[] | null;
  lastError: string | null;
  stream: PixooStream | null;
  pushInFlight: boolean;
};

let active: RuntimeState | null = null;
const previewClients = new Set<WebSocket>();

export function registerPreviewClient(ws: WebSocket) {
  previewClients.add(ws);
  ws.on('close', () => previewClients.delete(ws));
}

function broadcastPreview(pixels: number[]) {
  const payload = JSON.stringify({ type: 'preview', pixels });
  for (const client of previewClients) {
    if (client.readyState === 1) client.send(payload);
  }
}

export function getRuntimeStatus() {
  if (!active) return { running: false as const };
  return {
    running: true as const,
    projectId: active.projectId,
    deviceIp: active.deviceIp,
    tick: active.tick,
    lastError: active.lastError,
  };
}

export async function stopRuntime() {
  if (active?.interval) clearInterval(active.interval);
  active = null;
}

function renderLiveFrame(project: Project, state: RuntimeState, values: Map<string, DataSourceResult>) {
  const base = project.frames[0];
  if (!base) throw new Error('Project has no base frame');

  if (shouldUseVestaNoteUi(project)) {
    const config = parseVestaNoteConfig(project.appConfig);
    const elapsedMs = Date.now() - state.startedAt;
    return renderVestaNoteBoard(base, config, elapsedMs);
  }

  return compositeFrame(base, project.liveAreas, values, state.tick);
}

export async function startRuntime(project: Project, deviceIp: string) {
  await stopRuntime();
  if (project.type !== 'live-sign') throw new Error('Only live sign projects can be run');
  const base = project.frames[0];
  if (!base) throw new Error('Project has no base frame');

  const stream = await openPixooStream(deviceIp);
  const cache = new Map<string, { value: DataSourceResult; at: number }>();
  const isVesta = shouldUseVestaNoteUi(project);

  const state: RuntimeState = {
    projectId: project.id,
    deviceIp,
    interval: null,
    tick: 0,
    startedAt: Date.now(),
    lastFrame: null,
    lastError: null,
    stream,
    pushInFlight: false,
  };
  active = state;

  const tick = async () => {
    if (!active || state.pushInFlight || !state.stream) return;
    state.pushInFlight = true;
    state.tick += 1;
    try {
      const values = new Map<string, DataSourceResult>();
      if (!isVesta) {
        for (const area of project.liveAreas) {
          const adapter = getDataSource(area.datasourceId);
          if (!adapter) continue;
          const refreshMs =
            area.refreshPolicy === 'inherit'
              ? adapter.meta.defaultRefreshMs
              : area.refreshPolicy.intervalMs;
          const cached = cache.get(area.id);
          const now = Date.now();
          if (!cached || now - cached.at >= refreshMs) {
            const value = await fetchDataSource(area.datasourceId, area.config);
            cache.set(area.id, { value, at: now });
            values.set(area.id, value);
          } else {
            values.set(area.id, cached.value);
          }
        }
      }
      const frame = renderLiveFrame(project, state, values);
      state.lastFrame = frame.pixels;
      broadcastPreview(frame.pixels);
      await state.stream.push(frame);
      state.lastError = null;
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      state.pushInFlight = false;
    }
  };

  await tick();
  const intervalMs = isVesta ? 120 : 1000;
  state.interval = setInterval(tick, intervalMs);
}
