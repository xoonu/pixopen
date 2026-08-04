import { CANVAS_SIZE, type Frame, type SpotifyNowPlayingConfig, type SpotifyNowPlayingSnapshot } from '@pixopen/core';
import { parseSpotifyNowPlayingConfig } from './config.js';
import { createSpotifyLogoPixels } from './logo.js';

function frameFromPixels(pixels: number[]): Frame {
  const copy = pixels.length === CANVAS_SIZE * CANVAS_SIZE * 4
    ? [...pixels]
    : createSpotifyLogoPixels();
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: copy };
}

export function renderSpotifyNowPlayingBoard(
  _config: SpotifyNowPlayingConfig,
  snapshot: SpotifyNowPlayingSnapshot | null,
): Frame {
  if (snapshot?.pixels?.length === CANVAS_SIZE * CANVAS_SIZE * 4) {
    return frameFromPixels(snapshot.pixels);
  }
  return frameFromPixels(createSpotifyLogoPixels());
}

export function renderSpotifyNowPlayingPreview(
  appConfig: Record<string, unknown> | undefined,
  snapshot: SpotifyNowPlayingSnapshot | null,
): Frame {
  const config = parseSpotifyNowPlayingConfig(appConfig);
  return renderSpotifyNowPlayingBoard(config, snapshot);
}

export { createSpotifyLogoPixels };
