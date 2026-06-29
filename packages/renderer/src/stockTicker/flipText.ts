import { glyphFor, glyphWidth } from '../flipNote/glyph.js';
import { CHAR_GAP } from '../flipNote/layout.js';
import { setPx } from './draw.js';

function drawFlipNoteGlyph(
  pixels: number[],
  x: number,
  y: number,
  ch: string,
  color: [number, number, number],
) {
  const glyph = glyphFor(ch);
  for (let row = 0; row < glyph.dots.length; row++) {
    for (let col = 0; col < glyph.width; col++) {
      if (!glyph.dots[row]?.[col]) continue;
      setPx(pixels, x + col, y + row, color);
    }
  }
}

export function flipNoteTextWidth(text: string): number {
  if (!text) return 0;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += glyphWidth(text[i]!);
    if (i < text.length - 1) width += CHAR_GAP;
  }
  return width;
}

export function drawFlipNoteText(
  pixels: number[],
  x: number,
  y: number,
  text: string,
  color: [number, number, number],
) {
  let cx = x;
  for (const ch of text) {
    drawFlipNoteGlyph(pixels, cx, y, ch, color);
    cx += glyphWidth(ch) + CHAR_GAP;
  }
}

export function drawFlipNoteTextClipped(
  pixels: number[],
  x: number,
  y: number,
  text: string,
  color: [number, number, number],
  clipX: number,
  clipW: number,
) {
  let cx = x;
  for (const ch of text) {
    const w = glyphWidth(ch);
    if (cx + w >= clipX && cx <= clipX + clipW) {
      drawFlipNoteGlyph(pixels, cx, y, ch, color);
    }
    cx += w + CHAR_GAP;
  }
}
