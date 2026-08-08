export const CANVAS_SIZE = 64;

/** Default editor zoom — canvas display scale is relative to this level. */
export const EDITOR_CANVAS_BASE_ZOOM = 8;
export const EDITOR_CANVAS_DISPLAY_PX = CANVAS_SIZE * EDITOR_CANVAS_BASE_ZOOM;

/** Max frames extracted from a video clip (Pixoo deploy limit is ~40). */
export const MAX_VIDEO_IMPORT_FRAMES = 36;
export const DEFAULT_VIDEO_IMPORT_FRAMES = 24;
export const DEFAULT_VIDEO_IMPORT_FPS = 8;

export type Rect = { x: number; y: number; w: number; h: number };

export type Rgba = [number, number, number, number];

export type Frame = {
  width: typeof CANVAS_SIZE;
  height: typeof CANVAS_SIZE;
  /** Flat RGBA array length 64*64*4 */
  pixels: number[];
};

export type LiveArea = {
  id: string;
  rect: Rect;
  zIndex: number;
  datasourceId: string;
  widgetId: string;
  config: Record<string, unknown>;
  refreshPolicy: 'inherit' | { intervalMs: number };
};

import {
  DEFAULT_IMAGE_FRAME_CONFIG,
  DEFAULT_FLIP_NOTE_CONFIG,
  DEFAULT_STOCK_TICKER_CONFIG,
  DEFAULT_WEATHER_FRAME_CONFIG,
  DEFAULT_DVD_SCREENSAVER_CONFIG,
  DEFAULT_SPOTIFY_NOW_PLAYING_CONFIG,
  DEFAULT_AI_MUSE_CONFIG,
  DEFAULT_INSTAGRAM_FEED_CONFIG,
  createDarkFramePixels,
  createBlackFramePixels,
  getAppTemplate,
  listExampleLiveFrameTemplateIds,
  migrateProjectType,
  normalizeFlipNoteAppConfig,
  normalizeStockTickerAppConfig,
  normalizeWeatherFrameAppConfig,
  normalizeDvdScreensaverAppConfig,
  normalizeSpotifyNowPlayingAppConfig,
  normalizeAiMuseAppConfig,
  normalizeInstagramFeedAppConfig,
  shouldUseFlipNoteUi,
  shouldUseStockTickerUi,
  shouldUseWeatherUi,
  shouldUseDvdScreensaverUi,
  shouldUseSpotifyNowPlayingUi,
  shouldUseAiMuseUi,
  shouldUseInstagramFeedUi,
} from './apps.js';

export type ProjectType = 'image-frame' | 'animator' | 'live-sign';

