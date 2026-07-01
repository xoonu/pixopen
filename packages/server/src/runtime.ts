import { compositeFrame, parseFlipNoteConfig, parseStockTickerConfig, parseWeatherFrameConfig, renderFlipNoteBoard, renderStockTickerBoard, renderWeatherBoard } from '@pixopen/renderer';
import { fetchDataSource, getDataSource } from '@pixopen/datasources';
import { openPixooStream, type PixooStream } from '@pixopen/device';
import type { DataSourceResult } from '@pixopen/datasources';
import { normalizeProject, shouldUseFlipNoteUi, shouldUseStockTickerUi, shouldUseWeatherUi, stockTickerQuoteSymbols, type Project, type StockQuoteSnapshot, type WeatherSnapshot } from '@pixopen/core';
import type { WebSocket } from 'ws';
import { fetchStockQuotes } from './marketData/quotes.js';
import { fetchWeatherSnapshot } from './weatherData/index.js';

type RuntimeState = {
  project: Project;
  deviceIp: string;
  interval: ReturnType<typeof setInterval> | null;
  tick: number;
  startedAt: number;
  lastFrame: number[] | null;
  lastPushedPixels: number[] | null;
  lastDevicePushAt: number;
  lastError: string | null;
  stream: PixooStream | null;
  pushInFlight: boolean;
  quotes: StockQuoteSnapshot[];
  quotesKey: string;
  quotesFetchedAt: number;
  weatherSnapshot: WeatherSnapshot | null;
  weatherKey: string;
  weatherFetchedAt: number;
};

/** Minimum ms between Pixoo pushes — preview can tick faster than this. */
const FLIP_NOTE_DEVICE_PUSH_MS = 400;
const LIVE_SIGN_DEVICE_PUSH_MS = 1000;
const STOCK_QUOTE_REFRESH_MS = 30_000;
const WEATHER_REFRESH_MS = 10 * 60_000;

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
    projectId: active.project.id,
    deviceIp: active.deviceIp,
    tick: active.tick,
    lastError: active.lastError,
  };
}

function pixelsEqual(a: number[] | null, b: number[]): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function stopRuntime() {
  if (active?.interval) clearInterval(active.interval);
  active = null;
}

/** Push the latest saved/edited project into an active live runtime and force a Pixoo refresh. */
export function syncRuntimeProject(project: Project) {
  if (!active || active.project.id !== project.id) return;
  active.project = normalizeProject(project);
  active.lastPushedPixels = null;
  active.quotesKey = '';
  active.weatherKey = '';
}

function isAnimatedLiveSign(project: Project): boolean {
  return shouldUseFlipNoteUi(project) || shouldUseStockTickerUi(project) || shouldUseWeatherUi(project);
}

async function refreshQuotesIfNeeded(state: RuntimeState): Promise<StockQuoteSnapshot[]> {
  const config = parseStockTickerConfig(state.project.appConfig);
  const key = JSON.stringify({
    symbols: config.symbols.map((s) => s.symbol),
    period: config.performancePeriod,
    finnhubApiKey: config.finnhubApiKey ?? '',
  });
  const now = Date.now();
  if (state.quotesKey === key && now - state.quotesFetchedAt < STOCK_QUOTE_REFRESH_MS && state.quotes.length > 0) {
    return state.quotes;
  }
  const result = await fetchStockQuotes(
    stockTickerQuoteSymbols(config.symbols),
    config.performancePeriod,
    config.finnhubApiKey,
  );
  state.quotes = result.quotes;
  state.quotesKey = key;
  state.quotesFetchedAt = now;
  return result.quotes;
}

async function refreshWeatherIfNeeded(state: RuntimeState): Promise<WeatherSnapshot | null> {
  const config = parseWeatherFrameConfig(state.project.appConfig);
  if (!config.location) return null;
  const key = JSON.stringify({
    lat: config.location.lat,
    lon: config.location.lon,
    unit: config.temperatureUnit,
  });
  const now = Date.now();
  if (
    state.weatherKey === key &&
    state.weatherSnapshot &&
    now - state.weatherFetchedAt < WEATHER_REFRESH_MS
  ) {
    return state.weatherSnapshot;
  }
  const snapshot = await fetchWeatherSnapshot(config.location, config.temperatureUnit);
  state.weatherSnapshot = snapshot;
  state.weatherKey = key;
  state.weatherFetchedAt = now;
  return snapshot;
}

