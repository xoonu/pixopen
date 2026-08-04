import { shouldUseFlipNoteUi, shouldUseStockTickerUi, shouldUseWeatherUi, shouldUseDvdScreensaverUi, shouldUseSpotifyNowPlayingUi, type Frame, type LiveArea, type Project } from '@pixopen/core';
import type { DataSourceResult } from '@pixopen/datasources';
import {
  compositeFrame,
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

/** Static thumbnail for project cards — renders Flip Note and live regions, otherwise frame 0. */
export function renderProjectCardPreview(project: Project): Frame {
  const base = project.frames[0];
  if (!base) {
    return { width: 64, height: 64, pixels: new Array(64 * 64 * 4).fill(0) };
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
    const snapshot = config.location ? demoWeatherSnapshot(config) : null;
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

  if (project.type === 'live-sign') {
    const values = new Map<string, DataSourceResult>();
    for (const area of project.liveAreas) {
      values.set(area.id, placeholderDataForArea(area));
    }
    return compositeFrame(base, project.liveAreas, values, 0);
  }

  return { width: base.width, height: base.height, pixels: [...base.pixels] };
}
