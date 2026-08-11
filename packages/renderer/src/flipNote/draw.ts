import { CANVAS_SIZE } from '@pixopen/core';
import type { FlipNoteConfig } from '@pixopen/core';
import {
  BEZEL,
  BEZEL_COLOR,
  CHAR_GAP,
  INNER,
  ROW_HEIGHT,
  TEXT_AREA,
  TEXT_INSET,
  boardLayout,
} from './layout.js';
import { glyphFor, glyphWidth } from './glyph.js';
import { softGlyphFor, softGlyphWidth } from './figtreeGlyph.js';
import { FIGTREE_LINE_HEIGHT } from './figtreeGlyphs.js';
import type { RefreshCell } from './timing.js';
import { messageFrames } from './timing.js';

export function setPx(
  pixels: number[],
  x: number,
  y: number,
  color: [number, number, number],
) {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = 255;
}

/** Letter pixels stay inside the inset text band. */
function setTextPx(
  pixels: number[],
  x: number,
  y: number,
  color: [number, number, number],
) {
  const x0 = BEZEL + TEXT_INSET;
  const x1 = BEZEL + INNER - TEXT_INSET - 1;
  if (x < x0 || x > x1) return;
  setPx(pixels, x, y, color);
}

export function fillRect(
  pixels: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPx(pixels, px, py, color);
    }
  }
}

function drawBezel(pixels: number[]) {
  for (let x = 0; x < CANVAS_SIZE; x++) {
    setPx(pixels, x, 0, BEZEL_COLOR);
    setPx(pixels, x, CANVAS_SIZE - 1, BEZEL_COLOR);
  }
  for (let y = BEZEL; y < CANVAS_SIZE - BEZEL; y++) {
    setPx(pixels, 0, y, BEZEL_COLOR);
    setPx(pixels, CANVAS_SIZE - 1, y, BEZEL_COLOR);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '').slice(0, 6);
  if (v.length !== 6) return [244, 228, 188];
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function lerpByte(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerpByte(a[0], b[0], t), lerpByte(a[1], b[1], t), lerpByte(a[2], b[2], t)];
}

function gradientOriginPoint(origin: FlipNoteConfig['backgroundGradientOrigin']): [number, number] {
  switch (origin) {
    case 'top':
      return [0.5, 0];
    case 'bottom':
      return [0.5, 1];
    case 'left':
      return [0, 0.5];
    case 'right':
      return [1, 0.5];
    case 'top-left':
      return [0, 0];
    case 'top-right':
      return [1, 0];
    case 'bottom-left':
      return [0, 1];
    case 'bottom-right':
      return [1, 1];
    default:
      return [0.5, 0.5];
  }
}

/** CSS-style linear gradient (0° = up, 90° = right). */
function fillLinearGradient(
  pixels: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  start: [number, number, number],
  end: [number, number, number],
  angleDeg: number,
  origin: FlipNoteConfig['backgroundGradientOrigin'],
) {
  const [oxn, oyn] = gradientOriginPoint(origin);
  const ox = x + oxn * Math.max(0, w - 1);
  const oy = y + oyn * Math.max(0, h - 1);
  const rad = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = -Math.cos(rad);

  let tMin = Infinity;
  let tMax = -Infinity;
  for (let cy = y; cy < y + h; cy++) {
    for (let cx = x; cx < x + w; cx++) {
      const dot = (cx - ox) * ux + (cy - oy) * uy;
      if (dot < tMin) tMin = dot;
      if (dot > tMax) tMax = dot;
    }
  }
  const range = tMax - tMin || 1;

  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const dot = (px - ox) * ux + (py - oy) * uy;
      const t = Math.max(0, Math.min(1, (dot - tMin) / range));
      setPx(pixels, px, py, lerpRgb(start, end, t));
    }
  }
}

function fillBoardBackground(
  pixels: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  config: FlipNoteConfig,
) {
  const start = hexToRgb(config.backgroundColor);
  if (config.backgroundMode !== 'gradient') {
    fillRect(pixels, x, y, w, h, start);
    return;
  }
  const end = hexToRgb(config.backgroundGradientEnd);
  fillLinearGradient(
    pixels,
    x,
    y,
    w,
    h,
    start,
    end,
    config.backgroundGradientAngle,
    config.backgroundGradientOrigin,
  );
}

export function resolveLetterColor(config: FlipNoteConfig): [number, number, number] {
  return hexToRgb(config.textColor);
}

export function resolveBoardBg(config: FlipNoteConfig): [number, number, number] {
  return hexToRgb(config.backgroundColor);
}

