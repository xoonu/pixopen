import type { AppTemplate, DataSourceMeta, Frame, Project, SavedDevice, StockQuoteSnapshot, StockTickerPerformancePeriod, WeatherLocation, WeatherSnapshot, WeatherTemperatureUnit } from '@pixopen/core';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed (${res.status})`;
    try {
      const err = JSON.parse(text) as { error?: string; message?: string };
      message = err.error ?? err.message ?? message;
    } catch {
      if (text.trim()) message = text.trim().slice(0, 240);
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),
  apps: {
    list: () => request<AppTemplate[]>('/api/apps'),
  },
  devices: {
    list: () => request<SavedDevice[]>('/api/devices'),
    discover: () =>
      request<{ devices: SavedDevice[]; discovered: SavedDevice[] }>('/api/devices/discover', { method: 'POST' }),
    add: (ip: string, name?: string) =>
      request<SavedDevice>('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, name }),
      }),
    testPattern: (ip: string) =>
      request<{ ok: boolean }>(`/api/devices/${encodeURIComponent(ip)}/test-pattern`, { method: 'POST' }),
    ping: (ip: string) =>
      request<{ ok: true } | { ok: false; error: string }>(`/api/devices/${encodeURIComponent(ip)}/ping`, { method: 'POST' }),
  },
  projects: {
    list: () => request<Project[]>('/api/projects'),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (name: string, type: Project['type'] = 'animator') =>
      request<Project>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      }),
    createFromTemplate: (templateId: string, name?: string) =>
      request<Project>('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, name: name?.trim() || undefined }),
      }),
    update: (project: Project) =>
      request<Project>(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
    duplicate: (id: string, name?: string) =>
      request<Project>(`/api/projects/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(name ? { name } : {}),
      }),
    deploy: (id: string, deviceIp: string) =>
      request<{ ok: boolean }>(`/api/projects/${id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIp }),
      }),
    run: (id: string, deviceIp: string) =>
      request<{ ok: boolean }>(`/api/projects/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIp }),
      }),
  },
  datasources: {
    list: () => request<DataSourceMeta[]>('/api/datasources'),
    preview: (id: string, config: Record<string, unknown>) =>
      request<{ text: string; secondary?: string }>(`/api/datasources/${id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }),
  },
  import: {
    image: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import/image', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Import failed');
      return res.json() as Promise<{ frame: Frame }>;
    },
    gif: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/import/gif', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('GIF import failed');
      return res.json() as Promise<{ frames: Frame[]; delays: number[] }>;
    },
    video: async (file: File, opts?: { maxFrames?: number; startSec?: number; focusX?: number; focusY?: number }) => {
      const fd = new FormData();
      fd.append('file', file);
      if (opts?.maxFrames != null) fd.append('maxFrames', String(opts.maxFrames));
      if (opts?.startSec != null) fd.append('startSec', String(opts.startSec));
      if (opts?.focusX != null) fd.append('focusX', String(opts.focusX));
      if (opts?.focusY != null) fd.append('focusY', String(opts.focusY));
      const res = await fetch('/api/import/video', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text) as { error?: string };
          throw new Error(err.error ?? 'Video import failed');
        } catch {
          throw new Error(text || 'Video import failed');
        }
      }
      return res.json() as Promise<{ frames: Frame[]; delays: number[] }>;
    },
    videoStatus: () => request<{ available: boolean }>('/api/import/video/status'),
  },
  runtime: {
    status: () =>
      request<
        | { running: false }
        | { running: true; projectId: string; deviceIp: string; lastError?: string | null; tick?: number }
      >('/api/runtime/status'),
    stop: () => request<{ ok: boolean }>('/api/runtime/stop', { method: 'POST' }),
    sync: (projectId: string, appConfig: Record<string, unknown>) =>
      request<{ ok: boolean; synced: boolean }>('/api/runtime/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, appConfig }),
      }),
  },
  market: {
    status: () =>
      request<{ provider: 'finnhub' | 'demo'; configured: boolean }>('/api/market/status'),
    quotes: (symbols: string[], period: StockTickerPerformancePeriod = '1d', finnhubApiKey?: string) =>
      request<{
        quotes: StockQuoteSnapshot[];
        provider: 'finnhub' | 'demo';
        configured: boolean;
        errors: string[];
      }>('/api/market/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols,
          period,
          ...(finnhubApiKey ? { finnhubApiKey } : {}),
        }),
      }),
  },
  weather: {
    geocode: (q: string, count = 8) =>
      request<{ results: WeatherLocation[] }>(
        `/api/weather/geocode?q=${encodeURIComponent(q)}&count=${count}`,
      ),
    snapshot: (location: WeatherLocation, temperatureUnit: WeatherTemperatureUnit = 'fahrenheit') =>
      request<WeatherSnapshot>('/api/weather/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, temperatureUnit }),
      }),
  },
};
