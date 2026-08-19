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

/** Pixel = Bitcount-style dots; Figtree = soft Bold sans (cleaner at 64×64). */
export type FlipNoteFontStyle = 'pixel' | 'figtree';

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
  /** Typeface for message letters. */
  fontStyle: FlipNoteFontStyle;
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
  /**
   * @deprecated Unused — messages hard-cut on holdMs (kept for older project JSON).
   */
  flipMs: number;
};

export type ImageFrameConfig = {
  mode: 'single' | 'slideshow';
};

export type StockTickerPerformancePeriod = '1d' | '1w' | '1m' | 'ytd';
export type StockTickerDisplayMode = 'rotate' | 'dashboard' | 'list';
export type StockTickerTheme = 'terminal' | 'minimal' | 'market';

export type StockTickerSymbol = {
  symbol: string;
  label?: string;
};

export type StockTickerColors = {
  background: string;
  text: string;
  up: string;
  down: string;
  flat: string;
  accent: string;
};

export type StockTickerConfig = {
  symbols: StockTickerSymbol[];
  displayMode: StockTickerDisplayMode;
  performancePeriod: StockTickerPerformancePeriod;
  showSparkline: boolean;
  showSymbol: boolean;
  showPrice: boolean;
  showChange: boolean;
  holdMs: number;
  theme: StockTickerTheme;
  colors: StockTickerColors;
  /** Optional Finnhub API key for live quotes (falls back to FINNHUB_API_KEY env). */
  finnhubApiKey?: string;
};

export type StockQuoteSnapshot = {
  symbol: string;
  price: number;
  changePct: number;
  sparkline: number[];
  fetchedAt: string;
};

export type WeatherLocation = {
  name: string;
  admin1?: string;
  country?: string;
  lat: number;
  lon: number;
  timezone?: string;
};

export type WeatherTemperatureUnit = 'fahrenheit' | 'celsius';
export type WeatherFrameTheme = 'sky' | 'night' | 'minimal';

export type WeatherFrameColors = {
  background: string;
  text: string;
  accent: string;
  muted: string;
};

export type WeatherFrameConfig = {
  /**
   * @deprecated Prefer `locations`. Older projects may still store a single location here;
   * normalize migrates it into `locations`.
   */
  location?: WeatherLocation;
  /** Places to cycle on the board (order preserved). */
  locations: WeatherLocation[];
  temperatureUnit: WeatherTemperatureUnit;
  /** How long each location stays on screen before the next. */
  holdMs: number;
  theme: WeatherFrameTheme;
  colors: WeatherFrameColors;
};

export const MAX_WEATHER_LOCATIONS = 8;

export type WeatherCurrentSnapshot = {
  temp: number;
  weatherCode: number;
  humidity?: number;
  windSpeed?: number;
};

export type WeatherHourlySnapshot = {
  time: string;
  temp: number;
  weatherCode: number;
  precipProb?: number;
};

export type WeatherDailySnapshot = {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
};

export type WeatherSnapshot = {
  location: WeatherLocation;
  current: WeatherCurrentSnapshot;
  hourly: WeatherHourlySnapshot[];
  daily: WeatherDailySnapshot[];
  radarPixels?: number[];
  fetchedAt: string;
};

export type DvdCornerSensitivity = 1 | 4 | 10;

export type DvdScreensaverConfig = {
  speedPxPerSec: number;
  /** 1 = crisp jumps, 10 = slower motion + motion trail for low device fps. */
  smoothness: number;
  logoScale: 1 | 2;
  cornerSensitivity: DvdCornerSensitivity;
  seed: number;
};

export const DEFAULT_DVD_SCREENSAVER_CONFIG: DvdScreensaverConfig = {
  speedPxPerSec: 22,
  smoothness: 7,
  logoScale: 1,
  cornerSensitivity: 4,
  seed: 42_069,
};

export type OnAirMessage = 'on-air' | 'in-a-meeting' | 'recording' | 'do-not-disturb';

export type OnAirConfig = {
  message: OnAirMessage;
  /** Soft glow brightness pulse; on by default. */
  pulse: boolean;
};

export const ON_AIR_MESSAGES: OnAirMessage[] = [
  'on-air',
  'in-a-meeting',
  'recording',
  'do-not-disturb',
];

export const ON_AIR_MESSAGE_LABELS: Record<OnAirMessage, string> = {
  'on-air': 'ON AIR',
  'in-a-meeting': 'IN A MEETING',
  recording: 'RECORDING',
  'do-not-disturb': 'DO NOT DISTURB',
};

export const DEFAULT_ON_AIR_CONFIG: OnAirConfig = {
  message: 'on-air',
  pulse: true,
};

/** Zero-config once Spotify credentials are saved in the project UI. */
export type SpotifyNowPlayingConfig = Record<string, never>;

export type SpotifyPlaybackSource = 'playing' | 'recent' | 'logo' | 'error';

export type SpotifyNowPlayingSnapshot = {
  source: SpotifyPlaybackSource;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  imageUrl?: string | null;
  /** Full 64×64 RGBA when art/logo is available. */
  pixels: number[];
  fetchedAt: string;
  error?: string;
};

