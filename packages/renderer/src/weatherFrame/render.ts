import { CANVAS_SIZE, type Frame, type WeatherFrameConfig, type WeatherSnapshot } from '@pixopen/core';
import { parseWeatherFrameConfig } from './config.js';
import { drawCurrentPane, drawPlaceholderPane } from './panes.js';

export function demoWeatherSnapshot(config: WeatherFrameConfig): WeatherSnapshot {
  const loc = config.location ?? {
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

export function renderWeatherBoard(
  config: WeatherFrameConfig,
  snapshot: WeatherSnapshot | null,
  elapsedMs: number,
): Frame {
  const pixels = new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0);

  if (!config.location || !snapshot) {
    drawPlaceholderPane(pixels, config);
    return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
  }

  drawCurrentPane(pixels, config, snapshot, elapsedMs);
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function renderWeatherPreview(
  appConfig: Record<string, unknown> | undefined,
  snapshot: WeatherSnapshot | null,
  elapsedMs: number,
): Frame {
  const config = parseWeatherFrameConfig(appConfig);
  return renderWeatherBoard(config, snapshot ?? (config.location ? demoWeatherSnapshot(config) : null), elapsedMs);
}
