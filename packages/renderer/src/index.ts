import { CANVAS_SIZE, type Frame, type LiveArea } from '@pixopen/core';
import type { DataSourceResult } from '@pixopen/datasources';

export const WIDGETS = [
  { id: 'text', name: 'Text', description: 'Render text value in area' },
  { id: 'text-scroll', name: 'Scrolling Text', description: 'Scroll long text across area' },
  { id: 'icon-value', name: 'Icon + Value', description: 'Icon with primary and secondary text' },
] as const;

function setPixel(pixels: number[], x: number, y: number, r: number, g: number, b: number, a = 255) {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
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
  ':': [[0],[0],[1],[0],[0]],
  'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
  'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
  'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'S': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  '°': [[0,1,0],[1,0,1],[0,1,0],[0,0,0],[0,0,0]],
  '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  '$': [[0,1,1,0],[1,1,0,0],[0,1,1,0],[0,0,1,1],[0,1,1,0]],
  '.': [[0],[0],[0],[0],[1]],
  ' ': [[0],[0],[0],[0],[0]],
};

function drawChar(pixels: number[], x: number, y: number, ch: string, color: [number, number, number], scale = 1) {
  const glyph = FONT[ch.toUpperCase()] ?? FONT[' '];
  for (let gy = 0; gy < glyph.length; gy++) {
    for (let gx = 0; gx < glyph[gy].length; gx++) {
      if (!glyph[gy][gx]) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          setPixel(pixels, x + gx * scale + sx, y + gy * scale + sy, color[0], color[1], color[2]);
        }
      }
    }
  }
}

function drawText(pixels: number[], x: number, y: number, text: string, color: [number, number, number], scale = 1) {
  let cx = x;
  const advance = 4 * scale;
  for (const ch of text) {
    drawChar(pixels, cx, y, ch, color, scale);
    cx += advance;
  }
}

function fillRect(pixels: number[], rect: { x: number; y: number; w: number; h: number }, color: [number, number, number]) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      setPixel(pixels, x, y, color[0], color[1], color[2]);
    }
  }
}

export function renderWidgetIntoArea(
  pixels: number[],
  area: LiveArea,
  data: DataSourceResult,
  tick = 0,
): void {
  const { rect, widgetId } = area;
  fillRect(pixels, rect, [20, 20, 40]);

  const text = data.text ?? '';
  const secondary = data.secondary ?? '';
  const color: [number, number, number] = [220, 240, 255];

  if (widgetId === 'text-scroll') {
    const scale = rect.h >= 10 ? 2 : 1;
    const offset = tick % (text.length * 4 + rect.w);
    drawText(pixels, rect.x - offset, rect.y + Math.max(0, Math.floor((rect.h - 5 * scale) / 2)), text, color, scale);
    if (secondary) {
      drawText(pixels, rect.x, rect.y + rect.h - 6, secondary.slice(0, 8), [140, 180, 220], 1);
    }
    return;
  }

  if (widgetId === 'icon-value') {
    fillRect(pixels, { x: rect.x + 1, y: rect.y + 1, w: 6, h: 6 }, [80, 160, 255]);
    drawText(pixels, rect.x + 8, rect.y + 1, text.slice(0, 6), color, 1);
    if (secondary) drawText(pixels, rect.x + 8, rect.y + 8, secondary.slice(0, 10), [160, 200, 255], 1);
    return;
  }

  const scale = rect.h >= 12 ? 2 : 1;
  const display = text.slice(0, Math.floor(rect.w / (4 * scale)));
  drawText(
    pixels,
    rect.x + 1,
    rect.y + Math.max(0, Math.floor((rect.h - 5 * scale) / 2)),
    display,
    color,
    scale,
  );
}

export { renderFlipNoteBoard, renderFlipNotePreview, parseFlipNoteConfig } from './flipNote/index.js';

export function compositeFrame(
  base: Frame,
  areas: LiveArea[],
  values: Map<string, DataSourceResult>,
  tick = 0,
): Frame {
  const pixels = [...base.pixels];
  const sorted = [...areas].sort((a, b) => a.zIndex - b.zIndex);
  for (const area of sorted) {
    const data = values.get(area.id);
    if (!data) continue;
    renderWidgetIntoArea(pixels, area, data, tick);
  }
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}
