import { CANVAS_SIZE } from '@pixopen/core';

export function setPx(
  pixels: number[],
  x: number,
  y: number,
  color: [number, number, number],
  alpha = 255,
) {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = alpha;
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
    for (let px = x; px < x + w; px++) setPx(pixels, px, py, color);
  }
}

export function drawHLine(
  pixels: number[],
  x: number,
  y: number,
  w: number,
  color: [number, number, number],
) {
  for (let px = x; px < x + w; px++) setPx(pixels, px, y, color);
}

export function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '').slice(0, 6);
  if (v.length !== 6) return [200, 212, 224];
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

const FONT: Record<string, number[][]> = {
  '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  '3': [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  '7': [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
  '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
  '.': [[0],[0],[0],[0],[1]],
  '+': [[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
  '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  '%': [[1,0,0,1],[0,0,1,0],[0,0,1,0],[0,1,0,0],[1,0,0,1]],
  '$': [[0,1,1,0],[1,1,0,0],[0,1,1,0],[0,0,1,1],[0,1,1,0]],
  'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
  'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
  'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
  'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
  'K': [[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
  'Q': [[0,1,0],[1,0,1],[1,0,1],[1,1,0],[0,1,1]],
  'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
  'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'W': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
  'X': [[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
  ' ': [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],
};

const CHAR_GAP = 1;

function glyphFor(ch: string): number[][] {
  return FONT[ch.toUpperCase()] ?? FONT[' '];
}

function glyphColumnCount(glyph: number[][]): number {
  return glyph.reduce((max, row) => Math.max(max, row.length), 0);
}

export function charAdvance(ch: string, scale = 1): number {
  if (ch === ' ') return 3 * scale;
  const cols = glyphColumnCount(glyphFor(ch));
  return cols * scale + CHAR_GAP * scale;
}

export function drawChar(
  pixels: number[],
  x: number,
  y: number,
  ch: string,
  color: [number, number, number],
  scale = 1,
) {
  const glyph = glyphFor(ch);
  for (let gy = 0; gy < glyph.length; gy++) {
    for (let gx = 0; gx < glyph[gy].length; gx++) {
      if (!glyph[gy][gx]) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          setPx(pixels, x + gx * scale + sx, y + gy * scale + sy, color);
        }
      }
    }
  }
}

export function textWidth(text: string, scale = 1): number {
  let width = 0;
  for (const ch of text) width += charAdvance(ch, scale);
  return width;
}

export function drawText(
  pixels: number[],
  x: number,
  y: number,
  text: string,
  color: [number, number, number],
  scale = 1,
) {
  let cx = x;
  for (const ch of text) {
    drawChar(pixels, cx, y, ch, color, scale);
    cx += charAdvance(ch, scale);
  }
}

export function drawTextClipped(
  pixels: number[],
  x: number,
  y: number,
  text: string,
  color: [number, number, number],
  clipX: number,
  clipW: number,
  scale = 1,
) {
  let cx = x;
  for (const ch of text) {
    const advance = charAdvance(ch, scale);
    if (cx + advance >= clipX && cx <= clipX + clipW) {
      drawChar(pixels, cx, y, ch, color, scale);
    }
    cx += advance;
  }
}
