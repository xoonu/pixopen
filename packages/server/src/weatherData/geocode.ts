import type { WeatherLocation } from '@pixopen/core';

export type GeocodeResult = WeatherLocation;

type OpenMeteoGeocodeResponse = {
  results?: Array<{
    name?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

export async function geocodeLocation(query: string, count = 8): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    name: q,
    count: String(Math.min(100, Math.max(1, count))),
    language: 'en',
    format: 'json',
  });
  const url = `https://geocoding-api.open-meteo.com/v1/search?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const data = (await res.json()) as OpenMeteoGeocodeResponse;
  if (!data.results?.length) return [];

  return data.results
    .filter((r) => r.name && Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
    .map((r) => ({
      name: r.name!,
      lat: r.latitude!,
      lon: r.longitude!,
      ...(r.admin1 ? { admin1: r.admin1 } : {}),
      ...(r.country ? { country: r.country } : {}),
      ...(r.timezone ? { timezone: r.timezone } : {}),
    }));
}