export const DEFAULT_SPOTIFY_NOW_PLAYING_CONFIG: SpotifyNowPlayingConfig = {};

export type AiMuseEthnicity =
  | 'any'
  | 'east-asian'
  | 'south-asian'
  | 'black'
  | 'white'
  | 'latina'
  | 'middle-eastern'
  | 'mixed';

export type AiMuseEyeColor =
  | 'any'
  | 'brown'
  | 'blue'
  | 'green'
  | 'hazel'
  | 'gray'
  | 'amber';

export type AiMuseHairColor =
  | 'any'
  | 'black'
  | 'brown'
  | 'blonde'
  | 'red'
  | 'auburn'
  | 'gray';

export type AiMuseHairLength = 'any' | 'short' | 'medium' | 'long';

export type AiMuseSetting =
  | 'cafe'
  | 'beach'
  | 'city'
  | 'studio'
  | 'forest'
  | 'rooftop'
  | 'garden'
  | 'library';

/** Lightweight playlist entry persisted in project appConfig. */
export type AiMuseFeedItem = {
  id: string;
  url: string;
  width: number;
  height: number;
};

export type AiMuseSources = {
  /** Live Civitai photoreal galleries. */
  civitai: boolean;
  /** Local files in data/ai-muse/library. */
  library: boolean;
};

export type AiMuseConfig = {
  ageMin: number;
  ageMax: number;
  /** Empty = any ethnicity. */
  ethnicities: Array<Exclude<AiMuseEthnicity, 'any'>>;
  eyeColor: AiMuseEyeColor;
  hairColor: AiMuseHairColor;
  hairLength: AiMuseHairLength;
  settings: AiMuseSetting[];
  refreshSeconds: number;
  /** How many live candidates to pull when filling / refreshing the feed. */
  poolSize: number;
  /** Which candidate sources to use when filling the feed. */
  sources: AiMuseSources;
  /** Curated playlist shown in settings; device cycles these in order. */
  feed: AiMuseFeedItem[];
  /** Removed / disliked image ids — excluded from future fills. */
  blockedIds: string[];
};

export const MAX_AI_MUSE_FEED = 96;
export const MAX_AI_MUSE_BLOCKED = 300;
export const MAX_AI_MUSE_POOL = 80;

export type AiMuseCatalogNsfwLevel = 'None';

export type AiMuseCatalogEntry = {
  id: string;
  url: string;
  width: number;
  height: number;
  nsfwLevel: AiMuseCatalogNsfwLevel;
  ethnicity?: Exclude<AiMuseEthnicity, 'any'>;
  eyeColor?: Exclude<AiMuseEyeColor, 'any'>;
  hairColor?: Exclude<AiMuseHairColor, 'any'>;
  hairLength?: Exclude<AiMuseHairLength, 'any'>;
  ageMin?: number;
  ageMax?: number;
  settings: AiMuseSetting[];
  tags: string[];
  ingestedAt: string;
};

export type AiMuseSnapshot = {
  imageId?: string;
  url?: string;
  /** Full 64×64 RGBA when an image is available. */
  pixels: number[];
  /** Requested live candidate pool size. */
  poolSize: number;
  /** Candidates fetched this refresh (after quality filters). */
  candidateCount: number;
  /** Candidates that also matched look preferences. */
  matchCount: number;
  fetchedAt: string;
  error?: string;
};

/** Playlist entry for Instagram Feed live frames. */
export type InstagramFeedItem = {
  id: string;
  username: string;
  url: string;
  width: number;
  height: number;
  takenAt?: string;
};

export type InstagramAccountStatus = {
  username: string;
  ok: boolean;
  imageCount: number;
  error?: string;
};

export type InstagramFeedConfig = {
  /** Public Instagram usernames (no @), max 10. */
  accounts: string[];
  /** On-device image cycle interval. */
  refreshSeconds: number;
  /** How often to re-fetch account posts (minutes). */
  feedPollMinutes: number;
  /** Curated playlist shown in settings; device cycles these in order. */
  feed: InstagramFeedItem[];
  /** Removed / disliked image ids — excluded from future fills. */
  blockedIds: string[];
};

export type InstagramFeedSnapshot = {
  imageId?: string;
  url?: string;
  username?: string;
  /** Full 64×64 RGBA when an image is available. */
  pixels: number[];
  feedSize: number;
  fetchedAt: string;
  error?: string;
};

export const MAX_INSTAGRAM_ACCOUNTS = 10;
export const MAX_INSTAGRAM_FEED = 100;
export const MAX_INSTAGRAM_BLOCKED = 300;

export const DEFAULT_INSTAGRAM_FEED_CONFIG: InstagramFeedConfig = {
  accounts: [],
  refreshSeconds: 10,
  feedPollMinutes: 60,
  feed: [],
  blockedIds: [],
};

export const AI_MUSE_ETHNICITIES: AiMuseEthnicity[] = [
  'any',
  'east-asian',
  'south-asian',
  'black',
  'white',
  'latina',
  'middle-eastern',
  'mixed',
];

