import {
  CANVAS_SIZE,
  createBlackFramePixels,
  type Frame,
  type InstagramFeedConfig,
  type InstagramFeedSnapshot,
} from '@pixopen/core';
import { parseInstagramFeedConfig } from './config.js';
import { createInstagramFeedThumbnailPixels } from './thumbnail.js';

function setPixel(pixels: number[], x: number, y: number, r: number, g: number, b: number, a = 255) {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

const FONT: Record<string, number[][]> = {
  A: [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  D: [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  E: [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  F: [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  G: [[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
  I: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  L: [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  M: [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
  N: [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  O: [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  R: [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  S: [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  T: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  U: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  Y: [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  ' ': [[0],[0],[0],[0],[0]],
};

function drawChar(pixels: number[], x: number, y: number, ch: string, color: [number, number, number]) {
  const glyph = FONT[ch.toUpperCase()] ?? FONT[' '];
  for (let gy = 0; gy < glyph.length; gy++) {
    for (let gx = 0; gx < glyph[gy]!.length; gx++) {
      if (!glyph[gy]![gx]) continue;
      setPixel(pixels, x + gx, y + gy, color[0], color[1], color[2]);
    }
  }
}

function drawText(pixels: number[], x: number, y: number, text: string, color: [number, number, number]) {
  let cx = x;
  for (const ch of text) {
    drawChar(pixels, cx, y, ch, color);
    cx += 4;
  }
}

function fallbackFrame(message: string): Frame {
  const pixels = createBlackFramePixels();
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const v = 10 + ((x * 3 + y * 5) % 10);
      setPixel(pixels, x, y, v + 4, v, v + 10);
    }
  }
  drawText(pixels, 8, 28, message.slice(0, 12), [220, 225, 235]);
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

function frameFromPixels(pixels: number[]): Frame {
  if (pixels.length === CANVAS_SIZE * CANVAS_SIZE * 4) {
    return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: [...pixels] };
  }
  return fallbackFrame('IG FEED');
}

export function renderInstagramFeedBoard(
  _config: InstagramFeedConfig,
  snapshot: InstagramFeedSnapshot | null,
): Frame {
  if (snapshot?.pixels?.length === CANVAS_SIZE * CANVAS_SIZE * 4 && snapshot.imageId) {
    return frameFromPixels(snapshot.pixels);
  }
  if (snapshot?.error) {
    const msg = snapshot.error.toLowerCase().includes('empty')
      ? 'NO IMAGES'
      : snapshot.error.toLowerCase().includes('username')
        ? 'ADD USER'
        : 'NO IMAGES';
    return fallbackFrame(msg);
  }
  // Branded mark while waiting — avoids a blank "LOADING" tile on project cards / empty feeds.
  if (!snapshot) {
    return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: createInstagramFeedThumbnailPixels() };
  }
  return fallbackFrame('LOADING');
}

export function renderInstagramFeedPreview(
  appConfig: Record<string, unknown> | undefined,
  snapshot: InstagramFeedSnapshot | null,
): Frame {
  const config = parseInstagramFeedConfig(appConfig);
  return renderInstagramFeedBoard(config, snapshot);
}
