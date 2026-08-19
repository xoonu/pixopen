import { CANVAS_SIZE } from '@pixopen/core';
import { setPx } from '../stockTicker/draw.js';

/** Pixel mask sampled from the classic DVD Video logo (DVD over disc oval). */
export const DVD_LOGO_W = 30;
export const DVD_LOGO_H = 13;

/** 1 = logo pixel */
type LogoCell = 0 | 1;

let cachedMask: LogoCell[] | null = null;

/** Classic dodger blue plus screensaver bounce hues. */
export const DVD_COLOR_CYCLE: Array<[number, number, number]> = [
  [46, 139, 255],
  [220, 20, 60],
  [255, 140, 0],
  [255, 215, 0],
  [50, 205, 50],
  [0, 206, 209],
  [138, 43, 226],
  [255, 20, 147],
];

const LOGO_ROWS = [
  '..############.....##########.',
  '......#######....###.....####',
  '..###...#######..###.##....###',
  '..###...#######.###.###....###',
  '.###....###..#####..###....###',
  '.###..####...####...###..####.',
  '.########....###....#######...',
  '..............##..............',
  '..............#...............',
  '......##############..........',
  '.###########################..',
  '###########......###########..',
  '...#######################....',
];

function buildLogoMask(): LogoCell[] {
  const mask: LogoCell[] = new Array(DVD_LOGO_W * DVD_LOGO_H).fill(0);
  for (let row = 0; row < LOGO_ROWS.length; row++) {
    const line = LOGO_ROWS[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === '#') mask[row * DVD_LOGO_W + col] = 1;
    }
  }
  return mask;
}

function logoMask(): LogoCell[] {
  if (!cachedMask) cachedMask = buildLogoMask();
  return cachedMask;
}

function isLogoAt(mask: LogoCell[], col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= DVD_LOGO_W || row >= DVD_LOGO_H) return false;
  return mask[row * DVD_LOGO_W + col] === 1;
}

/** Count transparent 4-neighbors — used for subtle silhouette AA on the main logo. */
function exteriorOpenNeighbors(mask: LogoCell[], col: number, row: number): number {
  let open = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (!isLogoAt(mask, col + dx, row + dy)) open += 1;
  }
  return open;
}

/** Main logo: solid fill with light edge AA. Trail ghosts skip this pass. */
function pixelAlpha(openNeighbors: number): number {
  if (openNeighbors === 0) return 255;
  if (openNeighbors >= 2) return 215;
  return 232;
}

/** Dim a logo color for trail ghosts — linear fade, same hue, no brightness lift. */
function ghostTint(color: [number, number, number], alpha: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, alpha / 255));
  return [
    Math.round(color[0] * t),
    Math.round(color[1] * t),
    Math.round(color[2] * t),
  ];
}

function drawLogoPixel(
  pixels: number[],
  px: number,
  py: number,
  color: [number, number, number],
  alpha: number,
) {
  if (alpha >= 255) setPx(pixels, px, py, color);
  else plotPixel(pixels, px, py, color, alpha);
}

function plotPixel(
  pixels: number[],
  px: number,
  py: number,
  color: [number, number, number],
  alpha: number,
) {
  if (alpha >= 255) {
    setPx(pixels, px, py, color);
    return;
  }
  if (alpha <= 0) return;
  if (px < 0 || py < 0 || px >= CANVAS_SIZE || py >= CANVAS_SIZE) return;
  const i = (py * CANVAS_SIZE + px) * 4;
  const srcA = alpha / 255;
  const dstA = pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  pixels[i] = Math.round((color[0] * srcA + pixels[i] * dstA * (1 - srcA)) / outA);
  pixels[i + 1] = Math.round((color[1] * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA);
  pixels[i + 2] = Math.round((color[2] * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA);
  pixels[i + 3] = Math.round(outA * 255);
}

export function dvdLogoSize(scale: 1 | 2): { w: number; h: number } {
  return { w: DVD_LOGO_W * scale, h: DVD_LOGO_H * scale };
}

/** Classic blue DVD Video logo on black — color cycles on wall bounce. */
export function drawDvdLogo(
  pixels: number[],
  x: number,
  y: number,
  scale: 1 | 2,
  colorIndex: number,
  globalAlpha = 255,
) {
  if (globalAlpha <= 0) return;
  const mask = logoMask();
  const color = DVD_COLOR_CYCLE[((colorIndex % DVD_COLOR_CYCLE.length) + DVD_COLOR_CYCLE.length) % DVD_COLOR_CYCLE.length];
  const isGhost = globalAlpha < 255;
  const drawColor = isGhost ? ghostTint(color, globalAlpha) : color;

  for (let row = 0; row < DVD_LOGO_H; row++) {
    for (let col = 0; col < DVD_LOGO_W; col++) {
      if (!isLogoAt(mask, col, row)) continue;
      const alpha = isGhost ? 255 : pixelAlpha(exteriorOpenNeighbors(mask, col, row));

      if (scale === 1) {
        drawLogoPixel(pixels, x + col, y + row, drawColor, alpha);
      } else {
        for (let sy = 0; sy < 2; sy++) {
          for (let sx = 0; sx < 2; sx++) {
            drawLogoPixel(pixels, x + col * 2 + sx, y + row * 2 + sy, drawColor, alpha);
          }
        }
      }
    }
  }
}