export const AI_MUSE_EYE_COLORS: AiMuseEyeColor[] = [
  'any',
  'brown',
  'blue',
  'green',
  'hazel',
  'gray',
  'amber',
];

export const AI_MUSE_HAIR_COLORS: AiMuseHairColor[] = [
  'any',
  'black',
  'brown',
  'blonde',
  'red',
  'auburn',
  'gray',
];

export const AI_MUSE_HAIR_LENGTHS: AiMuseHairLength[] = ['any', 'short', 'medium', 'long'];

export const AI_MUSE_SETTINGS: AiMuseSetting[] = [
  'cafe',
  'beach',
  'city',
  'studio',
  'forest',
  'rooftop',
  'garden',
  'library',
];

export const AI_MUSE_ETHNICITY_OPTIONS: Array<Exclude<AiMuseEthnicity, 'any'>> = [
  'east-asian',
  'south-asian',
  'black',
  'white',
  'latina',
  'middle-eastern',
  'mixed',
];

export const DEFAULT_AI_MUSE_SOURCES: AiMuseSources = {
  civitai: true,
  library: true,
};

export const DEFAULT_AI_MUSE_CONFIG: AiMuseConfig = {
  ageMin: 18,
  ageMax: 65,
  ethnicities: [],
  eyeColor: 'any',
  hairColor: 'any',
  hairLength: 'any',
  settings: [],
  refreshSeconds: 10,
  poolSize: 36,
  sources: { ...DEFAULT_AI_MUSE_SOURCES },
  feed: [],
  blockedIds: [],
};

export const MAX_STOCK_TICKER_SYMBOLS = 32;

export const DEFAULT_STOCK_TICKER_SYMBOLS: StockTickerSymbol[] = [
  { symbol: 'AAPL' },
  { symbol: 'MSFT' },
  { symbol: 'GOOGL' },
  { symbol: 'TSLA' },
];

const DEFAULT_STOCK_TICKER_COLORS: StockTickerColors = {
  background: '#0a0e14',
  text: '#c8d4e0',
  up: '#3dd68c',
  down: '#f07178',
  flat: '#8a919a',
  accent: '#59c2ff',
};

export const DEFAULT_STOCK_TICKER_CONFIG: StockTickerConfig = {
  symbols: [...DEFAULT_STOCK_TICKER_SYMBOLS],
  displayMode: 'rotate',
  performancePeriod: '1d',
  showSparkline: true,
  showSymbol: true,
  showPrice: true,
  showChange: true,
  holdMs: 4000,
  theme: 'terminal',
  colors: { ...DEFAULT_STOCK_TICKER_COLORS },
};

const DEFAULT_WEATHER_FRAME_COLORS: WeatherFrameColors = {
  background: '#0c1824',
  text: '#e8f0f8',
  accent: '#59c2ff',
  muted: '#6a8499',
};

export const DEFAULT_WEATHER_FRAME_CONFIG: WeatherFrameConfig = {
  locations: [],
  temperatureUnit: 'fahrenheit',
  holdMs: 6000,
  theme: 'sky',
  colors: { ...DEFAULT_WEATHER_FRAME_COLORS },
};

export const DEFAULT_FLIP_NOTE_CONFIG: FlipNoteConfig = {
  messages: ['HELLO', 'PIXOPEN', 'WELCOME'],
  boardLines: 1,
  textAlign: 'left',
  fontStyle: 'pixel',
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
    id: 'flip-note',
    name: 'Flip Note',
    type: 'live-sign',
    category: 'example',
    description: 'Rotating message board with customizable lines and fonts.',
    icon: '📋',
  },
  {
    id: 'stock-ticker',
    name: 'Stock Ticker',
    type: 'live-sign',
    category: 'example',
    description: 'Live stock watchlist with rotating quotes, performance, and sparklines.',
    icon: '📈',
  },
  {
    id: 'weather-frame',
    name: 'Weather',
    type: 'live-sign',
    category: 'example',
    description: 'Live current weather for a location — temp, conditions, humidity, and wind.',
    icon: '🌤',
  },
  {
    id: 'dvd-screensaver',
    name: 'DVD Screensaver',
    type: 'live-sign',
    category: 'example',
    description: 'The classic bouncing DVD logo — angular paths, edge bounces, corner-hit drama.',
    icon: '💿',
  },
  {
    id: 'spotify-now-playing',
    name: 'Spotify',
    type: 'live-sign',
    category: 'example',
    description: 'Full-bleed album art for what you’re listening to on Spotify (or your last played track).',
    icon: '🎧',
  },
  {
    id: 'ai-muse',
    name: 'AI Muse',
    type: 'live-sign',
    category: 'example',
    description: 'Cycle a feed of square SFW AI portraits matched to your look preferences.',
    icon: '◇',
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    type: 'live-sign',
    category: 'example',
    description: 'Cycle recent static photos from public Instagram accounts you choose.',
    icon: '▣',
  },
  {
    id: 'on-air',
    name: 'On Air',
    type: 'live-sign',
    category: 'example',
    description: 'Retro shadow-box status sign — ON AIR, in a meeting, recording, or do not disturb.',
    icon: '⏺',
  },
];

