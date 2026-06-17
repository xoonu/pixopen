import type { DataSourceMeta } from '@pixopen/core';

export type DataSourceResult = {
  text: string;
  secondary?: string;
  icon?: string;
  raw?: unknown;
  fetchedAt: string;
};

export type DataSourceAdapter = {
  meta: DataSourceMeta;
  fetch: (config: Record<string, unknown>) => Promise<DataSourceResult>;
};

const adapters = new Map<string, DataSourceAdapter>();

function register(adapter: DataSourceAdapter) {
  adapters.set(adapter.meta.id, adapter);
}

register({
  meta: {
    id: 'local.clock',
    name: 'Local Clock',
    category: 'time',
    requiresApiKey: false,
    defaultRefreshMs: 1000,
    description: 'Current time from the Pixopen server',
    configFields: [
      { key: 'format', label: 'Format', type: 'select', options: ['HH:MM', 'HH:MM:SS', '12h'], default: 'HH:MM' },
    ],
  },
  async fetch(config) {
    const now = new Date();
    const format = String(config.format ?? 'HH:MM');
    let text = '';
    if (format === '12h') {
      text = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } else if (format === 'HH:MM:SS') {
      text = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } else {
      text = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return { text, fetchedAt: now.toISOString() };
  },
});

register({
  meta: {
    id: 'open-meteo.current',
    name: 'Open-Meteo Weather',
    category: 'weather',
    requiresApiKey: false,
    defaultRefreshMs: 600_000,
    description: 'Current weather via Open-Meteo (no API key)',
    configFields: [
      { key: 'lat', label: 'Latitude', type: 'number', required: true, default: 40.71 },
      { key: 'lon', label: 'Longitude', type: 'number', required: true, default: -74.01 },
    ],
  },
  async fetch(config) {
    const lat = Number(config.lat ?? 40.71);
    const lon = Number(config.lon ?? -74.01);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json() as { current?: { temperature_2m?: number; weather_code?: number } };
    const temp = data.current?.temperature_2m;
    return {
      text: temp != null ? `${Math.round(temp)}°` : '--',
      secondary: 'wx',
      icon: 'weather',
      raw: data,
      fetchedAt: new Date().toISOString(),
    };
  },
});

register({
  meta: {
    id: 'terminalfeed.stocks',
    name: 'US Stocks',
    category: 'finance',
    requiresApiKey: false,
    defaultRefreshMs: 60_000,
    description: 'Top US stock movers via TerminalFeed',
    configFields: [
      { key: 'symbol', label: 'Symbol (optional)', type: 'string', default: '' },
    ],
  },
  async fetch(config) {
    const res = await fetch('https://terminalfeed.io/api/stocks', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`TerminalFeed error: ${res.status}`);
    const data = await res.json() as { gainers?: Array<{ symbol?: string; change?: number; price?: number }> };
    const symbol = String(config.symbol ?? '').toUpperCase();
    const match = symbol
      ? data.gainers?.find((g) => g.symbol === symbol)
      : data.gainers?.[0];
    if (!match) return { text: 'N/A', fetchedAt: new Date().toISOString() };
    return {
      text: match.symbol ?? '?',
      secondary: match.price != null ? `$${match.price}` : undefined,
      raw: match,
      fetchedAt: new Date().toISOString(),
    };
  },
});

register({
  meta: {
    id: 'open-notify.iss',
    name: 'ISS Position',
    category: 'astronomy',
    requiresApiKey: false,
    defaultRefreshMs: 30_000,
    description: 'International Space Station coordinates',
    configFields: [],
  },
  async fetch() {
    const res = await fetch('http://api.open-notify.org/iss-now.json', { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Open Notify error: ${res.status}`);
    const data = await res.json() as { iss_position?: { latitude?: string; longitude?: string } };
    const lat = data.iss_position?.latitude ?? '?';
    const lon = data.iss_position?.longitude ?? '?';
    return {
      text: `ISS`,
      secondary: `${lat},${lon}`,
      icon: 'iss',
      raw: data,
      fetchedAt: new Date().toISOString(),
    };
  },
});

register({
  meta: {
    id: 'sportscore.live',
    name: 'Live Sports',
    category: 'sports',
    requiresApiKey: false,
    defaultRefreshMs: 60_000,
    description: 'Live match scores via SportScore',
    configFields: [
      { key: 'sport', label: 'Sport', type: 'select', options: ['football', 'basketball', 'cricket', 'tennis'], default: 'football' },
    ],
  },
  async fetch(config) {
    const sport = String(config.sport ?? 'football');
    const res = await fetch(`https://sportscore.com/api/widget/matches/${sport}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`SportScore error: ${res.status}`);
    const data = await res.json() as { matches?: Array<{ home?: { name?: string }; away?: { name?: string }; score?: string }> };
    const match = data.matches?.[0];
    if (!match) return { text: 'No match', fetchedAt: new Date().toISOString() };
    return {
      text: match.score ?? '0-0',
      secondary: `${match.home?.name?.slice(0, 3) ?? 'H'} v ${match.away?.name?.slice(0, 3) ?? 'A'}`,
      raw: match,
      fetchedAt: new Date().toISOString(),
    };
  },
});

export function listDataSources(): DataSourceMeta[] {
  return [...adapters.values()].map((a) => a.meta);
}

export function getDataSource(id: string): DataSourceAdapter | undefined {
  return adapters.get(id);
}

export async function fetchDataSource(
  id: string,
  config: Record<string, unknown>,
): Promise<DataSourceResult> {
  const adapter = adapters.get(id);
  if (!adapter) throw new Error(`Unknown datasource: ${id}`);
  return adapter.fetch(config);
}
