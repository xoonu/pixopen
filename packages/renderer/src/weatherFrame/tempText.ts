import { CANVAS_SIZE } from '@pixopen/core';
import {
  WEATHER_TEMP_CHAR_GAP,
  WEATHER_TEMP_GLYPHS,
  WEATHER_TEMP_LINE_HEIGHT,
  type WeatherTempSoftGlyph,
} from './tempFigtreeGlyphs.js';

function glyphFor(ch: string): WeatherTempSoftGlyph {
  return (
    WEATHER_TEMP_GLYPHS[ch] ??
    WEATHER_TEMP_GLYPHS['0'] ?? {
      w: 8,
      h: WEATHER_TEMP_LINE_HEIGHT,
      bmpW: 1,
      alpha: [0],
    }
  );
}

/** Nearest-neighbor sample — keeps baked edges crisp (no bilinear haze). */
function sampleAlpha(glyph: WeatherTempSoftGlyph, fx: number, fy: number): number {
  const x = Math.round(fx);
  const y = Math.round(fy);
  const rows = glyphBmpH(glyph);
  if (x < 0 || y < 0 || x >= glyph.bmpW || y >= rows) return 0;
  return (glyph.alpha[y * glyph.bmpW + x] ?? 0) / 255;
}

function blendPx(
  pixels: number[],
  x: number,
  y: number,
  color: [number, number, number],
  alpha: number,
) {
  // Drop faint fringe that reads as blur on LED glass
  if (alpha < 0.35) return;
  const t = alpha >= 0.72 ? 1 : alpha;
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = Math.round(pixels[i] + (color[0] - pixels[i]) * t);
  pixels[i + 1] = Math.round(pixels[i + 1] + (color[1] - pixels[i + 1]) * t);
  pixels[i + 2] = Math.round(pixels[i + 2] + (color[2] - pixels[i + 2]) * t);
  pixels[i + 3] = 255;
}

function glyphBmpH(glyph: WeatherTempSoftGlyph): number {
  return Math.max(1, Math.floor(glyph.alpha.length / Math.max(1, glyph.bmpW)));
}

function drawGlyph(
  pixels: number[],
  x: number,
  y: number,
  glyph: WeatherTempSoftGlyph,
  color: [number, number, number],
  scale: number,
) {
  const srcH = glyphBmpH(glyph);
  const dw = Math.max(1, Math.round(glyph.bmpW * scale));
  const dh = Math.max(1, Math.round(srcH * scale));
  // Prefer integer scale for crisp pixels
  const useNn = Math.abs(scale - Math.round(scale)) < 0.05;
  for (let row = 0; row < dh; row++) {
    for (let col = 0; col < dw; col++) {
      const sx = useNn ? Math.floor(col / scale) : (col + 0.5) / scale - 0.5;
      const sy = useNn ? Math.floor(row / scale) : (row + 0.5) / scale - 0.5;
      const a = sampleAlpha(glyph, sx, sy);
      if (a <= 0) continue;
      blendPx(pixels, x + col, y + row, color, a);
    }
  }
}

function visualWidth(text: string, scale: number): number {
  if (!text) return 0;
  const gap =
    scale >= 0.999
      ? WEATHER_TEMP_CHAR_GAP
      : Math.max(0, Math.round(WEATHER_TEMP_CHAR_GAP * scale));
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const g = glyphFor(text[i]!);
    width += Math.max(1, Math.round(g.w * scale));
    if (i < text.length - 1) width += gap;
  }
  const last = glyphFor(text[text.length - 1]!);
  const adv = Math.max(1, Math.round(last.w * scale));
  const bmp = Math.max(1, Math.round(last.bmpW * scale));
  width += Math.max(0, bmp - adv);
  return width;
}

function visualHeight(scale: number): number {
  // Use actual cropped digit height ≈ line box
  return Math.max(1, Math.round(WEATHER_TEMP_LINE_HEIGHT * scale));
}

/**
 * Prefer native size (1.0). Only shrink to fit; avoid soft upscales.
 */
export function figtreeTempScale(text: string, maxW: number, maxH: number): number {
  if (visualHeight(1) <= maxH && visualWidth(text, 1) <= maxW) return 1;
  let best = 0.5;
  for (let s = 1; s >= 0.5; s -= 0.05) {
    if (visualHeight(s) > maxH) continue;
    if (visualWidth(text, s) <= maxW) {
      best = Math.round(s * 20) / 20;
      break;
    }
  }
  return best;
}

export function figtreeTempSize(text: string, scale: number): { w: number; h: number } {
  return {
    w: visualWidth(text, scale),
    h: visualHeight(scale),
  };
}

/** Draw temperature digits in crisp Figtree Bold (weather atlas). */
export function drawFigtreeTemp(
  pixels: number[],
  x: number,
  y: number,
  text: string,
  color: [number, number, number],
  scale: number,
) {
  const gap =
    scale >= 0.999
      ? WEATHER_TEMP_CHAR_GAP
      : Math.max(0, Math.round(WEATHER_TEMP_CHAR_GAP * scale));
  let cursor = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const glyph = glyphFor(ch);
    const srcH = glyphBmpH(glyph);
    // Center shorter crops in the line box
    const boxH = visualHeight(scale);
    const drawH = Math.max(1, Math.round(srcH * scale));
    const yOff = Math.max(0, Math.floor((boxH - drawH) / 2));
    drawGlyph(pixels, cursor, y + yOff, glyph, color, scale);
    cursor += Math.max(1, Math.round(glyph.w * scale)) + gap;
  }
}