export function getAppTemplate(id: string): AppTemplate | undefined {
  return APP_TEMPLATES.find((t) => t.id === id);
}

/** Example Live Frame template ids from APP_TEMPLATES (must have create + studio wiring). */
export function listExampleLiveFrameTemplateIds(): string[] {
  return APP_TEMPLATES
    .filter((t) => t.category === 'example' && t.type === 'live-sign')
    .map((t) => t.id);
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

export function shouldUseStockTickerUi(project: {
  templateId?: string | null;
  appConfig?: Record<string, unknown>;
}): boolean {
  if (project.templateId === 'stock-ticker') return true;
  return Array.isArray(project.appConfig?.symbols);
}

function locationKey(loc: WeatherLocation): string {
  return `${loc.lat.toFixed(4)}:${loc.lon.toFixed(4)}`;
}

/** Resolved location list (supports legacy single `location`). */
export function weatherFrameLocations(config: WeatherFrameConfig): WeatherLocation[] {
  if (config.locations.length > 0) return config.locations;
  return config.location ? [config.location] : [];
}

function hasWeatherLocation(appConfig?: Record<string, unknown>): boolean {
  if (Array.isArray(appConfig?.locations) && appConfig.locations.length > 0) {
    return appConfig.locations.some((entry) => Boolean(parseWeatherLocation(entry)));
  }
  const loc = appConfig?.location;
  if (!loc || typeof loc !== 'object') return false;
  const obj = loc as Record<string, unknown>;
  return Number.isFinite(Number(obj.lat)) && Number.isFinite(Number(obj.lon));
}

export function shouldUseWeatherUi(project: {
  templateId?: string | null;
  appConfig?: Record<string, unknown>;
}): boolean {
  if (project.templateId === 'weather-frame') return true;
  return hasWeatherLocation(project.appConfig);
}

export function shouldUseDvdScreensaverUi(project: {
  templateId?: string | null;
}): boolean {
  return project.templateId === 'dvd-screensaver';
}

export function shouldUseSpotifyNowPlayingUi(project: {
  templateId?: string | null;
}): boolean {
  return project.templateId === 'spotify-now-playing';
}

export function shouldUseAiMuseUi(project: {
  templateId?: string | null;
}): boolean {
  return project.templateId === 'ai-muse';
}

export function shouldUseInstagramFeedUi(project: {
  templateId?: string | null;
}): boolean {
  return project.templateId === 'instagram-feed';
}

export function shouldUseOnAirUi(project: {
  templateId?: string | null;
}): boolean {
  return project.templateId === 'on-air';
}

/**
 * True for built-in Live Frame examples (Flip Note, Instagram Feed, etc.).
 * These must never fall through to the blank drawing / live-region editor.
 */
export function isPrefabLiveFrame(project: {
  templateId?: string | null;
}): boolean {
  if (!project.templateId) return false;
  const template = getAppTemplate(project.templateId);
  return Boolean(template && template.category === 'example' && template.type === 'live-sign');
}

export function shouldUseFlipNoteUi(project: {
  templateId?: string | null;
  type?: string;
  name?: string;
  appConfig?: Record<string, unknown>;
}): boolean {
  if (shouldUseStockTickerUi(project)) return false;
  if (shouldUseWeatherUi(project)) return false;
  if (shouldUseDvdScreensaverUi(project)) return false;
  if (shouldUseSpotifyNowPlayingUi(project)) return false;
  if (shouldUseAiMuseUi(project)) return false;
  if (shouldUseInstagramFeedUi(project)) return false;
  if (shouldUseOnAirUi(project)) return false;
  if (project.templateId && LEGACY_FLIP_NOTE_TEMPLATE_IDS.has(project.templateId)) return true;
  if (Array.isArray(project.appConfig?.messages)) return true;
  const type = migrateProjectType(project.type ?? 'animator');
  if (type === 'live-sign' && project.name && /flip note|vesta note/i.test(project.name)) return true;
  return false;
}

function parseStockSymbols(raw: unknown): StockTickerSymbol[] {
  if (!Array.isArray(raw)) return [];
  const out: StockTickerSymbol[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const symbol = item.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 8);
      if (symbol) out.push({ symbol });
      continue;
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      const symbol = String(obj.symbol ?? '').trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 8);
      if (!symbol) {
        out.push({ symbol: '' });
        continue;
      }
      const label = obj.label != null ? String(obj.label).trim().slice(0, 12) : undefined;
      out.push(label ? { symbol, label } : { symbol });
    }
  }
  const seen = new Set<string>();
  const unique: StockTickerSymbol[] = [];
  for (const entry of out) {
    if (entry.symbol) {
      if (seen.has(entry.symbol)) continue;
      seen.add(entry.symbol);
    }
    unique.push(entry);
    if (unique.length >= MAX_STOCK_TICKER_SYMBOLS) break;
  }
  return unique;
}

