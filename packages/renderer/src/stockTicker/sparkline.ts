import { setPx } from './draw.js';

export function drawSparkline(
  pixels: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  points: number[],
  _changePct: number,
  color: [number, number, number],
) {
  if (points.length < 2 || w < 2 || h < 2) return;
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const x1 = x + Math.floor((i / (n - 1)) * (w - 1));
    const x2 = x + Math.floor(((i + 1) / (n - 1)) * (w - 1));
    const y1 = y + h - 1 - Math.round(points[i]! * (h - 1));
    const y2 = y + h - 1 - Math.round(points[i + 1]! * (h - 1));
    drawLine(pixels, x1, y1, x2, y2, color);
  }
}

function drawLine(
  pixels: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: [number, number, number],
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (true) {
    setPx(pixels, x, y, color);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}
