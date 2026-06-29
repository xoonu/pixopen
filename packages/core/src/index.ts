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
  createDarkFramePixels,
  getAppTemplate,
  migrateProjectType,
  normalizeFlipNoteAppConfig,
  normalizeStockTickerAppConfig,
  shouldUseFlipNoteUi,
  shouldUseStockTickerUi,
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

  if (resolvedTemplateId === 'flip-note') {
    project.appConfig = { ...DEFAULT_FLIP_NOTE_CONFIG };
    project.frames = [{ width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: createDarkFramePixels() }];
    project.liveAreas = [];
  } else if (resolvedTemplateId === 'stock-ticker') {
    project.appConfig = { ...DEFAULT_STOCK_TICKER_CONFIG };
    project.frames = [{ width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: createDarkFramePixels() }];
    project.liveAreas = [];
  } else if (template.type === 'image-frame') {
    project.appConfig = { ...DEFAULT_IMAGE_FRAME_CONFIG };
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
  const useFlipNote = !useStockTicker && shouldUseFlipNoteUi({
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
  } else if (useFlipNote) {
    templateId = 'flip-note';
    appConfig = { ...rawConfig, ...normalizeFlipNoteAppConfig(rawConfig) };
  } else if (!templateId) {
    templateId =
      type === 'image-frame' ? 'blank-image-frame' : type === 'live-sign' ? 'flip-note' : 'blank-animator';
    if (type === 'image-frame' && !rawConfig.mode) appConfig = { ...DEFAULT_IMAGE_FRAME_CONFIG };
  }

  let frames = raw.frames?.length ? raw.frames : [createEmptyFrame()];
  if ((useFlipNote || useStockTicker) && frames.length === 1 && isBlankFrame(frames[0])) {
    frames = [{ width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: createDarkFramePixels() }];
  }

  return {
    ...raw,
    type,
    templateId,
    appConfig,
    frames,
    liveAreas: useFlipNote || useStockTicker ? [] : (raw.liveAreas ?? []),
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