export function stockTickerQuoteSymbols(symbols: StockTickerSymbol[]): string[] {
  return [...new Set(symbols.map((s) => s.symbol.trim().toUpperCase()).filter(Boolean))];
}

export function normalizeStockTickerAppConfig(appConfig: Record<string, unknown> | undefined): StockTickerConfig {
  const raw = appConfig ?? {};
  const symbols = parseStockSymbols(raw.symbols);
  const displayRaw = String(raw.displayMode ?? DEFAULT_STOCK_TICKER_CONFIG.displayMode);
  const displayMode: StockTickerDisplayMode =
    displayRaw === 'dashboard' ? 'dashboard' : displayRaw === 'list' ? 'list' : 'rotate';
  const periodRaw = String(raw.performancePeriod ?? DEFAULT_STOCK_TICKER_CONFIG.performancePeriod);
  const performancePeriod: StockTickerPerformancePeriod =
    periodRaw === '1w' || periodRaw === '1m' || periodRaw === 'ytd' ? periodRaw : '1d';
  const themeRaw = String(raw.theme ?? DEFAULT_STOCK_TICKER_CONFIG.theme);
  const theme: StockTickerTheme =
    themeRaw === 'minimal' || themeRaw === 'market' ? themeRaw : 'terminal';
  const colorsRaw = raw.colors && typeof raw.colors === 'object' ? (raw.colors as Record<string, unknown>) : {};
  const colors: StockTickerColors = {
    background: normalizeHexColor(colorsRaw.background, DEFAULT_STOCK_TICKER_COLORS.background),
    text: normalizeHexColor(colorsRaw.text, DEFAULT_STOCK_TICKER_COLORS.text),
    up: normalizeHexColor(colorsRaw.up, DEFAULT_STOCK_TICKER_COLORS.up),
    down: normalizeHexColor(colorsRaw.down, DEFAULT_STOCK_TICKER_COLORS.down),
    flat: normalizeHexColor(colorsRaw.flat, DEFAULT_STOCK_TICKER_COLORS.flat),
    accent: normalizeHexColor(colorsRaw.accent, DEFAULT_STOCK_TICKER_COLORS.accent),
  };
  const holdMs = Number(raw.holdMs ?? DEFAULT_STOCK_TICKER_CONFIG.holdMs);
  const finnhubApiKey =
    typeof raw.finnhubApiKey === 'string' && raw.finnhubApiKey.trim()
      ? raw.finnhubApiKey.trim()
      : undefined;
  return {
    symbols: symbols.length > 0 ? symbols : [...DEFAULT_STOCK_TICKER_SYMBOLS],
    displayMode,
    performancePeriod,
    showSparkline: raw.showSparkline !== false,
    showSymbol: raw.showSymbol !== false,
    showPrice: raw.showPrice !== false,
    showChange: raw.showChange !== false,
    holdMs: Number.isFinite(holdMs) ? Math.max(1500, Math.min(15000, holdMs)) : 4000,
    theme,
    colors,
    ...(finnhubApiKey ? { finnhubApiKey } : {}),
  };
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
  const fontRaw = String(raw.fontStyle ?? DEFAULT_FLIP_NOTE_CONFIG.fontStyle);
  // Legacy projects saved `quicksand` before Figtree replaced it.
  const fontStyle: FlipNoteFontStyle =
    fontRaw === 'figtree' || fontRaw === 'quicksand' ? 'figtree' : 'pixel';
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
    fontStyle,
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

function parseWeatherLocation(raw: unknown): WeatherLocation | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const lat = Number(obj.lat);
  const lon = Number(obj.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  const name = String(obj.name ?? '').trim().slice(0, 48);
  if (!name) return undefined;
  const admin1 = obj.admin1 != null ? String(obj.admin1).trim().slice(0, 48) : undefined;
  const country = obj.country != null ? String(obj.country).trim().slice(0, 48) : undefined;
  const timezone = obj.timezone != null ? String(obj.timezone).trim().slice(0, 64) : undefined;
  return {
    name,
    lat,
    lon,
    ...(admin1 ? { admin1 } : {}),
    ...(country ? { country } : {}),
    ...(timezone ? { timezone } : {}),
  };
}

const WEATHER_THEME_PRESETS: Record<WeatherFrameTheme, WeatherFrameColors> = {
  sky: {
    background: '#0c1824',
    text: '#e8f0f8',
    accent: '#59c2ff',
    muted: '#6a8499',
  },
  night: {
    background: '#0a0e18',
    text: '#c8d0e0',
    accent: '#8899ff',
    muted: '#556677',
  },
  minimal: {
    background: '#111111',
    text: '#eeeeee',
    accent: '#cccccc',
    muted: '#888888',
  },
};

export function normalizeWeatherFrameAppConfig(
  appConfig: Record<string, unknown> | undefined,
): WeatherFrameConfig {
  const raw = appConfig ?? {};
  const fromArray = Array.isArray(raw.locations)
    ? (raw.locations as unknown[])
        .map((entry) => parseWeatherLocation(entry))
        .filter((loc): loc is WeatherLocation => Boolean(loc))
    : [];
  const legacy = parseWeatherLocation(raw.location);
  const merged = fromArray.length > 0 ? fromArray : legacy ? [legacy] : [];
  const seen = new Set<string>();
  const locations: WeatherLocation[] = [];
  for (const loc of merged) {
    const key = locationKey(loc);
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push(loc);
    if (locations.length >= MAX_WEATHER_LOCATIONS) break;
  }
  const unitRaw = String(raw.temperatureUnit ?? DEFAULT_WEATHER_FRAME_CONFIG.temperatureUnit);
  const temperatureUnit: WeatherTemperatureUnit = unitRaw === 'celsius' ? 'celsius' : 'fahrenheit';
  const themeRaw = String(raw.theme ?? DEFAULT_WEATHER_FRAME_CONFIG.theme);
  const theme: WeatherFrameTheme =
    themeRaw === 'night' || themeRaw === 'minimal' ? themeRaw : 'sky';
  const colorsRaw = raw.colors && typeof raw.colors === 'object' ? (raw.colors as Record<string, unknown>) : {};
  const preset = WEATHER_THEME_PRESETS[theme];
  const colors: WeatherFrameColors = {
    background: normalizeHexColor(colorsRaw.background, preset.background),
    text: normalizeHexColor(colorsRaw.text, preset.text),
    accent: normalizeHexColor(colorsRaw.accent, preset.accent),
    muted: normalizeHexColor(colorsRaw.muted, preset.muted),
  };
  const holdMs = Number(raw.holdMs ?? DEFAULT_WEATHER_FRAME_CONFIG.holdMs);
  return {
    locations,
    temperatureUnit,
    holdMs: Number.isFinite(holdMs) ? Math.max(3000, Math.min(15000, holdMs)) : 6000,
    theme,
    colors,
  };
}

export function normalizeDvdScreensaverAppConfig(
  appConfig: Record<string, unknown> | undefined,
): DvdScreensaverConfig {
  const raw = appConfig ?? {};
  const speedRaw = Number(raw.speedPxPerSec ?? DEFAULT_DVD_SCREENSAVER_CONFIG.speedPxPerSec);
  const speedPxPerSec = Number.isFinite(speedRaw)
    ? Math.max(8, Math.min(40, speedRaw))
    : DEFAULT_DVD_SCREENSAVER_CONFIG.speedPxPerSec;
  const smoothRaw = Number(raw.smoothness ?? DEFAULT_DVD_SCREENSAVER_CONFIG.smoothness);
  const smoothness = Number.isFinite(smoothRaw)
    ? Math.max(1, Math.min(10, Math.round(smoothRaw)))
    : DEFAULT_DVD_SCREENSAVER_CONFIG.smoothness;
  const scaleRaw = Number(raw.logoScale ?? DEFAULT_DVD_SCREENSAVER_CONFIG.logoScale);
  const logoScale = scaleRaw === 2 ? 2 : 1;
  const sensRaw = Number(raw.cornerSensitivity ?? DEFAULT_DVD_SCREENSAVER_CONFIG.cornerSensitivity);
  const cornerSensitivity: DvdCornerSensitivity =
    sensRaw === 1 || sensRaw === 10 ? sensRaw : 4;
  const seedRaw = Number(raw.seed ?? DEFAULT_DVD_SCREENSAVER_CONFIG.seed);
  const seed = Number.isFinite(seedRaw) ? Math.floor(seedRaw) : DEFAULT_DVD_SCREENSAVER_CONFIG.seed;
  return { speedPxPerSec, smoothness, logoScale, cornerSensitivity, seed };
}

export function normalizeOnAirAppConfig(
  appConfig: Record<string, unknown> | undefined,
): OnAirConfig {
  const raw = appConfig ?? {};
  const messageRaw = String(raw.message ?? DEFAULT_ON_AIR_CONFIG.message);
  const message: OnAirMessage = ON_AIR_MESSAGES.includes(messageRaw as OnAirMessage)
    ? (messageRaw as OnAirMessage)
    : DEFAULT_ON_AIR_CONFIG.message;
  const pulse = raw.pulse === undefined ? DEFAULT_ON_AIR_CONFIG.pulse : Boolean(raw.pulse);
  return { message, pulse };
}

export function normalizeSpotifyNowPlayingAppConfig(
  _appConfig: Record<string, unknown> | undefined,
): SpotifyNowPlayingConfig {
  return { ...DEFAULT_SPOTIFY_NOW_PLAYING_CONFIG };
}

function parseAiMuseEnum<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  const value = String(raw ?? fallback);
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function parseAiMuseSettings(raw: unknown): AiMuseSetting[] {
  if (!Array.isArray(raw)) return [];
  const out: AiMuseSetting[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const value = String(item);
    if (!(AI_MUSE_SETTINGS as readonly string[]).includes(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value as AiMuseSetting);
  }
  return out;
}

function parseAiMuseEthnicities(raw: unknown): Array<Exclude<AiMuseEthnicity, 'any'>> {
  const out: Array<Exclude<AiMuseEthnicity, 'any'>> = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    if (value === 'any' || seen.has(value)) return;
    if (!(AI_MUSE_ETHNICITY_OPTIONS as readonly string[]).includes(value)) return;
    seen.add(value);
    out.push(value as Exclude<AiMuseEthnicity, 'any'>);
  };

  if (Array.isArray(raw)) {
    for (const item of raw) push(String(item));
  } else if (typeof raw === 'string' && raw.trim()) {
    // Legacy single-select field.
    push(raw.trim());
  }
  return out;
}

function parseAiMuseFeed(raw: unknown): AiMuseFeedItem[] {
  if (!Array.isArray(raw)) return [];
  const out: AiMuseFeedItem[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : String(row.id ?? '').trim();
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!id || !url || seen.has(id) || !isAiMuseFeedUrl(url)) continue;
    const width = Number(row.width);
    const height = Number(row.height);
    seen.add(id);
    out.push({
      id,
      url,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1024,
      height: Number.isFinite(height) && height > 0 ? Math.round(height) : 1024,
    });
    if (out.length >= MAX_AI_MUSE_FEED) break;
  }
  return out;
}

function parseAiMuseBlockedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = typeof item === 'string' ? item.trim() : String(item ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_AI_MUSE_BLOCKED) break;
  }
  return out;
}

export function normalizeAiMuseAppConfig(
  appConfig: Record<string, unknown> | undefined,
): AiMuseConfig {
  const raw = appConfig ?? {};
  const ageMinRaw = Number(raw.ageMin ?? DEFAULT_AI_MUSE_CONFIG.ageMin);
  const ageMaxRaw = Number(raw.ageMax ?? DEFAULT_AI_MUSE_CONFIG.ageMax);
  let ageMin = Number.isFinite(ageMinRaw) ? Math.round(ageMinRaw) : DEFAULT_AI_MUSE_CONFIG.ageMin;
  let ageMax = Number.isFinite(ageMaxRaw) ? Math.round(ageMaxRaw) : DEFAULT_AI_MUSE_CONFIG.ageMax;
  ageMin = Math.max(18, Math.min(65, ageMin));
  ageMax = Math.max(18, Math.min(65, ageMax));
  if (ageMax < ageMin) ageMax = ageMin;
  const refreshRaw = Number(raw.refreshSeconds ?? DEFAULT_AI_MUSE_CONFIG.refreshSeconds);
  const refreshSeconds = Number.isFinite(refreshRaw)
    ? Math.max(5, Math.min(120, Math.round(refreshRaw)))
    : DEFAULT_AI_MUSE_CONFIG.refreshSeconds;
  const poolRaw = Number(raw.poolSize ?? raw.catalogMinMatches ?? DEFAULT_AI_MUSE_CONFIG.poolSize);
  const poolSize = Number.isFinite(poolRaw)
    ? Math.max(6, Math.min(MAX_AI_MUSE_POOL, Math.round(poolRaw)))
    : DEFAULT_AI_MUSE_CONFIG.poolSize;
  const rawSources =
    raw.sources && typeof raw.sources === 'object' ? (raw.sources as Record<string, unknown>) : {};
  const sources: AiMuseSources = {
    civitai: rawSources.civitai !== false,
    library: rawSources.library !== false,
  };
  // Keep at least one source enabled.
  if (!sources.civitai && !sources.library) sources.civitai = true;
  return {
    ageMin,
    ageMax,
    ethnicities: parseAiMuseEthnicities(raw.ethnicities ?? raw.ethnicity),
    eyeColor: parseAiMuseEnum(raw.eyeColor, AI_MUSE_EYE_COLORS, DEFAULT_AI_MUSE_CONFIG.eyeColor),
    hairColor: parseAiMuseEnum(raw.hairColor, AI_MUSE_HAIR_COLORS, DEFAULT_AI_MUSE_CONFIG.hairColor),
    hairLength: parseAiMuseEnum(raw.hairLength, AI_MUSE_HAIR_LENGTHS, DEFAULT_AI_MUSE_CONFIG.hairLength),
    settings: parseAiMuseSettings(raw.settings),
    refreshSeconds,
    poolSize,
    sources,
    feed: parseAiMuseFeed(raw.feed),
    blockedIds: parseAiMuseBlockedIds(raw.blockedIds),
  };
}

