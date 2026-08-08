import { CANVAS_SIZE, createBlackFramePixels } from '@pixopen/core';

let cached: number[] | null = null;

function set(pixels: number[], x: number, y: number, r: number, g: number, b: number, a = 255) {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function fillRect(
  pixels: number[],
  x0: number,
  y0: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) set(pixels, x, y, r, g, b);
  }
}

function fillCircle(
  pixels: number[],
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
) {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) set(pixels, x, y, r, g, b);
    }
  }
}

/** Branded 64×64 card thumbnail for Instagram Feed (camera + photo grid). */
export function createInstagramFeedThumbnailPixels(): number[] {
  if (cached) return [...cached];
  const pixels = createBlackFramePixels();

  // Soft charcoal background with warm lift
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const t = (x + y) / (CANVAS_SIZE * 2 - 2);
      const v = Math.round(16 + t * 22);
      set(pixels, x, y, v + 8, v, v + 4);
    }
  }

  // Colorful mini photo grid (3×3) — suggests a mixed feed
  const tiles: Array<[number, number, number]> = [
    [220, 90, 120],
    [255, 170, 80],
    [120, 90, 220],
    [80, 180, 200],
    [240, 120, 160],
    [90, 200, 140],
    [200, 100, 80],
    [160, 120, 240],
    [100, 160, 220],
  ];
  const cell = 12;
  const gap = 2;
  const gridW = cell * 3 + gap * 2;
  const originX = Math.floor((CANVAS_SIZE - gridW) / 2);
  const originY = 8;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const [r, g, b] = tiles[row * 3 + col]!;
      const x = originX + col * (cell + gap);
      const y = originY + row * (cell + gap);
      fillRect(pixels, x, y, cell, cell, r, g, b);
      // Tiny highlight
      set(pixels, x + 1, y + 1, Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40));
    }
  }

  // Camera body overlay (lower right) so it reads as Instagram-style capture, not a blank collage
  fillRect(pixels, 38, 40, 22, 16, 245, 245, 248);
  fillRect(pixels, 40, 42, 18, 12, 28, 28, 34);
  fillCircle(pixels, 49, 48, 5, 90, 200, 220);
  fillCircle(pixels, 49, 48, 3, 20, 24, 30);
  fillRect(pixels, 42, 38, 6, 3, 245, 245, 248);
  // Status LED
  set(pixels, 56, 44, 255, 80, 100);
  set(pixels, 57, 44, 255, 80, 100);

  cached = pixels;
  return [...pixels];
}
