import type { Frame, FlipNoteConfig } from '@pixopen/core';
import { BEZEL_COLOR } from './layout.js';
import { drawFlipNoteBoard } from './draw.js';
import { messageTiming, parseFlipNoteConfig } from './timing.js';

export { parseFlipNoteConfig } from './timing.js';

export function renderFlipNoteBoard(
  base: Frame,
  config: FlipNoteConfig,
  elapsedMs: number,
): Frame {
  const pixels = [...base.pixels];
  const cfg = parseFlipNoteConfig(config as unknown as Record<string, unknown>);
  const rows = messageTiming(cfg, elapsedMs);
  drawFlipNoteBoard(pixels, cfg, rows);
  return { width: 64, height: 64, pixels };
}

export function renderFlipNotePreview(config: FlipNoteConfig, tickMs: number): Frame {
  const pixels = new Array(64 * 64 * 4).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = BEZEL_COLOR[0];
    pixels[i + 1] = BEZEL_COLOR[1];
    pixels[i + 2] = BEZEL_COLOR[2];
    pixels[i + 3] = 255;
  }
  return renderFlipNoteBoard({ width: 64, height: 64, pixels }, config, tickMs);
}
