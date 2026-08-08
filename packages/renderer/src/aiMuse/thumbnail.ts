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

/** Branded 64×64 card thumbnail for AI Muse (portrait muse mark). */
export function createAiMuseThumbnailPixels(): number[] {
  if (cached) return [...cached];
  const pixels = createBlackFramePixels();

  // Warm dusk gradient background
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const t = y / (CANVAS_SIZE - 1);
      const r = Math.round(18 + t * 42);
      const g = Math.round(12 + t * 18);
      const b = Math.round(36 + t * 70);
      set(pixels, x, y, r, g, b);
    }
  }

  // Soft vignette glow behind figure
  fillCircle(pixels, 32, 30, 22, 48, 28, 72);
  fillCircle(pixels, 32, 28, 16, 70, 40, 96);

  // Portrait silhouette — head
  fillCircle(pixels, 32, 22, 9, 230, 196, 170);
  // Hair mass
  fillCircle(pixels, 32, 18, 10, 42, 28, 52);
  fillRect(pixels, 22, 18, 20, 8, 42, 28, 52);
  // Face peek
  fillCircle(pixels, 32, 24, 7, 236, 204, 178);
  // Neck / shoulders
  fillRect(pixels, 29, 31, 6, 5, 230, 196, 170);
  fillCircle(pixels, 32, 48, 16, 210, 170, 150);
  fillRect(pixels, 16, 48, 32, 16, 48, 32, 68);

  // Accent sparkles (muse)
  const sparkles: Array<[number, number]> = [
    [12, 12],
    [50, 14],
    [14, 44],
    [52, 40],
    [8, 28],
  ];
  for (const [sx, sy] of sparkles) {
    set(pixels, sx, sy, 255, 220, 140);
    set(pixels, sx + 1, sy, 255, 200, 120);
    set(pixels, sx, sy + 1, 255, 200, 120);
    set(pixels, sx - 1, sy, 200, 160, 90);
    set(pixels, sx, sy - 1, 200, 160, 90);
  }

  cached = pixels;
  return [...pixels];
}
