import {
  CANVAS_SIZE,
  createBlackFramePixels,
  type AiMuseConfig,
  type AiMuseSnapshot,
  type Frame,
} from '@pixopen/core';
import { parseAiMuseConfig } from './config.js';

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
  E: [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  F: [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  I: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  L: [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  M: [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
  N: [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  O: [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  S: [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  U: [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
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
      const v = 12 + ((x + y) % 8);
      setPixel(pixels, x, y, v, v + 2, v + 8);
    }
  }
  drawText(pixels, 10, 28, message.slice(0, 12), [210, 220, 235]);
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

function frameFromPixels(pixels: number[]): Frame {
  if (pixels.length === CANVAS_SIZE * CANVAS_SIZE * 4) {
    return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: [...pixels] };
  }
  return fallbackFrame('AI MUSE');
}

export function renderAiMuseBoard(
  _config: AiMuseConfig,
  snapshot: AiMuseSnapshot | null,
): Frame {
  if (snapshot?.pixels?.length === CANVAS_SIZE * CANVAS_SIZE * 4 && snapshot.imageId) {
    return frameFromPixels(snapshot.pixels);
  }
  if (snapshot?.error) return fallbackFrame('NO MATCH');
  return fallbackFrame('LOADING');
}

export function renderAiMusePreview(
  appConfig: Record<string, unknown> | undefined,
  snapshot: AiMuseSnapshot | null,
): Frame {
  const config = parseAiMuseConfig(appConfig);
  return renderAiMuseBoard(config, snapshot);
}
