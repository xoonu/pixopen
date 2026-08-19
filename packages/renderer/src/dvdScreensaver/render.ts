import { CANVAS_SIZE, type DvdScreensaverConfig, type Frame } from '@pixopen/core';
import { drawDvdLogo } from './logo.js';
import { DvdSimulator } from './physics.js';
import { parseDvdScreensaverConfig } from './config.js';
import {
  DVD_DEVICE_FRAME_MS,
  dvdEffectiveSimConfig,
  smoothnessGhostAlpha,
  smoothnessTrailStepCount,
} from './smoothness.js';

export function renderDvdScreensaverFromSimulator(
  config: DvdScreensaverConfig,
  sim: DvdSimulator,
): Frame {
  const pixels = new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;

  const elapsedMs = sim.getElapsedMs();
  const trailSteps = smoothnessTrailStepCount(config.smoothness);
  const state = sim.getState();

  // Ghosts share the live logo color so the trail tracks bounce hues.
  for (let step = trailSteps; step >= 1; step--) {
    const ghost = sim.stateAt(Math.max(0, elapsedMs - step * DVD_DEVICE_FRAME_MS));
    const alpha = smoothnessGhostAlpha(config.smoothness, step, trailSteps);
    drawDvdLogo(pixels, ghost.x, ghost.y, config.logoScale, state.colorIndex, alpha);
  }

  drawDvdLogo(pixels, state.x, state.y, config.logoScale, state.colorIndex);

  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function renderDvdScreensaverBoard(
  config: DvdScreensaverConfig,
  elapsedMs: number,
): Frame {
  const simConfig = dvdEffectiveSimConfig(config);
  const sim = new DvdSimulator(simConfig);
  if (elapsedMs > 0) sim.advanceTo(elapsedMs);
  return renderDvdScreensaverFromSimulator(config, sim);
}

export function renderDvdScreensaverPreview(
  appConfig: Record<string, unknown> | undefined,
  elapsedMs: number,
): Frame {
  const config = parseDvdScreensaverConfig(appConfig);
  return renderDvdScreensaverBoard(config, elapsedMs);
}

export { simulateDvd, DvdSimulator } from './physics.js';
