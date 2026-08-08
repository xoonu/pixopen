import {
  CANVAS_SIZE,
  type Frame,
  type OnAirConfig,
} from '@pixopen/core';
import { parseOnAirConfig } from './config.js';
import { ON_AIR_TEXT_ALPHA } from './textLayers.js';

const PULSE_PERIOD_MS = 1600;

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pulseAmount(elapsedMs: number, pulse: boolean): number {
  if (!pulse) return 0.88;
  const phase = (elapsedMs % PULSE_PERIOD_MS) / PULSE_PERIOD_MS;
  // Soft breathe — face stays lit; glow intensifies
  return 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
}

/**
 * Full-bleed illuminated face: deep red across nearly the whole panel,
 * soft black only in the extreme corners. No inset frame / bezel.
 */
function paintGlowField(pixels: number[], glow: number) {
  const cx = (CANVAS_SIZE - 1) / 2;
  const cy = (CANVAS_SIZE - 1) / 2;
  const rx = CANVAS_SIZE * 0.92;
  const ry = CANVAS_SIZE * 0.92;

  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Almost-flat lit face; vignette only at the very rim
      const face = clamp01(1.05 - dist * 0.35);
      const vignette = clamp01((dist - 0.88) / 0.35);
      const centerBoost = clamp01(1 - dist * 1.1);

      const baseR = 148 * glow;
      const baseG = 12 * glow;
      const baseB = 18 * glow;
      const hotR = 235 * glow;
      const hotG = 52 * glow;
      const hotB = 40 * glow;

      let r = baseR * (0.55 + 0.45 * face);
      let g = baseG * (0.55 + 0.45 * face);
      let b = baseB * (0.55 + 0.45 * face);

      const hot = centerBoost * centerBoost * 0.9;
      r = lerp(r, hotR, hot);
      g = lerp(g, hotG, hot);
      b = lerp(b, hotB, hot);

      const crush = vignette * vignette;
      r = Math.round(lerp(r, 4, crush));
      g = Math.round(lerp(g, 0, crush));
      b = Math.round(lerp(b, 1, crush));

      const i = (y * CANVAS_SIZE + x) * 4;
      pixels[i] = Math.min(255, r);
      pixels[i + 1] = Math.min(255, g);
      pixels[i + 2] = Math.min(255, b);
      pixels[i + 3] = 255;
    }
  }
}

/** 1px soft bloom of the text mask — reads as a warm halo on the red face. */
function bloomAlpha(src: number[]): Float32Array {
  const out = new Float32Array(CANVAS_SIZE * CANVAS_SIZE);
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      let max = src[y * CANVAS_SIZE + x] ?? 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= CANVAS_SIZE || ny >= CANVAS_SIZE) continue;
          const n = src[ny * CANVAS_SIZE + nx] ?? 0;
          // Neighbors contribute a softer halo
          max = Math.max(max, n * 0.45);
        }
      }
      out[y * CANVAS_SIZE + x] = max / 255;
    }
  }
  return out;
}

function paintText(pixels: number[], message: OnAirConfig['message']) {
  const alpha = ON_AIR_TEXT_ALPHA[message] ?? ON_AIR_TEXT_ALPHA['on-air'];
  const bloom = bloomAlpha(alpha);

  const textR = 252;
  const textG = 246;
  const textB = 238;
  const glowR = 255;
  const glowG = 120;
  const glowB = 90;

  for (let i = 0; i < CANVAS_SIZE * CANVAS_SIZE; i++) {
    const aText = (alpha[i] ?? 0) / 255;
    const aBloom = bloom[i] ?? 0;
    if (aText <= 0 && aBloom <= 0) continue;
    const pi = i * 4;

    // Warm halo first, then solid lettering
    if (aBloom > aText) {
      const hb = clamp01((aBloom - aText) * 1.2);
      pixels[pi] = Math.round(lerp(pixels[pi], glowR, hb));
      pixels[pi + 1] = Math.round(lerp(pixels[pi + 1], glowG, hb));
      pixels[pi + 2] = Math.round(lerp(pixels[pi + 2], glowB, hb));
    }
    if (aText > 0) {
      pixels[pi] = Math.round(lerp(pixels[pi], textR, aText));
      pixels[pi + 1] = Math.round(lerp(pixels[pi + 1], textG, aText));
      pixels[pi + 2] = Math.round(lerp(pixels[pi + 2], textB, aText));
    }
  }
}

export function renderOnAirBoard(config: OnAirConfig, elapsedMs = 0): Frame {
  const pixels = new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0);
  const glow = pulseAmount(elapsedMs, config.pulse);
  paintGlowField(pixels, glow);
  paintText(pixels, config.message);
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function renderOnAirPreview(
  appConfig: Record<string, unknown> | undefined,
  elapsedMs = 0,
): Frame {
  return renderOnAirBoard(parseOnAirConfig(appConfig), elapsedMs);
}
