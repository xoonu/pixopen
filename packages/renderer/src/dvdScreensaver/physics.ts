import { CANVAS_SIZE, type DvdScreensaverConfig } from '@pixopen/core';
import { DVD_COLOR_CYCLE, dvdLogoSize } from './logo.js';

const PHYSICS_STEP_MS = 16;
/** Rewind-from-checkpoint cost is bounded by this interval. */
const CHECKPOINT_INTERVAL_MS = 1000;
const MAX_CHECKPOINTS = 32;

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

type PhysicsCheckpoint = {
  elapsedMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cornerHits: number;
  colorIndex: number;
  armed: boolean[];
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

function roundState(
  x: number,
  y: number,
  cornerHits: number,
  colorIndex: number,
): DvdSimState {
  return { x: Math.round(x), y: Math.round(y), cornerHits, colorIndex };
}

function runPhysicsSteps(
  config: DvdScreensaverConfig,
  logoW: number,
  logoH: number,
  start: PhysicsCheckpoint,
  targetElapsedMs: number,
): DvdSimState {
  let { x, y, vx, vy, cornerHits, colorIndex } = start;
  const armed = [...start.armed];
  let elapsedMs = start.elapsedMs;

  while (elapsedMs < targetElapsedMs) {
    const stepMs = Math.min(PHYSICS_STEP_MS, targetElapsedMs - elapsedMs);
    const dt = stepMs / 1000;
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

    elapsedMs += stepMs;
  }

  return roundState(x, y, cornerHits, colorIndex);
}

/** Incremental DVD sim — O(delta) per tick, not O(total runtime). */
export class DvdSimulator {
  private config: DvdScreensaverConfig;
  private logoW: number;
  private logoH: number;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private cornerHits = 0;
  private colorIndex = 0;
  private armed = [true, true, true, true];
  private elapsedMs = 0;
  private lastCheckpointBucket = 0;
  private checkpoints: PhysicsCheckpoint[] = [];

  constructor(config: DvdScreensaverConfig) {
    this.config = config;
    const size = dvdLogoSize(config.logoScale);
    this.logoW = size.w;
    this.logoH = size.h;
    this.reset(config);
  }

  configKey(): string {
    const c = this.config;
    return `${c.seed}|${c.speedPxPerSec}|${c.logoScale}|${c.cornerSensitivity}`;
  }

  getElapsedMs(): number {
    return this.elapsedMs;
  }

  getState(): DvdSimState {
    return roundState(this.x, this.y, this.cornerHits, this.colorIndex);
  }

  reset(config?: DvdScreensaverConfig): void {
    if (config) {
      this.config = config;
      const size = dvdLogoSize(config.logoScale);
      this.logoW = size.w;
      this.logoH = size.h;
    }

    const start = initPosition(this.config.seed, this.logoW, this.logoH);
    const velocity = initVelocity(this.config.seed, this.config.speedPxPerSec);
    this.x = start.x;
    this.y = start.y;
    this.vx = velocity.vx;
    this.vy = velocity.vy;
    this.cornerHits = 0;
    this.colorIndex =
      ((this.config.seed % DVD_COLOR_CYCLE.length) + DVD_COLOR_CYCLE.length) %
      DVD_COLOR_CYCLE.length;
    this.armed = [true, true, true, true];
    this.elapsedMs = 0;
    this.lastCheckpointBucket = 0;
    this.checkpoints = [this.captureCheckpoint()];
  }

  advanceTo(targetElapsedMs: number): DvdSimState {
    const delta = targetElapsedMs - this.elapsedMs;
    if (delta > 0) return this.advanceBy(delta);
    if (delta < 0) {
      this.reset();
      if (targetElapsedMs > 0) return this.advanceBy(targetElapsedMs);
    }
    return this.getState();
  }

  advanceBy(deltaMs: number): DvdSimState {
    if (deltaMs <= 0) return this.getState();

    const targetElapsedMs = this.elapsedMs + deltaMs;
    while (this.elapsedMs < targetElapsedMs) {
      const stepMs = Math.min(PHYSICS_STEP_MS, targetElapsedMs - this.elapsedMs);
      this.physicsStep(stepMs);

      const bucket = Math.floor(this.elapsedMs / CHECKPOINT_INTERVAL_MS);
      if (bucket > this.lastCheckpointBucket) {
        this.saveCheckpoint();
        this.lastCheckpointBucket = bucket;
      }
    }

    return this.getState();
  }

  /** Exact state at a past time — for motion-trail ghosts (matches full replay). */
  stateAt(targetElapsedMs: number): DvdSimState {
    const clamped = Math.max(0, Math.min(targetElapsedMs, this.elapsedMs));
    if (clamped === this.elapsedMs) return this.getState();
    return runPhysicsSteps(
      this.config,
      this.logoW,
      this.logoH,
      this.findCheckpoint(clamped),
      clamped,
    );
  }

  private findCheckpoint(targetElapsedMs: number): PhysicsCheckpoint {
    let best = this.checkpoints[0];
    for (const cp of this.checkpoints) {
      if (cp.elapsedMs <= targetElapsedMs && cp.elapsedMs >= best.elapsedMs) {
        best = cp;
      }
    }
    return best;
  }

  private captureCheckpoint(): PhysicsCheckpoint {
    return {
      elapsedMs: this.elapsedMs,
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      cornerHits: this.cornerHits,
      colorIndex: this.colorIndex,
      armed: [...this.armed],
    };
  }

  private saveCheckpoint(): void {
    const cp = this.captureCheckpoint();
    if (this.checkpoints.some((entry) => entry.elapsedMs === cp.elapsedMs)) return;
    this.checkpoints.push(cp);
    if (this.checkpoints.length > MAX_CHECKPOINTS) {
      this.checkpoints.shift();
    }
  }

  private physicsStep(dtMs: number): void {
    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x <= 0) {
      if (this.vx < 0) this.colorIndex = onWallBounce(this.colorIndex);
      this.x = 0;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.logoW >= CANVAS_SIZE) {
      if (this.vx > 0) this.colorIndex = onWallBounce(this.colorIndex);
      this.x = CANVAS_SIZE - this.logoW;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y <= 0) {
      if (this.vy < 0) this.colorIndex = onWallBounce(this.colorIndex);
      this.y = 0;
      this.vy = Math.abs(this.vy);
    } else if (this.y + this.logoH >= CANVAS_SIZE) {
      if (this.vy > 0) this.colorIndex = onWallBounce(this.colorIndex);
      this.y = CANVAS_SIZE - this.logoH;
      this.vy = -Math.abs(this.vy);
    }

    this.cornerHits += checkCornerHits(
      Math.round(this.x),
      Math.round(this.y),
      this.logoW,
      this.logoH,
      this.config.cornerSensitivity,
      this.armed,
    );

    this.elapsedMs += dtMs;
  }
}

/** One-shot sim (e.g. thumbnails). Prefer DvdSimulator for live loops. */
export function simulateDvd(config: DvdScreensaverConfig, elapsedMs: number): DvdSimState {
  const sim = new DvdSimulator(config);
  if (elapsedMs > 0) sim.advanceTo(elapsedMs);
  return sim.getState();
}