/** Accept https URLs (and same-origin library paths) for manual feed adds. */
export function isAiMuseFeedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return true;
  return trimmed.startsWith('/api/ai-muse/library/');
}

/** Normalize a pasted Instagram handle to a bare username. */
export function normalizeInstagramUsername(raw: string): string | null {
  let value = raw.trim().replace(/^@+/, '').toLowerCase();
  // Accept pasted profile URLs.
  const urlMatch = value.match(
    /(?:instagram\.com\/)(?:stories\/)?([a-z0-9._]{1,30})(?:\/|$|\?)/i,
  );
  if (urlMatch?.[1]) value = urlMatch[1].toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(value)) return null;
  if (value.endsWith('.')) return null;
  return value;
}

export function isInstagramFeedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return true;
  return trimmed.startsWith('/api/instagram-feed/media/');
}

function parseInstagramAccounts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const username = normalizeInstagramUsername(String(item ?? ''));
    if (!username || seen.has(username)) continue;
    seen.add(username);
    out.push(username);
    if (out.length >= MAX_INSTAGRAM_ACCOUNTS) break;
  }
  return out;
}

function parseInstagramFeed(raw: unknown): InstagramFeedItem[] {
  if (!Array.isArray(raw)) return [];
  const out: InstagramFeedItem[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : String(row.id ?? '').trim();
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    const username = normalizeInstagramUsername(String(row.username ?? '')) ?? '';
    if (!id || !url || !username || seen.has(id) || !isInstagramFeedUrl(url)) continue;
    const width = Number(row.width);
    const height = Number(row.height);
    const takenAt = typeof row.takenAt === 'string' && row.takenAt.trim() ? row.takenAt.trim() : undefined;
    seen.add(id);
    out.push({
      id,
      username,
      url,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1080,
      height: Number.isFinite(height) && height > 0 ? Math.round(height) : 1080,
      ...(takenAt ? { takenAt } : {}),
    });
    if (out.length >= MAX_INSTAGRAM_FEED) break;
  }
  return out;
}

function parseInstagramBlockedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = typeof item === 'string' ? item.trim() : String(item ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_INSTAGRAM_BLOCKED) break;
  }
  return out;
}

export function normalizeInstagramFeedAppConfig(
  appConfig: Record<string, unknown> | undefined,
): InstagramFeedConfig {
  const raw = appConfig ?? {};
  const refreshRaw = Number(raw.refreshSeconds ?? DEFAULT_INSTAGRAM_FEED_CONFIG.refreshSeconds);
  const refreshSeconds = Number.isFinite(refreshRaw)
    ? Math.max(5, Math.min(120, Math.round(refreshRaw)))
    : DEFAULT_INSTAGRAM_FEED_CONFIG.refreshSeconds;
  const pollRaw = Number(raw.feedPollMinutes ?? DEFAULT_INSTAGRAM_FEED_CONFIG.feedPollMinutes);
  const feedPollMinutes = Number.isFinite(pollRaw)
    ? Math.max(15, Math.min(24 * 60, Math.round(pollRaw)))
    : DEFAULT_INSTAGRAM_FEED_CONFIG.feedPollMinutes;
  return {
    accounts: parseInstagramAccounts(raw.accounts),
    refreshSeconds,
    feedPollMinutes,
    feed: parseInstagramFeed(raw.feed),
    blockedIds: parseInstagramBlockedIds(raw.blockedIds),
  };
}

/** Square-first, then newer. Used within a single account before mixing. */
export function rankInstagramFeedItems(items: InstagramFeedItem[]): InstagramFeedItem[] {
  return [...items].sort((a, b) => {
    const ratioA = a.height > 0 ? a.width / a.height : 1;
    const ratioB = b.height > 0 ? b.width / b.height : 1;
    const squareA = Math.abs(1 - ratioA);
    const squareB = Math.abs(1 - ratioB);
    if (squareA !== squareB) return squareA - squareB;
    const timeA = a.takenAt ? Date.parse(a.takenAt) : 0;
    const timeB = b.takenAt ? Date.parse(b.takenAt) : 0;
    return timeB - timeA;
  });
}

export function shuffleInstagramFeed(feed: InstagramFeedItem[]): InstagramFeedItem[] {
  const next = [...feed];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

/**
 * Merge multi-account posts into a varied playlist:
 * square-first within each account, then round-robin across shuffled accounts
 * so one user doesn't dominate a stretch of the feed.
 */
export function mixInstagramFeedItems(items: InstagramFeedItem[]): InstagramFeedItem[] {
  if (items.length <= 1) return [...items];

  const byUser = new Map<string, InstagramFeedItem[]>();
  for (const item of items) {
    const list = byUser.get(item.username) ?? [];
    list.push(item);
    byUser.set(item.username, list);
  }

  // Single account — rank for quality, then shuffle for variety across refreshes.
  if (byUser.size === 1) {
    const only = byUser.values().next().value ?? [];
    return shuffleInstagramFeed(rankInstagramFeedItems(only));
  }

  const queues = [...byUser.values()].map((list) => rankInstagramFeedItems(list));
  // Randomize which account leads so refresh doesn't always start with the same handle.
  for (let i = queues.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = queues[i]!;
    queues[i] = queues[j]!;
    queues[j] = tmp;
  }

  const out: InstagramFeedItem[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      out.push(next);
      progressed = true;
    }
  }
  return out;
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffleAiMuseFeed(feed: AiMuseFeedItem[]): AiMuseFeedItem[] {
  const next = [...feed];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

export function catalogEntryToFeedItem(entry: AiMuseCatalogEntry): AiMuseFeedItem {
  return {
    id: entry.id,
    url: entry.url,
    width: entry.width,
    height: entry.height,
  };
}

export function createBlackFramePixels(): number[] {
  const pixels = new Array(64 * 64 * 4).fill(0);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
  return pixels;
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
