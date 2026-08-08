import { CANVAS_SIZE, createBlackFramePixels, DEFAULT_ON_AIR_CONFIG } from '@pixopen/core';
import { renderOnAirBoard } from './render.js';

let cached: number[] | null = null;

/** Branded 64×64 card thumbnail — static ON AIR plaque (no pulse). */
export function createOnAirThumbnailPixels(): number[] {
  if (cached) return [...cached];
  const frame = renderOnAirBoard({ ...DEFAULT_ON_AIR_CONFIG, pulse: false }, 0);
  cached = frame.pixels;
  // Ensure we always return a full black-backed buffer if something odd happens
  if (!cached || cached.length !== CANVAS_SIZE * CANVAS_SIZE * 4) {
    cached = createBlackFramePixels();
  }
  return [...cached];
}