function drawGlyph(
  pixels: number[],
  x: number,
  y: number,
  glyph: ReturnType<typeof glyphFor>,
  color: [number, number, number],
  scale = 1,
) {
  if (scale >= 0.999) {
    for (let row = 0; row < glyph.dots.length; row++) {
      for (let col = 0; col < glyph.width; col++) {
        if (!glyph.dots[row]?.[col]) continue;
        setTextPx(pixels, x + col, y + row, color);
      }
    }
    return;
  }
  const dw = Math.max(1, Math.round(glyph.width * scale));
  const dh = Math.max(1, Math.round(glyph.dots.length * scale));
  for (let row = 0; row < dh; row++) {
    for (let col = 0; col < dw; col++) {
      const sx = Math.min(glyph.width - 1, Math.floor(col / scale));
      const sy = Math.min(glyph.dots.length - 1, Math.floor(row / scale));
      if (!glyph.dots[sy]?.[sx]) continue;
      setTextPx(pixels, x + col, y + row, color);
    }
  }
}

function blendPx(
  pixels: number[],
  x: number,
  y: number,
  color: [number, number, number],
  alpha: number,
) {
  if (alpha <= 0) return;
  // Keep soft edges inside the text band (not flush to the bezel)
  const x0 = BEZEL + TEXT_INSET;
  const x1 = BEZEL + INNER - TEXT_INSET - 1;
  const y0 = BEZEL;
  const y1 = BEZEL + INNER - 1;
  if (x < x0 || y < y0 || x > x1 || y > y1) return;
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const t = Math.min(1, alpha);
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = Math.round(pixels[i] + (color[0] - pixels[i]) * t);
  pixels[i + 1] = Math.round(pixels[i + 1] + (color[1] - pixels[i + 1]) * t);
  pixels[i + 2] = Math.round(pixels[i + 2] + (color[2] - pixels[i + 2]) * t);
  pixels[i + 3] = 255;
}

function sampleSoftAlpha(glyph: ReturnType<typeof softGlyphFor>, fx: number, fy: number): number {
  if (fx < -0.5 || fy < -0.5 || fx > glyph.bmpW - 0.5 || fy > glyph.height - 0.5) return 0;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = fx - x0;
  const ty = fy - y0;
  const at = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= glyph.bmpW || y >= glyph.height) return 0;
    return glyph.alpha[y * glyph.bmpW + x] ?? 0;
  };
  const a00 = at(x0, y0);
  const a10 = at(x1, y0);
  const a01 = at(x0, y1);
  const a11 = at(x1, y1);
  const top = a00 + (a10 - a00) * tx;
  const bot = a01 + (a11 - a01) * tx;
  return (top + (bot - top) * ty) / 255;
}

function drawSoftGlyph(
  pixels: number[],
  x: number,
  y: number,
  glyph: ReturnType<typeof softGlyphFor>,
  color: [number, number, number],
  scale = 1,
) {
  const dw = Math.max(1, Math.round(glyph.bmpW * scale));
  const dh = Math.max(1, Math.round(glyph.height * scale));
  for (let row = 0; row < dh; row++) {
    for (let col = 0; col < dw; col++) {
      // Bilinear sample — avoids crunchy nearest-neighbor when autoscaling
      const sx = (col + 0.5) / scale - 0.5;
      const sy = (row + 0.5) / scale - 0.5;
      const a = sampleSoftAlpha(glyph, sx, sy);
      if (a <= 0.02) continue;
      blendPx(pixels, x + col, y + row, color, a);
    }
  }
}

/** Drop trailing space slots — they only exist for the 8-char editor limit. */
function layoutCells(cells: RefreshCell[]): RefreshCell[] {
  let end = cells.length;
  while (end > 0 && cells[end - 1].char === ' ' && cells[end - 1].slotChar === ' ') end--;
  return cells.slice(0, end);
}

function advanceWidth(ch: string, fontStyle: FlipNoteConfig['fontStyle']): number {
  return fontStyle === 'figtree' ? softGlyphWidth(ch) : glyphWidth(ch);
}

/** Layout width from advances + gaps (scale 1). */
function rowLayoutWidth(cells: RefreshCell[], fontStyle: FlipNoteConfig['fontStyle']): number {
  if (cells.length === 0) return 0;
  let width = 0;
  for (let i = 0; i < cells.length; i++) {
    width += advanceWidth(cells[i].slotChar, fontStyle);
    if (i < cells.length - 1) width += CHAR_GAP;
  }
  return width;
}

