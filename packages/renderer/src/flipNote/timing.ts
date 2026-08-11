import { DEFAULT_FLIP_NOTE_CONFIG, normalizeFlipNoteAppConfig, type FlipNoteConfig } from '@pixopen/core';
import { COLS } from './layout.js';

function padMessage(msg: string): string {
  return msg.toUpperCase().slice(0, COLS).padEnd(COLS, ' ');
}

function chunkMessages(messages: string[], boardLines: number): string[][] {
  const source = messages.length > 0 ? messages : [...DEFAULT_FLIP_NOTE_CONFIG.messages];
  const frames: string[][] = [];
  for (let i = 0; i < source.length; i += boardLines) {
    const frame: string[] = [];
    for (let row = 0; row < boardLines; row++) {
      frame.push(padMessage(source[i + row] ?? ''));
    }
    frames.push(frame);
  }
  return frames.length > 0 ? frames : [[padMessage('PIXOPEN')]];
}

/** All message frames for the board (each frame is `boardLines` padded rows). */
export function messageFrames(config: FlipNoteConfig): string[][] {
  return chunkMessages(config.messages, config.boardLines ?? 1);
}

export type RefreshCell = {
  /** Character to draw (ignored when blank). */
  char: string;
  /** Which character's pixel width sets this slot. */
  slotChar: string;
  /** Reserved — Flip Note no longer uses mid-transition blanks. */
  blank: boolean;
};

function cellsForFrame(frame: string[]): RefreshCell[][] {
  return frame.map((line) =>
    [...line].map((ch) => ({ char: ch, slotChar: ch, blank: false })),
  );
}

/**
 * Hard-cut between message frames. No staggered flip — Pixoo refresh is too
 * coarse for per-cell blank animation.
 */
export function messageTiming(config: FlipNoteConfig, elapsedMs: number): RefreshCell[][] {
  const frames = messageFrames(config);
  const holdMs = Math.max(500, config.holdMs);
  const index = Math.floor(elapsedMs / holdMs) % frames.length;
  return cellsForFrame(frames[index] ?? frames[0]);
}

export function parseFlipNoteConfig(raw: Record<string, unknown> | undefined): FlipNoteConfig {
  return normalizeFlipNoteAppConfig(raw);
}
