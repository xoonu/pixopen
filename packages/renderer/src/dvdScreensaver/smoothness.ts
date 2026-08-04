import type { DvdScreensaverConfig } from '@pixopen/core';

/** Matches DVD device push interval in server runtime. */
export const DVD_DEVICE_FRAME_MS = 500;

export function normalizeSmoothness(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

/** Higher smoothness → slower travel → smaller jumps between Pixoo frames. */
export function smoothnessSpeedMultiplier(smoothness: number): number {
  const s = normalizeSmoothness(smoothness);
  return Math.max(0.22, 1.05 - s * 0.083);
}

export function dvdEffectiveSimConfig(config: DvdScreensaverConfig): DvdScreensaverConfig {
  return {
    ...config,
    speedPxPerSec: config.speedPxPerSec * smoothnessSpeedMultiplier(config.smoothness),
  };
}

/** Max motion-trail ghosts behind the logo. */
const MAX_TRAIL_FRAMES = 2;

/** Motion-trail ghosts spaced at the device frame interval. */
export function smoothnessTrailStepCount(smoothness: number): number {
  const s = normalizeSmoothness(smoothness);
  if (s <= 2) return 0;
  return Math.min(MAX_TRAIL_FRAMES, Math.floor((s - 1) / 1.6));
}

export function smoothnessGhostAlpha(smoothness: number, stepIndex: number, totalSteps: number): number {
  const base = 10 + normalizeSmoothness(smoothness) * 5;
  const falloff = 1 - (stepIndex - 1) / (totalSteps + 1);
  return Math.max(4, Math.round(base * falloff));
}