/**
 * Visual width including soft-font AA fringe past the last advance.
 * Used so autoscale keeps soft edges inside the text band.
 */
function rowVisualWidth(cells: RefreshCell[], fontStyle: FlipNoteConfig['fontStyle']): number {
  const layout = rowLayoutWidth(cells, fontStyle);
  if (fontStyle !== 'figtree' || cells.length === 0) return layout;
  const last = softGlyphFor(cells[cells.length - 1].slotChar);
  return layout + Math.max(0, last.bmpW - last.width);
}

function rowScale(cells: RefreshCell[], fontStyle: FlipNoteConfig['fontStyle']): number {
  const natural = rowVisualWidth(cells, fontStyle);
  if (natural <= 0) return 1;
  return Math.min(1, TEXT_AREA / natural);
}

/**
 * Per line-slot scale: the tightest fit for that row across every message
 * frame. Line 0 can be larger than line 1; sizes just don't jump when frames cycle.
 */
export function boardLineScales(config: FlipNoteConfig): number[] {
  const boardLines = config.boardLines ?? 1;
  const fontStyle = config.fontStyle ?? 'pixel';
  const scales = Array.from({ length: boardLines }, () => 1);
  for (const frame of messageFrames(config)) {
    for (let row = 0; row < boardLines; row++) {
      const cells = layoutCells(
        [...(frame[row] ?? '')].map((ch) => ({ char: ch, slotChar: ch, blank: false })),
      );
      scales[row] = Math.min(scales[row], rowScale(cells, fontStyle));
    }
  }
  return scales;
}

function rowStartX(
  contentWidth: number,
  textAlign: FlipNoteConfig['textAlign'],
): number {
  const bandLeft = BEZEL + TEXT_INSET;
  if (textAlign === 'center') {
    return bandLeft + Math.floor((TEXT_AREA - contentWidth) / 2);
  }
  if (textAlign === 'right') {
    return bandLeft + (TEXT_AREA - contentWidth);
  }
  return bandLeft;
}

export function drawFlipNoteBoard(
  pixels: number[],
  config: FlipNoteConfig,
  rows: RefreshCell[][],
) {
  const boardLines = config.boardLines ?? 1;
  const fontStyle = config.fontStyle ?? 'pixel';
  const lineHeight = fontStyle === 'figtree' ? FIGTREE_LINE_HEIGHT : ROW_HEIGHT;
  const { rowGap, boardY } = boardLayout(boardLines, lineHeight);
  const letterColor = resolveLetterColor(config);
  const textAlign = config.textAlign ?? 'left';
  const lineScales = boardLineScales(config);

  fillBoardBackground(pixels, BEZEL, BEZEL, INNER, INNER, config);

  for (let row = 0; row < boardLines; row++) {
    const cells = layoutCells(rows[row] ?? []);
    const scale = lineScales[row] ?? 1;
    const gap = scale >= 0.999 ? CHAR_GAP : Math.max(1, Math.round(CHAR_GAP * scale));
    let contentWidth = 0;
    for (let i = 0; i < cells.length; i++) {
      contentWidth += Math.max(1, Math.round(advanceWidth(cells[i].slotChar, fontStyle) * scale));
      if (i < cells.length - 1) contentWidth += gap;
    }
    if (fontStyle === 'figtree' && cells.length > 0) {
      const last = softGlyphFor(cells[cells.length - 1].slotChar);
      const adv = Math.max(1, Math.round(last.width * scale));
      const bmp = Math.max(1, Math.round(last.bmpW * scale));
      contentWidth += Math.max(0, bmp - adv);
    }

    const drawH =
      fontStyle === 'figtree'
        ? Math.max(1, Math.round(FIGTREE_LINE_HEIGHT * scale))
        : Math.max(1, Math.round(ROW_HEIGHT * scale));
    const my = boardY + row * (lineHeight + rowGap) + Math.floor((lineHeight - drawH) / 2);
    let x = rowStartX(contentWidth, textAlign);

    for (const cell of cells) {
      const slotWidth = Math.max(1, Math.round(advanceWidth(cell.slotChar, fontStyle) * scale));
      if (!cell.blank) {
        if (fontStyle === 'figtree') {
          drawSoftGlyph(pixels, x, my, softGlyphFor(cell.char), letterColor, scale);
        } else {
          drawGlyph(pixels, x, my, glyphFor(cell.char), letterColor, scale);
        }
      }
      x += slotWidth + gap;
    }
  }

  drawBezel(pixels);
}
