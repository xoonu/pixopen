import { compositeFrame, parseDvdScreensaverConfig, parseFlipNoteConfig, parseSpotifyNowPlayingConfig, parseStockTickerConfig, parseWeatherFrameConfig, renderDvdScreensaverFromSimulator, renderFlipNoteBoard, renderSpotifyNowPlayingBoard, renderStockTickerBoard, renderWeatherBoard, DvdSimulator, dvdEffectiveSimConfig } from '@pixopen/renderer';
import { fetchDataSource, getDataSource } from '@pixopen/datasources';
import { openPixooStream, type PixooStream } from '@pixopen/device';
import type { DataSourceResult } from '@pixopen/datasources';
import { normalizeProject, shouldUseDvdScreensaverUi, shouldUseFlipNoteUi, shouldUseSpotifyNowPlayingUi, shouldUseStockTickerUi, shouldUseWeatherUi, stockTickerQuoteSymbols, type Project, type SpotifyNowPlayingSnapshot, type StockQuoteSnapshot, type WeatherSnapshot } from '@pixopen/core';
import type { WebSocket } from 'ws';
import { fetchStockQuotes } from './marketData/quotes.js';
import { fetchWeatherSnapshot } from './weatherData/index.js';
import { fetchSpotifyNowPlaying } from './spotifyData/index.js';
import { startKeepAwake, stopKeepAwake } from './keepAwake.js';

type RuntimeState = {
  project: Project;
  deviceIp: string;
  /** setTimeout handle for the serialized tick loop */
  interval: ReturnType<typeof setTimeout> | null;
  tick: number;
  startedAt: number;
  lastFrame: number[] | null;
  lastPushedPixels: number[] | null;
  lastDevicePushAt: number;
  lastSuccessfulPushAt: number;
  lastStreamOpenAt: number;
  lastError: string | null;
  stream: PixooStream | null;
  pushInFlight: boolean;
  quotes: StockQuoteSnapshot[];
  quotesKey: string;
  quotesFetchedAt: number;
  weatherSnapshot: WeatherSnapshot | null;
  weatherKey: string;
  weatherFetchedAt: number;
  spotifySnapshot: SpotifyNowPlayingSnapshot | null;
  spotifyFetchedAt: number;
  dvdSimulator: DvdSimulator | null;
  dvdSimConfigKey: string;
  dvdLastTickAt: number;
};

/** Minimum ms between Pixoo pushes — faster rates crash/reboot the device. */
const FLIP_NOTE_DEVICE_PUSH_MS = 400;
/** DVD streams full-screen updates every tick — stay conservative. */
const DVD_DEVICE_PUSH_MS = 500;
const LIVE_SIGN_DEVICE_PUSH_MS = 1000;
const ANIMATED_TICK_MS = 120;
const DVD_TICK_MS = 500;
/** Gap longer than this (e.g. laptop sleep) — skip catch-up and reopen the stream. */
const SLEEP_GAP_MS = 5_000;
const MAX_DVD_ADVANCE_MS = 2_000;
/** Reopen Pixoo stream periodically — long-lived HTTP sessions go stale. */
const STREAM_ROTATE_MS = 20 * 60_000;
/** Force reconnect if no successful push within this window. */
const PUSH_WATCHDOG_MS = 90_000;
const PUSH_TIMEOUT_MS = 12_000;
const STOCK_QUOTE_REFRESH_MS = 30_000;
const WEATHER_REFRESH_MS = 10 * 60_000;
const SPOTIFY_REFRESH_MS = 5_000;

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
  if (active?.interval) clearTimeout(active.interval);
  active = null;
  stopKeepAwake();
}

/** Push the latest saved/edited project into an active live runtime and force a Pixoo refresh. */
export function syncRuntimeProject(project: Project) {
  if (!active || active.project.id !== project.id) return;
  active.project = normalizeProject(project);
  active.lastPushedPixels = null;
  active.quotesKey = '';
  active.weatherKey = '';
  active.spotifyFetchedAt = 0;
  if (shouldUseDvdScreensaverUi(active.project) && active.dvdSimulator) {
    const config = parseDvdScreensaverConfig(active.project.appConfig);
    const simConfig = dvdEffectiveSimConfig(config);
    const simKey = `${simConfig.seed}|${simConfig.speedPxPerSec}|${simConfig.logoScale}|${simConfig.cornerSensitivity}`;
    if (simKey !== active.dvdSimConfigKey) {
      active.dvdSimulator = null;
      active.dvdSimConfigKey = '';
      active.dvdLastTickAt = 0;
    }
  }
}

