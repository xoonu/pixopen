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

export type RefreshCell = {
  /** Character to draw (ignored when blank). */
  char: string;
  /** Which character's pixel width sets this slot (target during refresh). */
  slotChar: string;
  /** Brief blank flash mid-refresh. */
  blank: boolean;
};

/** Per-cell refresh: old → blank → new, staggered left-to-right. */
function refreshCell(from: string, to: string, progress: number | null): RefreshCell {
  if (progress === null || from === to) return { char: to, slotChar: to, blank: false };
  if (progress < 0.35) return { char: from, slotChar: to, blank: false };
  if (progress < 0.55) return { char: to, slotChar: to, blank: true };
  return { char: to, slotChar: to, blank: false };
}

export function messageTiming(config: FlipNoteConfig, elapsedMs: number): RefreshCell[][] {
  const boardLines = config.boardLines ?? 1;
  const frames = chunkMessages(config.messages, boardLines);
  const holdMs = Math.max(500, config.holdMs);
  const refreshMs = Math.max(100, config.flipMs);
  const cycleMs = frames.length * (holdMs + refreshMs);
  const t = elapsedMs % cycleMs;

  let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    const holdEnd = acc + holdMs;
    const refreshEnd = holdEnd + refreshMs;
    if (t < refreshEnd) {
      const prev = frames[(i - 1 + frames.length) % frames.length];
      const next = frames[i];
      if (t < holdEnd) {
        return next.map((line) => [...line].map((ch) => ({ char: ch, slotChar: ch, blank: false })));
      }

      const elapsedRefresh = t - holdEnd;
      const changing: { row: number; col: number }[] = [];
      for (let row = 0; row < boardLines; row++) {
        for (let col = 0; col < COLS; col++) {
          const from = prev[row]?.[col] ?? ' ';
          const to = next[row]?.[col] ?? ' ';
          if (from !== to) changing.push({ row, col });
        }
      }

      const perCellMs = changing.length > 0 ? refreshMs / changing.length : refreshMs;
      const slotByKey = new Map<string, number>();
      changing.forEach(({ row, col }, index) => slotByKey.set(`${row}:${col}`, index));

      const rows: RefreshCell[][] = [];
      for (let row = 0; row < boardLines; row++) {
        const cells: RefreshCell[] = [];
        for (let col = 0; col < COLS; col++) {
          const from = prev[row]?.[col] ?? ' ';
          const to = next[row]?.[col] ?? ' ';
          const slot = slotByKey.get(`${row}:${col}`);
          if (slot === undefined) {
            cells.push({ char: to, slotChar: to, blank: false });
            continue;
          }
          const slotStart = slot * perCellMs;
          const slotEnd = slotStart + perCellMs;
          if (elapsedRefresh < slotStart) {
            cells.push({ char: from, slotChar: to, blank: false });
          } else if (elapsedRefresh >= slotEnd) {
            cells.push({ char: to, slotChar: to, blank: false });
          } else {
            const progress = (elapsedRefresh - slotStart) / perCellMs;
            cells.push(refreshCell(from, to, progress));
          }
        }
        rows.push(cells);
      }
      return rows;
    }
    acc = refreshEnd;
  }

  const fallback = frames[0];
  return fallback.map((line) => [...line].map((ch) => ({ char: ch, slotChar: ch, blank: false })));
}

export function parseFlipNoteConfig(raw: Record<string, unknown> | undefined): FlipNoteConfig {
  return normalizeFlipNoteAppConfig(raw);
}