function renderLiveFrame(
  project: Project,
  state: RuntimeState,
  values: Map<string, DataSourceResult>,
  quotes: StockQuoteSnapshot[],
  weather: WeatherSnapshot | null,
) {
  const base = project.frames[0];
  if (!base) throw new Error('Project has no base frame');

  if (shouldUseStockTickerUi(project)) {
    const config = parseStockTickerConfig(project.appConfig);
    const elapsedMs = Date.now() - state.startedAt;
    return renderStockTickerBoard(config, quotes, elapsedMs);
  }

  if (shouldUseWeatherUi(project)) {
    const config = parseWeatherFrameConfig(project.appConfig);
    const elapsedMs = Date.now() - state.startedAt;
    return renderWeatherBoard(config, weather, elapsedMs);
  }

  if (shouldUseFlipNoteUi(project)) {
    const config = parseFlipNoteConfig(project.appConfig);
    const elapsedMs = Date.now() - state.startedAt;
    return renderFlipNoteBoard(base, config, elapsedMs);
  }

  return compositeFrame(base, project.liveAreas, values, state.tick);
}

export async function startRuntime(project: Project, deviceIp: string) {
  await stopRuntime();
  if (project.type !== 'live-sign') throw new Error('Only live frame projects can be run');
  const base = project.frames[0];
  if (!base) throw new Error('Project has no base frame');

  const stream = await openPixooStream(deviceIp);
  const cache = new Map<string, { value: DataSourceResult; at: number }>();
  const normalized = normalizeProject(project);
  const animated = isAnimatedLiveSign(normalized);

  const state: RuntimeState = {
    project: normalized,
    deviceIp,
    interval: null,
    tick: 0,
    startedAt: Date.now(),
    lastFrame: null,
    lastPushedPixels: null,
    lastDevicePushAt: 0,
    lastError: null,
    stream,
    pushInFlight: false,
    quotes: [],
    quotesKey: '',
    quotesFetchedAt: 0,
    weatherSnapshot: null,
    weatherKey: '',
    weatherFetchedAt: 0,
  };
  active = state;

  const minDevicePushMs = animated ? FLIP_NOTE_DEVICE_PUSH_MS : LIVE_SIGN_DEVICE_PUSH_MS;

  const tick = async () => {
    if (!active || !state.stream) return;

    state.tick += 1;
    try {
      const project = state.project;
      const values = new Map<string, DataSourceResult>();
      let quotes: StockQuoteSnapshot[] = [];
      let weather: WeatherSnapshot | null = null;

      if (shouldUseStockTickerUi(project)) {
        quotes = await refreshQuotesIfNeeded(state);
      } else if (shouldUseWeatherUi(project)) {
        weather = await refreshWeatherIfNeeded(state);
      } else if (!shouldUseFlipNoteUi(project)) {
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

      const frame = renderLiveFrame(project, state, values, quotes, weather);
      state.lastFrame = frame.pixels;
      broadcastPreview(frame.pixels);

      const now = Date.now();
      const dueForPush = state.lastPushedPixels === null || now - state.lastDevicePushAt >= minDevicePushMs;
      const frameChanged = !pixelsEqual(state.lastPushedPixels, frame.pixels);
      if (state.pushInFlight || !dueForPush || !frameChanged) return;

      state.pushInFlight = true;
      try {
        await state.stream.push(frame);
        state.lastDevicePushAt = now;
        state.lastPushedPixels = frame.pixels;
        state.lastError = null;
      } finally {
        state.pushInFlight = false;
      }
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
    }
  };

  await tick();
  const intervalMs = animated ? 120 : 1000;
  state.interval = setInterval(tick, intervalMs);
}
