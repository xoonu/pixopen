import type {
  WeatherLocation,
  WeatherSnapshot,
  WeatherTemperatureUnit,
} from '@pixopen/core';
import { geocodeLocation } from './geocode.js';
import { fetchForecast } from './forecast.js';

export { geocodeLocation };

const SNAPSHOT_TTL_MS = 10 * 60_000;

type CacheEntry = {
  snapshot: WeatherSnapshot;
  at: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(location: WeatherLocation, unit: WeatherTemperatureUnit): string {
  return `${location.lat.toFixed(4)}:${location.lon.toFixed(4)}:${unit}`;
}

export async function fetchWeatherSnapshot(
  location: WeatherLocation,
  unit: WeatherTemperatureUnit,
): Promise<WeatherSnapshot> {
  const key = cacheKey(location, unit);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && now - cached.at < SNAPSHOT_TTL_MS) {
    return cached.snapshot;
  }

  const forecast = await fetchForecast(location, unit);

  const snapshot: WeatherSnapshot = {
    location,
    current: forecast.current,
    hourly: forecast.hourly,
    daily: forecast.daily,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(key, { snapshot, at: now });
  return snapshot;
}
