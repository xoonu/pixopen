import { CANVAS_SIZE } from '@pixopen/core';
import type { FlipNoteConfig } from '@pixopen/core';
import {
  BEZEL,
  BEZEL_COLOR,
  CHAR_GAP,
  INNER,
  ROW_HEIGHT,
  boardLayout,
} from './layout.js';
import { glyphFor, glyphWidth } from './glyph.js';
import type { RefreshCell } from './timing.js';

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
) {
  for (let row = 0; row < glyph.dots.length; row++) {
    for (let col = 0; col < glyph.width; col++) {
      if (!glyph.dots[row]?.[col]) continue;
      setPx(pixels, x + col, y + row, color);
    }
  }
}

/** Drop trailing space slots — they only exist for the 8-char editor limit. */
function layoutCells(cells: RefreshCell[]): RefreshCell[] {
  let end = cells.length;
  while (end > 0 && cells[end - 1].char === ' ' && cells[end - 1].slotChar === ' ') end--;
  return cells.slice(0, end);
}

function rowWidth(cells: RefreshCell[]): number {
  if (cells.length === 0) return 0;
  let width = 0;
  for (let i = 0; i < cells.length; i++) {
    width += glyphWidth(cells[i].slotChar);
    if (i < cells.length - 1) width += CHAR_GAP;
  }
  return width;
}

function rowStartX(cells: RefreshCell[], textAlign: FlipNoteConfig['textAlign']): number {
  const contentWidth = rowWidth(cells);
  const innerLeft = BEZEL;
  if (textAlign === 'center') {
    return innerLeft + Math.floor((INNER - contentWidth) / 2);
  }
  if (textAlign === 'right') {
    return innerLeft + (INNER - contentWidth);
  }
  return innerLeft;
}

export function drawFlipNoteBoard(
  pixels: number[],
  config: FlipNoteConfig,
  rows: RefreshCell[][],
) {
  const boardLines = config.boardLines ?? 1;
  const { rowGap, boardY } = boardLayout(boardLines);
  const letterColor = resolveLetterColor(config);

  fillBoardBackground(pixels, BEZEL, BEZEL, INNER, INNER, config);

  for (let row = 0; row < boardLines; row++) {
    const cells = layoutCells(rows[row] ?? []);
    const my = boardY + row * (ROW_HEIGHT + rowGap);
    let x = rowStartX(cells, config.textAlign ?? 'left');

    for (const cell of cells) {
      const slotWidth = glyphWidth(cell.slotChar);
      if (!cell.blank) {
        drawGlyph(pixels, x, my, glyphFor(cell.char), letterColor);
      }
      x += slotWidth + CHAR_GAP;
    }
  }

  drawBezel(pixels);
}
