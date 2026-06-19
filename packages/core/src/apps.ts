export type AppTemplateCategory = 'blank' | 'example';

export type ProjectType = 'image-frame' | 'animator' | 'live-sign';

export type AppTemplate = {
  id: string;
  name: string;
  type: ProjectType;
  category: AppTemplateCategory;
  description: string;
  icon: string;
};

export type FlipNoteTextAlign = 'left' | 'center' | 'right';

export type FlipNoteBackgroundMode = 'solid' | 'gradient';

/** Anchor point for the gradient line (start color sits toward the angle origin). */
export type FlipNoteGradientOrigin =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/** @deprecated Legacy preset — migrated to textColor / backgroundColor on load. */
export type FlipNoteLetterColorMode = 'classic' | 'monochrome' | 'custom';

export type FlipNoteConfig = {
  messages: string[];
  /** How many rows appear on the board at once (messages rotate in groups). */
  boardLines: 1 | 2 | 3;
  /** Horizontal alignment of each message row on the board. */
  textAlign: FlipNoteTextAlign;
  /** Hex color for message letters. */
  textColor: string;
  backgroundMode: FlipNoteBackgroundMode;
  /** Solid fill, or gradient start color when backgroundMode is gradient. */
  backgroundColor: string;
  /** Gradient end color (CSS angle flows from start toward end). */
  backgroundGradientEnd: string;
  /** Gradient direction in CSS degrees (0 = up, 90 = right, 180 = down). */
  backgroundGradientAngle: number;
  backgroundGradientOrigin: FlipNoteGradientOrigin;
  holdMs: number;
  flipMs: number;
};

export type ImageFrameConfig = {
  mode: 'single' | 'slideshow';
};

export const DEFAULT_FLIP_NOTE_CONFIG: FlipNoteConfig = {
  messages: ['HELLO', 'PIXOPEN', 'WELCOME'],
  boardLines: 1,
  textAlign: 'left',
  textColor: '#f4e4bc',
  backgroundMode: 'solid',
  backgroundColor: '#12141c',
  backgroundGradientEnd: '#0a0c12',
  backgroundGradientAngle: 180,
  backgroundGradientOrigin: 'center',
  holdMs: 4000,
  flipMs: 350,
};

