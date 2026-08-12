import {
  CANVAS_SIZE,
  type Frame,
  type WeatherFrameConfig,
  type WeatherSnapshot,
  weatherFrameLocations,
} from '@pixopen/core';
import { parseWeatherFrameConfig } from './config.js';
import { drawCurrentPane, drawPlaceholderPane } from './panes.js';

export function rotateWeatherIndex(elapsedMs: number, count: number, holdMs: number): number {
  if (count <= 0) return 0;
  return Math.floor(elapsedMs / Math.max(1, holdMs)) % count;
}

export function demoWeatherSnapshot(config: WeatherFrameConfig): WeatherSnapshot {
  const loc = weatherFrameLocations(config)[0] ?? {
    name: 'Brooklyn',
    admin1: 'New York',
    country: 'United States',
    lat: 40.65,
    lon: -73.95,
    timezone: 'America/New_York',
  };
  const now = new Date();
  return {
    location: loc,
    current: { temp: 72, weatherCode: 2, humidity: 55, windSpeed: 8 },
    hourly: [],
    daily: [],
    fetchedAt: now.toISOString(),
  };
}

function asSnapshotList(
  snapshots: WeatherSnapshot[] | WeatherSnapshot | null | undefined,
): WeatherSnapshot[] {
  if (!snapshots) return [];
  return Array.isArray(snapshots) ? snapshots : [snapshots];
}

export function renderWeatherBoard(
  config: WeatherFrameConfig,
  snapshots: WeatherSnapshot[] | WeatherSnapshot | null,
  elapsedMs: number,
): Frame {
  const pixels = new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0);
  const list = asSnapshotList(snapshots);
  const locations = weatherFrameLocations(config);

  if (locations.length === 0 || list.length === 0) {
    drawPlaceholderPane(pixels, config);
    return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
  }

  const holdMs = Math.max(3000, config.holdMs);
  const index = rotateWeatherIndex(elapsedMs, list.length, holdMs);
  const snapshot = list[index] ?? list[0];
  // Reset marquee when cycling cities; keep continuous scroll for a single place
  const marqueeMs = list.length > 1 ? elapsedMs % holdMs : elapsedMs;
  drawCurrentPane(pixels, config, snapshot, marqueeMs);
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function renderWeatherPreview(
  appConfig: Record<string, unknown> | undefined,
  snapshots: WeatherSnapshot[] | WeatherSnapshot | null,
  elapsedMs: number,
): Frame {
  const config = parseWeatherFrameConfig(appConfig);
  const list = asSnapshotList(snapshots);
  const fallback =
    list.length === 0 && weatherFrameLocations(config).length > 0
      ? [demoWeatherSnapshot(config)]
      : list;
  return renderWeatherBoard(config, fallback, elapsedMs);
}
