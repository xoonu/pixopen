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

export type VestaNoteLetterColorMode = 'classic' | 'monochrome' | 'custom';

export type VestaNoteConfig = {
  messages: string[];
  /** How many rows appear on the board at once (messages rotate in groups). */
  boardLines: 1 | 2 | 3;
  letterColorMode: VestaNoteLetterColorMode;
  /** Hex color used when letterColorMode is custom. */
  letterColor: string;
  holdMs: number;
  flipMs: number;
};

export type ImageFrameConfig = {
  mode: 'single' | 'slideshow';
};

export const DEFAULT_VESTA_NOTE_CONFIG: VestaNoteConfig = {
  messages: ['HELLO', 'PIXOPEN', 'WELCOME'],
  boardLines: 1,
  letterColorMode: 'classic',
  letterColor: '#f4e4bc',
  holdMs: 4000,
  flipMs: 350,
};

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
    name: 'Live Sign',
    type: 'live-sign',
    category: 'blank',
    description: 'Build a display with live data regions — weather, time, stocks, and more.',
    icon: '📡',
  },
  {
    id: 'vesta-note',
    name: 'Vesta Note',
    type: 'live-sign',
    category: 'example',
    description: 'Split-flap letter board inspired by Vestaboard. Set your own rotating messages.',
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
      return 'Live Sign';
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

export function shouldUseVestaNoteUi(project: {
  templateId?: string | null;
  type?: string;
  name?: string;
  appConfig?: Record<string, unknown>;
}): boolean {
  if (project.templateId === 'vesta-note') return true;
  if (Array.isArray(project.appConfig?.messages)) return true;
  const type = migrateProjectType(project.type ?? 'animator');
  if (type === 'live-sign' && project.name && /vesta/i.test(project.name)) return true;
  return false;
}

export function normalizeVestaAppConfig(appConfig: Record<string, unknown> | undefined): VestaNoteConfig {
  const messages = Array.isArray(appConfig?.messages)
    ? (appConfig!.messages as unknown[]).map((m) => String(m)).filter(Boolean)
    : [];
  const boardLinesRaw = Number(appConfig?.boardLines ?? DEFAULT_VESTA_NOTE_CONFIG.boardLines);
  const boardLines = (boardLinesRaw === 2 || boardLinesRaw === 3 ? boardLinesRaw : 1) as 1 | 2 | 3;
  const colorModeRaw = String(appConfig?.letterColorMode ?? DEFAULT_VESTA_NOTE_CONFIG.letterColorMode);
  const letterColorMode =
    colorModeRaw === 'monochrome' || colorModeRaw === 'custom' ? colorModeRaw : 'classic';
  const letterColor =
    typeof appConfig?.letterColor === 'string' && appConfig.letterColor.trim()
      ? appConfig.letterColor.trim()
      : DEFAULT_VESTA_NOTE_CONFIG.letterColor;
  return {
    messages: messages.length > 0 ? messages : [...DEFAULT_VESTA_NOTE_CONFIG.messages],
    boardLines,
    letterColorMode,
    letterColor,
    holdMs: Number(appConfig?.holdMs ?? DEFAULT_VESTA_NOTE_CONFIG.holdMs),
    flipMs: Number(appConfig?.flipMs ?? DEFAULT_VESTA_NOTE_CONFIG.flipMs),
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
