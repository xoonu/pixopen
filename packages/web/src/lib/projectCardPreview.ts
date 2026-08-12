import {
  createBlackFramePixels,
  shouldUseAiMuseUi,
  shouldUseFlipNoteUi,
  shouldUseInstagramFeedUi,
  shouldUseStockTickerUi,
  shouldUseWeatherUi,
  shouldUseDvdScreensaverUi,
  shouldUseSpotifyNowPlayingUi,
  shouldUseOnAirUi,
  type Frame,
  type LiveArea,
  type Project,
} from '@pixopen/core';
import type { DataSourceResult } from '@pixopen/datasources';
import {
  compositeFrame,
  createAiMuseThumbnailPixels,
  createInstagramFeedThumbnailPixels,
  createOnAirThumbnailPixels,
  createSpotifyLogoPixels,
  demoQuotesForConfig,
  demoWeatherSnapshot,
  parseFlipNoteConfig,
  parseStockTickerConfig,
  parseWeatherFrameConfig,
  renderFlipNotePreview,
  renderSpotifyNowPlayingPreview,
  renderStockTickerPreview,
  renderWeatherPreview,
  renderDvdScreensaverPreview,
} from '@pixopen/renderer';

function clockPreviewText(config: Record<string, unknown>): string {
  const now = new Date();
  const format = String(config.format ?? 'HH:MM');
  if (format === '12h') {
    return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (format === 'HH:MM:SS') {
    return now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
  return now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function placeholderDataForArea(area: LiveArea): DataSourceResult {
  const fetchedAt = new Date().toISOString();
  const config = area.config ?? {};

  switch (area.datasourceId) {
    case 'local.clock':
      return { text: clockPreviewText(config), fetchedAt };
    case 'open-meteo.current':
      return { text: '72°', secondary: 'wx', fetchedAt };
    case 'terminalfeed.stocks':
      return { text: '$142', secondary: 'SYM', fetchedAt };
    case 'open-notify.iss':
      return { text: 'ISS', secondary: '↑', fetchedAt };
    case 'sportscore.live':
      return { text: '3-2', secondary: 'LIVE', fetchedAt };
    default:
      return { text: 'LIVE', fetchedAt };
  }
}

/** First usable feed image URL for AI Muse / Instagram project cards. */
export function projectCardFeedImageUrl(project: Project): string | null {
  if (!shouldUseAiMuseUi(project) && !shouldUseInstagramFeedUi(project)) return null;
  const feed = project.appConfig?.feed;
  if (!Array.isArray(feed)) return null;
  for (const item of feed) {
    if (!item || typeof item !== 'object') continue;
    const url = (item as { url?: unknown }).url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return null;
}

/** Static thumbnail for project cards — renders Flip Note and live regions, otherwise frame 0. */
export function renderProjectCardPreview(project: Project): Frame {
  const base = project.frames[0];
  if (!base) {
    return { width: 64, height: 64, pixels: createBlackFramePixels() };
  }

  if (shouldUseFlipNoteUi(project)) {
    const config = parseFlipNoteConfig(project.appConfig);
    return renderFlipNotePreview(config, 0);
  }

  if (shouldUseStockTickerUi(project)) {
    const config = parseStockTickerConfig(project.appConfig);
    const quotes = demoQuotesForConfig(config);
    return renderStockTickerPreview(config, quotes, 0);
  }

  if (shouldUseWeatherUi(project)) {
    const config = parseWeatherFrameConfig(project.appConfig);
    const locs = config.locations.length > 0 ? config.locations : [];
    const snapshot = locs.length > 0 ? demoWeatherSnapshot(config) : null;
    return renderWeatherPreview(project.appConfig, snapshot, 0);
  }

  if (shouldUseDvdScreensaverUi(project)) {
    return renderDvdScreensaverPreview(project.appConfig, 0);
  }

  if (shouldUseSpotifyNowPlayingUi(project)) {
    return renderSpotifyNowPlayingPreview(project.appConfig, {
      source: 'logo',
      pixels: createSpotifyLogoPixels(),
      fetchedAt: new Date().toISOString(),
    });
  }

  if (shouldUseAiMuseUi(project)) {
    return {
      width: 64,
      height: 64,
      pixels: createAiMuseThumbnailPixels(),
    };
  }

  if (shouldUseInstagramFeedUi(project)) {
    return {
      width: 64,
      height: 64,
      pixels: createInstagramFeedThumbnailPixels(),
    };
  }

  if (shouldUseOnAirUi(project)) {
    return {
      width: 64,
      height: 64,
      pixels: createOnAirThumbnailPixels(),
    };
  }

  if (project.type === 'live-sign') {
    const values = new Map<string, DataSourceResult>();
    for (const area of project.liveAreas) {
      values.set(area.id, placeholderDataForArea(area));
    }
    return compositeFrame(base, project.liveAreas, values, 0);
  }

  return { width: base.width, height: base.height, pixels: [...base.pixels] };
}