function isAnimatedLiveSign(project: Project): boolean {
  return (
    shouldUseFlipNoteUi(project) ||
    shouldUseStockTickerUi(project) ||
    shouldUseWeatherUi(project) ||
    shouldUseDvdScreensaverUi(project) ||
    shouldUseSpotifyNowPlayingUi(project)
  );
}

function runtimeTiming(project: Project): { tickMs: number; devicePushMs: number } {
  if (shouldUseDvdScreensaverUi(project)) {
    return { tickMs: DVD_TICK_MS, devicePushMs: DVD_DEVICE_PUSH_MS };
  }
  if (shouldUseSpotifyNowPlayingUi(project)) {
    return { tickMs: 1000, devicePushMs: LIVE_SIGN_DEVICE_PUSH_MS };
  }
  if (isAnimatedLiveSign(project)) {
    return { tickMs: ANIMATED_TICK_MS, devicePushMs: FLIP_NOTE_DEVICE_PUSH_MS };
  }
  return { tickMs: 1000, devicePushMs: LIVE_SIGN_DEVICE_PUSH_MS };
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

async function refreshSpotifyIfNeeded(state: RuntimeState): Promise<SpotifyNowPlayingSnapshot | null> {
  const now = Date.now();
  if (state.spotifySnapshot && now - state.spotifyFetchedAt < SPOTIFY_REFRESH_MS) {
    return state.spotifySnapshot;
  }
  const snapshot = await fetchSpotifyNowPlaying();
  state.spotifySnapshot = snapshot;
  state.spotifyFetchedAt = now;
  return snapshot;
}

function dvdSimKey(config: ReturnType<typeof dvdEffectiveSimConfig>): string {
  return `${config.seed}|${config.speedPxPerSec}|${config.logoScale}|${config.cornerSensitivity}`;
}

function ensureDvdSimulator(state: RuntimeState, project: Project): DvdSimulator {
  const config = parseDvdScreensaverConfig(project.appConfig);
  const simConfig = dvdEffectiveSimConfig(config);
  const simKey = dvdSimKey(simConfig);
  if (!state.dvdSimulator || state.dvdSimConfigKey !== simKey) {
    state.dvdSimulator = new DvdSimulator(simConfig);
    state.dvdSimConfigKey = simKey;
    state.dvdLastTickAt = 0;
  }
  return state.dvdSimulator;
}

/** Step sim by real wall time between ticks — never replay from t=0 (survives laptop sleep). */
function advanceDvdSimulator(state: RuntimeState, project: Project, tickMs: number): void {
  const sim = ensureDvdSimulator(state, project);
  const now = Date.now();
  const gap = state.dvdLastTickAt > 0 ? now - state.dvdLastTickAt : tickMs;
  state.dvdLastTickAt = now;
  const delta = gap > SLEEP_GAP_MS ? tickMs : Math.min(Math.max(gap, tickMs), MAX_DVD_ADVANCE_MS);
  sim.advanceBy(delta);
}

async function reopenPixooStream(state: RuntimeState): Promise<boolean> {
  try {
    state.stream = await openPixooStream(state.deviceIp);
    state.lastPushedPixels = null;
    state.lastDevicePushAt = 0;
    state.lastStreamOpenAt = Date.now();
    state.lastError = null;
    return true;
  } catch (err) {
    state.stream = null;
    state.lastError = err instanceof Error ? err.message : String(err);
    return false;
  }
}

async function pushFrameWithTimeout(state: RuntimeState, pixels: number[]): Promise<void> {
  const push = state.stream!.push({ width: 64, height: 64, pixels });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Pixoo push timed out')), PUSH_TIMEOUT_MS);
  });
  await Promise.race([push, timeout]);
}

async function ensureFreshPixooStream(state: RuntimeState, project: Project): Promise<void> {
  if (!shouldUseDvdScreensaverUi(project)) return;
  const now = Date.now();
  const stale = now - state.lastSuccessfulPushAt > PUSH_WATCHDOG_MS;
  const rotate = now - state.lastStreamOpenAt > STREAM_ROTATE_MS;
  if (stale || rotate || !state.stream) {
    await reopenPixooStream(state);
  }
}

