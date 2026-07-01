import { CANVAS_SIZE, type DvdScreensaverConfig } from '@pixopen/core';
import { DVD_COLOR_CYCLE, dvdLogoSize } from './logo.js';

const PHYSICS_STEP_MS = 16;

const CANVAS_CORNERS: Array<[number, number]> = [
  [0, 0],
  [CANVAS_SIZE - 1, 0],
  [0, CANVAS_SIZE - 1],
  [CANVAS_SIZE - 1, CANVAS_SIZE - 1],
];

export type DvdSimState = {
  x: number;
  y: number;
  cornerHits: number;
  /** Index into DVD_COLOR_CYCLE — advances on every wall bounce. */
  colorIndex: number;
};

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

function initVelocity(seed: number, speedPxPerSec: number): { vx: number; vy: number } {
  const rand = seededRandom(seed ^ 0x9e37_79b9);
  const vxSign = rand() > 0.5 ? 1 : -1;
  const vySign = rand() > 0.5 ? 1 : -1;
  const mag = Math.SQRT2;
  return {
    vx: (speedPxPerSec / mag) * vxSign,
    vy: (speedPxPerSec / mag) * vySign,
  };
}

function initPosition(seed: number, logoW: number, logoH: number): { x: number; y: number } {
  const rand = seededRandom(seed);
  const maxX = CANVAS_SIZE - logoW;
  const maxY = CANVAS_SIZE - logoH;
  return {
    x: 4 + Math.floor(rand() * Math.max(1, maxX - 8)),
    y: 4 + Math.floor(rand() * Math.max(1, maxY - 8)),
  };
}

function checkCornerHits(
  x: number,
  y: number,
  logoW: number,
  logoH: number,
  sensitivity: number,
  armed: boolean[],
): number {
  let hits = 0;
  const logoCorners: Array<[number, number]> = [
    [x, y],
    [x + logoW - 1, y],
    [x, y + logoH - 1],
    [x + logoW - 1, y + logoH - 1],
  ];

  for (let ci = 0; ci < CANVAS_CORNERS.length; ci++) {
    const [cx, cy] = CANVAS_CORNERS[ci];
    let near = false;
    for (const [lx, ly] of logoCorners) {
      if (Math.abs(lx - cx) <= sensitivity && Math.abs(ly - cy) <= sensitivity) {
        near = true;
        break;
      }
    }
    if (near && armed[ci]) {
      hits += 1;
      armed[ci] = false;
    } else if (!near) {
      armed[ci] = true;
    }
  }

  return hits;
}

function onWallBounce(colorIndex: number): number {
  return (colorIndex + 1) % DVD_COLOR_CYCLE.length;
}

/** Deterministic DVD bounce simulation — same elapsedMs always yields same position and color. */
export function simulateDvd(config: DvdScreensaverConfig, elapsedMs: number): DvdSimState {
  const { w: logoW, h: logoH } = dvdLogoSize(config.logoScale);
  const start = initPosition(config.seed, logoW, logoH);
  let x = start.x;
  let y = start.y;
  const { vx: baseVx, vy: baseVy } = initVelocity(config.seed, config.speedPxPerSec);
  let vx = baseVx;
  let vy = baseVy;
  let cornerHits = 0;
  let colorIndex = ((config.seed % DVD_COLOR_CYCLE.length) + DVD_COLOR_CYCLE.length) % DVD_COLOR_CYCLE.length;
  const armed = [true, true, true, true];

  const steps = Math.max(0, Math.floor(elapsedMs / PHYSICS_STEP_MS));
  const dt = PHYSICS_STEP_MS / 1000;

  for (let i = 0; i < steps; i++) {
    x += vx * dt;
    y += vy * dt;

    if (x <= 0) {
      if (vx < 0) colorIndex = onWallBounce(colorIndex);
      x = 0;
      vx = Math.abs(vx);
    } else if (x + logoW >= CANVAS_SIZE) {
      if (vx > 0) colorIndex = onWallBounce(colorIndex);
      x = CANVAS_SIZE - logoW;
      vx = -Math.abs(vx);
    }

    if (y <= 0) {
      if (vy < 0) colorIndex = onWallBounce(colorIndex);
      y = 0;
      vy = Math.abs(vy);
    } else if (y + logoH >= CANVAS_SIZE) {
      if (vy > 0) colorIndex = onWallBounce(colorIndex);
      y = CANVAS_SIZE - logoH;
      vy = -Math.abs(vy);
    }

    cornerHits += checkCornerHits(
      Math.round(x),
      Math.round(y),
      logoW,
      logoH,
      config.cornerSensitivity,
      armed,
    );
  }

  return { x: Math.round(x), y: Math.round(y), cornerHits, colorIndex };
}
