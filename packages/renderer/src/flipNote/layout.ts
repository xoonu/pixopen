import { CANVAS_SIZE } from '@pixopen/core';

/** Characters per row on the 64×64 board. */
export const COLS = 8;

export const BEZEL = 1;
export const INNER = CANVAS_SIZE - BEZEL * 2;
export const BEZEL_COLOR: [number, number, number] = [6, 7, 10];

/** Gap between characters in screen pixels. */
export const CHAR_GAP = 1;

/**
 * Native Bitcount Prop Double render size — 1 font pixel = 1 screen pixel.
 * Keep in sync with scripts/flip-note-layout.mjs.
 */
export const FONT_PX = 9;
export const LINE_HEIGHT = FONT_PX;

/** @deprecated alias */
export const DOT_ROWS = LINE_HEIGHT;

export const ROW_HEIGHT = LINE_HEIGHT;

export function boardLayout(boardLines: 1 | 2 | 3) {
  const rowGap = boardLines > 1 ? 2 : 0;
  const gridH = boardLines * ROW_HEIGHT + (boardLines - 1) * rowGap;
  return {
    rowGap,
    boardY: BEZEL + Math.floor((INNER - gridH) / 2),
  };
}