const FLIP_NOTE_GRADIENT_ORIGINS = new Set<FlipNoteGradientOrigin>([
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

export const DEFAULT_IMAGE_FRAME_CONFIG: ImageFrameConfig = {
  mode: 'slideshow',
};

export const APP_TEMPLATES: AppTemplate[] = [
  {
    id: 'blank-image-frame',
    name: 'Image Frame',
    type: 'image-frame',
    category: 'blank',
    description: 'Display a still image or cycle through a slideshow of photos.',
    icon: '🖼',
  },
  {
    id: 'blank-animator',
    name: 'Animator',
    type: 'animator',
    category: 'blank',
    description: 'Draw pixel frames, import GIFs, or convert video into animation loops.',
    icon: '🎬',
  },
  {
    id: 'blank-live-sign',
    name: 'Live Frame',
    type: 'live-sign',
    category: 'blank',
    description: 'Build a display with live data regions — weather, time, stocks, and more.',
    icon: '📡',
  },
  {
    id: 'flip-note',
    name: 'Flip Note',
    type: 'live-sign',
    category: 'example',
    description: 'Split-flap letter board with rotating messages you can customize.',
    icon: '📋',
  },
];

export function getAppTemplate(id: string): AppTemplate | undefined {
  return APP_TEMPLATES.find((t) => t.id === id);
}

export function projectTypeLabel(type: ProjectType): string {
  switch (type) {
    case 'image-frame':
      return 'Image Frame';
    case 'animator':
      return 'Animator';
    case 'live-sign':
      return 'Live Frame';
    default:
      return 'Project';
  }
}

export function migrateProjectType(type: string): ProjectType {
  if (type === 'animation') return 'animator';
  if (type === 'live') return 'live-sign';
  if (type === 'image-frame' || type === 'animator' || type === 'live-sign') return type;
  return 'animator';
}

const LEGACY_FLIP_NOTE_TEMPLATE_IDS = new Set(['flip-note', 'vesta-note']);

export function shouldUseFlipNoteUi(project: {
  templateId?: string | null;
  type?: string;
  name?: string;
  appConfig?: Record<string, unknown>;
}): boolean {
  if (project.templateId && LEGACY_FLIP_NOTE_TEMPLATE_IDS.has(project.templateId)) return true;
  if (Array.isArray(project.appConfig?.messages)) return true;
  const type = migrateProjectType(project.type ?? 'animator');
  if (type === 'live-sign' && project.name && /flip note|vesta note/i.test(project.name)) return true;
  return false;
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  let trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith('#')) trimmed = `#${trimmed}`;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const h = trimmed.slice(1);
    trimmed = `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

function legacyFlipNoteColors(appConfig: Record<string, unknown>): Pick<FlipNoteConfig, 'textColor' | 'backgroundColor'> {
  const modeRaw = String(appConfig.letterColorMode ?? 'classic');
  const letterColor = normalizeHexColor(appConfig.letterColor, DEFAULT_FLIP_NOTE_CONFIG.textColor);
  if (modeRaw === 'monochrome') {
    return { textColor: '#ffffff', backgroundColor: '#202020' };
  }
  if (modeRaw === 'custom') {
    return { textColor: letterColor, backgroundColor: DEFAULT_FLIP_NOTE_CONFIG.backgroundColor };
  }
  return {
    textColor: DEFAULT_FLIP_NOTE_CONFIG.textColor,
    backgroundColor: DEFAULT_FLIP_NOTE_CONFIG.backgroundColor,
  };
}

export function normalizeFlipNoteAppConfig(appConfig: Record<string, unknown> | undefined): FlipNoteConfig {
  const raw = appConfig ?? {};
  const messages = Array.isArray(raw.messages)
    ? (raw.messages as unknown[]).map((m) => (m == null ? '' : String(m)))
    : [];
  const boardLinesRaw = Number(raw.boardLines ?? DEFAULT_FLIP_NOTE_CONFIG.boardLines);
  const boardLines = (boardLinesRaw === 2 || boardLinesRaw === 3 ? boardLinesRaw : 1) as 1 | 2 | 3;
  const legacyColors = legacyFlipNoteColors(raw);
  const textColor = raw.textColor != null
    ? normalizeHexColor(raw.textColor, legacyColors.textColor)
    : legacyColors.textColor;
  const backgroundColor = raw.backgroundColor != null
    ? normalizeHexColor(raw.backgroundColor, legacyColors.backgroundColor)
    : legacyColors.backgroundColor;
  const alignRaw = String(raw.textAlign ?? DEFAULT_FLIP_NOTE_CONFIG.textAlign);
  const textAlign =
    alignRaw === 'center' || alignRaw === 'right' ? alignRaw : 'left';
  const backgroundMode = String(raw.backgroundMode ?? DEFAULT_FLIP_NOTE_CONFIG.backgroundMode) === 'gradient'
    ? 'gradient'
    : 'solid';
  const backgroundGradientEnd = normalizeHexColor(
    raw.backgroundGradientEnd,
    DEFAULT_FLIP_NOTE_CONFIG.backgroundGradientEnd,
  );
  const angleRaw = Number(raw.backgroundGradientAngle ?? DEFAULT_FLIP_NOTE_CONFIG.backgroundGradientAngle);
  const backgroundGradientAngle = Number.isFinite(angleRaw)
    ? ((angleRaw % 360) + 360) % 360
    : DEFAULT_FLIP_NOTE_CONFIG.backgroundGradientAngle;
  const originRaw = String(raw.backgroundGradientOrigin ?? DEFAULT_FLIP_NOTE_CONFIG.backgroundGradientOrigin);
  const backgroundGradientOrigin = FLIP_NOTE_GRADIENT_ORIGINS.has(originRaw as FlipNoteGradientOrigin)
    ? (originRaw as FlipNoteGradientOrigin)
    : DEFAULT_FLIP_NOTE_CONFIG.backgroundGradientOrigin;
  return {
    messages: messages.length > 0 ? messages : [...DEFAULT_FLIP_NOTE_CONFIG.messages],
    boardLines,
    textAlign,
    textColor,
    backgroundMode,
    backgroundColor,
    backgroundGradientEnd,
    backgroundGradientAngle,
    backgroundGradientOrigin,
    holdMs: Number(raw.holdMs ?? DEFAULT_FLIP_NOTE_CONFIG.holdMs),
    flipMs: Number(raw.flipMs ?? DEFAULT_FLIP_NOTE_CONFIG.flipMs),
  };
}

export function createDarkFramePixels(): number[] {
  const pixels = new Array(64 * 64 * 4).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 18;
    pixels[i + 1] = 20;
    pixels[i + 2] = 28;
    pixels[i + 3] = 255;
  }
  return pixels;
}