export type Project = {
  id: string;
  name: string;
  type: ProjectType;
  /** Built-in or blank app template this project was created from */
  templateId: string | null;
  /** App-specific settings (e.g. Flip Note messages) */
  appConfig: Record<string, unknown>;
  frames: Frame[];
  liveAreas: LiveArea[];
  frameDurationMs: number;
  loop: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedDevice = {
  id: string;
  name: string;
  ip: string;
  source: 'discovered' | 'manual';
  lastSeenAt?: string;
};

export type DataSourceCategory =
  | 'time'
  | 'weather'
  | 'finance'
  | 'sports'
  | 'astronomy'
  | 'news'
  | 'other';

export type DataSourceMeta = {
  id: string;
  name: string;
  category: DataSourceCategory;
  requiresApiKey: boolean;
  defaultRefreshMs: number;
  description: string;
  configFields: Array<{
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    required?: boolean;
    options?: string[];
    default?: string | number | boolean;
  }>;
};

export type WidgetMeta = {
  id: string;
  name: string;
  description: string;
};

export function createEmptyFrame(): Frame {
  const pixels = new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isProjectNameAvailable(
  projects: Pick<Project, 'id' | 'name'>[],
  name: string,
  excludeId?: string,
): boolean {
  const normalized = normalizeProjectName(name).toLowerCase();
  if (!normalized) return false;
  return !projects.some(
    (p) => p.id !== excludeId && normalizeProjectName(p.name).toLowerCase() === normalized,
  );
}

export function generateUniqueProjectName(existingNames: string[], base: string): string {
  const trimmedBase = normalizeProjectName(base) || 'Untitled';
  const taken = new Set(existingNames.map((n) => normalizeProjectName(n).toLowerCase()));
  if (!taken.has(trimmedBase.toLowerCase())) return trimmedBase;
  let i = 2;
  while (taken.has(`${trimmedBase} ${i}`.toLowerCase())) i += 1;
  return `${trimmedBase} ${i}`;
}

export function defaultProjectName(type: ProjectType, existingNames: string[]): string {
  const base =
    type === 'live-sign' ? 'Live Frame' : type === 'image-frame' ? 'Image Frame' : 'Animation';
  return generateUniqueProjectName(existingNames, base);
}

export function createProject(name: string, type: ProjectType = 'animator'): Project {
  const now = new Date().toISOString();
  const templateId =
    type === 'image-frame'
      ? 'blank-image-frame'
      : type === 'live-sign'
        ? 'flip-note'
        : 'blank-animator';
  return {
    id: crypto.randomUUID(),
    name: normalizeProjectName(name) || 'Untitled',
    type,
    templateId,
    appConfig: type === 'image-frame' ? { mode: 'slideshow' } : {},
    frames: [createEmptyFrame()],
    liveAreas: [],
    frameDurationMs: 500,
    loop: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Prefab live-frame defaults keyed by templateId — keep in sync with APP_TEMPLATES examples. */
const PREFAB_LIVE_FRAME_SETUP: Record<
  string,
  { appConfig: Record<string, unknown>; frame: 'dark' | 'black' }
> = {
  'flip-note': { appConfig: { ...DEFAULT_FLIP_NOTE_CONFIG }, frame: 'dark' },
  'stock-ticker': { appConfig: { ...DEFAULT_STOCK_TICKER_CONFIG }, frame: 'dark' },
  'weather-frame': { appConfig: { ...DEFAULT_WEATHER_FRAME_CONFIG }, frame: 'dark' },
  'dvd-screensaver': { appConfig: { ...DEFAULT_DVD_SCREENSAVER_CONFIG }, frame: 'black' },
  'spotify-now-playing': { appConfig: { ...DEFAULT_SPOTIFY_NOW_PLAYING_CONFIG }, frame: 'black' },
  'ai-muse': { appConfig: { ...DEFAULT_AI_MUSE_CONFIG }, frame: 'black' },
  'instagram-feed': { appConfig: { ...DEFAULT_INSTAGRAM_FEED_CONFIG }, frame: 'black' },
};

/** Fail at server boot if an example Live Frame is listed without create defaults. */
export function assertPrefabLiveFrameSetupComplete(): void {
  const missing = listExampleLiveFrameTemplateIds().filter((id) => !PREFAB_LIVE_FRAME_SETUP[id]);
  if (missing.length === 0) return;
  throw new Error(
    `Live Frame template(s) missing PREFAB_LIVE_FRAME_SETUP: ${missing.join(', ')}. ` +
      `Add create defaults in packages/core/src/index.ts before registering in APP_TEMPLATES.`,
  );
}

export function createProjectFromTemplate(
  templateId: string,
  name: string,
  existingNames: string[],
): Project {
  const resolvedTemplateId = templateId === 'vesta-note' ? 'flip-note' : templateId;
  const template = getAppTemplate(resolvedTemplateId);
  if (!template) throw new Error(`Unknown app template: ${templateId}`);

  const projectName = name.trim() || defaultProjectName(template.type, existingNames);
  const project = createProject(projectName, template.type);
  project.templateId = resolvedTemplateId;

  const prefab = PREFAB_LIVE_FRAME_SETUP[resolvedTemplateId];
  if (prefab) {
    project.appConfig = { ...prefab.appConfig };
    project.frames = [{
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      pixels: prefab.frame === 'black' ? createBlackFramePixels() : createDarkFramePixels(),
    }];
    project.liveAreas = [];
  } else if (template.type === 'image-frame') {
    project.appConfig = { ...DEFAULT_IMAGE_FRAME_CONFIG };
  } else if (template.category === 'example') {
    // Fail loud — never silently create a blank animator/live-sign shell for a listed template.
    throw new Error(
      `Template "${resolvedTemplateId}" is registered but has no createProjectFromTemplate setup`,
    );
  }

  return project;
}

export function normalizeProject(raw: Project): Project {
  const type = migrateProjectType(raw.type as string);
  const rawConfig = (raw.appConfig ?? {}) as Record<string, unknown>;
  const useStockTicker = shouldUseStockTickerUi({
    templateId: raw.templateId,
    appConfig: rawConfig,
  });
  const useWeather = !useStockTicker && shouldUseWeatherUi({
    templateId: raw.templateId,
    appConfig: rawConfig,
  });
  const useDvd = !useStockTicker && !useWeather && shouldUseDvdScreensaverUi({
    templateId: raw.templateId,
  });
  const useSpotify = !useStockTicker && !useWeather && !useDvd && shouldUseSpotifyNowPlayingUi({
    templateId: raw.templateId,
  });
  const useAiMuse = !useStockTicker && !useWeather && !useDvd && !useSpotify && shouldUseAiMuseUi({
    templateId: raw.templateId,
  });
  const useInstagram = !useStockTicker && !useWeather && !useDvd && !useSpotify && !useAiMuse && shouldUseInstagramFeedUi({
    templateId: raw.templateId,
  });
  const useFlipNote = !useStockTicker && !useWeather && !useDvd && !useSpotify && !useAiMuse && !useInstagram && shouldUseFlipNoteUi({
    templateId: raw.templateId,
    type: raw.type as string,
    name: raw.name,
    appConfig: rawConfig,
  });

  let templateId = raw.templateId ?? null;
  let appConfig: Record<string, unknown> = rawConfig;

  if (useStockTicker) {
    templateId = 'stock-ticker';
    appConfig = { ...rawConfig, ...normalizeStockTickerAppConfig(rawConfig) };
  } else if (useWeather) {
    templateId = 'weather-frame';
    appConfig = { ...rawConfig, ...normalizeWeatherFrameAppConfig(rawConfig) };
  } else if (useDvd) {
    templateId = 'dvd-screensaver';
    appConfig = { ...rawConfig, ...normalizeDvdScreensaverAppConfig(rawConfig) };
  } else if (useSpotify) {
    templateId = 'spotify-now-playing';
    appConfig = { ...rawConfig, ...normalizeSpotifyNowPlayingAppConfig(rawConfig) };
  } else if (useAiMuse) {
    templateId = 'ai-muse';
    appConfig = { ...rawConfig, ...normalizeAiMuseAppConfig(rawConfig) };
  } else if (useInstagram) {
    templateId = 'instagram-feed';
    appConfig = { ...rawConfig, ...normalizeInstagramFeedAppConfig(rawConfig) };
  } else if (useFlipNote) {
    templateId = 'flip-note';
    appConfig = { ...rawConfig, ...normalizeFlipNoteAppConfig(rawConfig) };
  } else if (!templateId) {
    templateId =
      type === 'image-frame' ? 'blank-image-frame' : type === 'live-sign' ? 'flip-note' : 'blank-animator';
    if (type === 'image-frame' && !rawConfig.mode) appConfig = { ...DEFAULT_IMAGE_FRAME_CONFIG };
  }

  let frames = raw.frames?.length ? raw.frames : [createEmptyFrame()];
  if ((useFlipNote || useStockTicker || useWeather || useDvd || useSpotify || useAiMuse || useInstagram) && frames.length === 1 && isBlankFrame(frames[0])) {
    frames = [{
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      pixels: useDvd || useSpotify || useAiMuse || useInstagram ? createBlackFramePixels() : createDarkFramePixels(),
    }];
  }

  return {
    ...raw,
    type,
    templateId,
    appConfig,
    frames,
    liveAreas: useFlipNote || useStockTicker || useWeather || useDvd || useSpotify || useAiMuse || useInstagram ? [] : (raw.liveAreas ?? []),
  };
}

function isBlankFrame(frame: Frame): boolean {
  return frame.pixels.every((v, i) => (i % 4 === 3 ? v === 255 : v === 0));
}

export * from './apps.js';
export * from './stockTickerSparkline.js';
export * from './videoCrop.js';

export function clampRect(rect: Rect): Rect {
  const x = Math.max(0, Math.min(63, rect.x));
  const y = Math.max(0, Math.min(63, rect.y));
  const w = Math.max(1, Math.min(CANVAS_SIZE - x, rect.w));
  const h = Math.max(1, Math.min(CANVAS_SIZE - y, rect.h));
  return { x, y, w, h };
}