function renderLiveFrame(
  project: Project,
  state: RuntimeState,
  values: Map<string, DataSourceResult>,
  quotes: StockQuoteSnapshot[],
  weather: WeatherSnapshot | null,
  spotify: SpotifyNowPlayingSnapshot | null,
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

  if (shouldUseDvdScreensaverUi(project)) {
    const config = parseDvdScreensaverConfig(project.appConfig);
    const sim = ensureDvdSimulator(state, project);
    return renderDvdScreensaverFromSimulator(config, sim);
  }

  if (shouldUseSpotifyNowPlayingUi(project)) {
    const config = parseSpotifyNowPlayingConfig(project.appConfig);
    return renderSpotifyNowPlayingBoard(config, spotify);
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
  const now = Date.now();

  const state: RuntimeState = {
    project: normalized,
    deviceIp,
    interval: null,
    tick: 0,
    startedAt: now,
    lastFrame: null,
    lastPushedPixels: null,
    lastDevicePushAt: 0,
    lastSuccessfulPushAt: now,
    lastStreamOpenAt: now,
    lastError: null,
    stream,
    pushInFlight: false,
    quotes: [],
    quotesKey: '',
    quotesFetchedAt: 0,
    weatherSnapshot: null,
    weatherKey: '',
    weatherFetchedAt: 0,
    spotifySnapshot: null,
    spotifyFetchedAt: 0,
    dvdSimulator: null,
    dvdSimConfigKey: '',
    dvdLastTickAt: 0,
  };
  active = state;
  startKeepAwake();

  const { tickMs, devicePushMs: minDevicePushMs } = runtimeTiming(normalized);
  const isDvdRuntime = shouldUseDvdScreensaverUi(normalized);
  if (isDvdRuntime) {
    ensureDvdSimulator(state, normalized);
  }

  const pushToDevice = async (pixels: number[]) => {
    if (state.pushInFlight) return;
    const now = Date.now();
    const dueForPush = state.lastPushedPixels === null || now - state.lastDevicePushAt >= minDevicePushMs;
    const frameChanged = !pixelsEqual(state.lastPushedPixels, pixels);
    // DVD: always push on schedule — keeps the device alive even if pixels match.
    if (!dueForPush || (!frameChanged && !isDvdRuntime)) return;

    state.pushInFlight = true;
    try {
      if (!state.stream && !(await reopenPixooStream(state))) return;
      await pushFrameWithTimeout(state, pixels);
      state.lastDevicePushAt = Date.now();
      state.lastSuccessfulPushAt = state.lastDevicePushAt;
      state.lastPushedPixels = pixels;
      state.lastError = null;
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
      state.stream = null;
      if (await reopenPixooStream(state)) {
        try {
          await pushFrameWithTimeout(state, pixels);
          state.lastDevicePushAt = Date.now();
          state.lastSuccessfulPushAt = state.lastDevicePushAt;
          state.lastPushedPixels = pixels;
          state.lastError = null;
        } catch (retryErr) {
          state.lastError = retryErr instanceof Error ? retryErr.message : String(retryErr);
          state.stream = null;
        }
      }
    } finally {
      state.pushInFlight = false;
    }
  };

  const tick = async () => {
    if (!active) return;

    state.tick += 1;
    try {
      const project = state.project;
      const now = Date.now();
      if (shouldUseDvdScreensaverUi(project)) {
        const tickGap = state.dvdLastTickAt > 0 ? now - state.dvdLastTickAt : 0;
        if (tickGap > SLEEP_GAP_MS) {
          await reopenPixooStream(state);
        }
        await ensureFreshPixooStream(state, project);
        advanceDvdSimulator(state, project, tickMs);
      }
      const values = new Map<string, DataSourceResult>();
      let quotes: StockQuoteSnapshot[] = [];
      let weather: WeatherSnapshot | null = null;
      let spotify: SpotifyNowPlayingSnapshot | null = null;

      if (shouldUseStockTickerUi(project)) {
        quotes = await refreshQuotesIfNeeded(state);
      } else if (shouldUseWeatherUi(project)) {
        weather = await refreshWeatherIfNeeded(state);
      } else if (shouldUseSpotifyNowPlayingUi(project)) {
        spotify = await refreshSpotifyIfNeeded(state);
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

      const frame = renderLiveFrame(project, state, values, quotes, weather, spotify);
      state.lastFrame = frame.pixels;
      broadcastPreview(frame.pixels);
      await pushToDevice(frame.pixels);
    } catch (err) {
      state.lastError = err instanceof Error ? err.message : String(err);
    }
  };

  const scheduleTick = () => {
    if (!active || active !== state) return;
    state.interval = setTimeout(() => {
      void tick().finally(() => {
        if (active === state) scheduleTick();
      });
    }, tickMs);
  };

  await tick();
  scheduleTick();
}
