/**
 * Hand-crafted dot glyphs inspired by Bitcount Prop Double @ 9px.
 * https://fonts.google.com/specimen/Bitcount+Prop+Double
 *
 * Double-variant stems (2px thick) where space allows; proportional widths.
 * Edit this file directly — not generated from the font file.
 */

export type DotGlyph = {
  width: number;
  dots: number[][];
};

const _ = 0;
const X = 1;

/** Six ink rows + three blank rows = 9px line height. */
function g(width: number, rows: number[][]): DotGlyph {
  const ink = rows.map((row) => {
    const out = row.slice(0, width);
    while (out.length < width) out.push(_);
    return out;
  });
  while (ink.length < 9) ink.push(Array(width).fill(_));
  return { width, dots: ink };
}

export const GLYPHS: Record<string, DotGlyph> = {
  ' ': g(3, []),

  A: g(5, [
    [_, X, X, X, _],
    [X, _, _, X, X],
    [X, _, _, X, X],
    [X, X, X, X, X],
    [X, _, _, X, X],
    [X, _, _, X, X],
  ]),

  B: g(5, [
    [X, X, X, X, _],
    [X, X, _, _, X],
    [X, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, X, X, _],
  ]),

  C: g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, _],
    [X, X, _, _, _],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  D: g(5, [
    [X, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, X, X, _],
  ]),

  E: g(5, [
    [X, X, X, X, X],
    [X, X, _, _, _],
    [X, X, X, X, _],
    [X, X, _, _, _],
    [X, X, _, _, _],
    [X, X, X, X, X],
  ]),

  F: g(5, [
    [X, X, X, X, X],
    [X, X, _, _, _],
    [X, X, X, X, _],
    [X, X, _, _, _],
    [X, X, _, _, _],
    [X, X, _, _, _],
  ]),

  G: g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, _],
    [X, X, _, X, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  H: g(5, [
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, X, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
  ]),

  I: g(2, [
    [X, X],
    [X, X],
    [X, X],
    [X, X],
    [X, X],
    [X, X],
  ]),

  J: g(3, [
    [_, X, X],
    [_, X, X],
    [_, X, X],
    [_, X, X],
    [X, X, X],
    [_, X, X],
  ]),

  K: g(5, [
    [X, X, _, X, X],
    [X, X, _, X, _],
    [X, X, X, _, _],
    [X, X, X, X, _],
    [X, X, _, X, X],
    [X, X, _, X, X],
  ]),

  L: g(4, [
    [X, X, _, _],
    [X, X, _, _],
    [X, X, _, _],
    [X, X, _, _],
    [X, X, _, _],
    [X, X, X, X],
  ]),

  M: g(6, [
    [X, X, _, _, _, X],
    [X, X, X, _, X, X],
    [X, X, X, X, X, X],
    [X, X, _, X, _, X],
    [X, X, _, _, _, X],
    [X, X, _, _, _, X],
  ]),

  N: g(5, [
    [X, X, _, _, X],
    [X, X, X, _, X],
    [X, X, X, X, X],
    [X, X, _, X, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
  ]),

  O: g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  P: g(5, [
    [X, X, X, X, _],
    [X, X, _, _, X],
    [X, X, X, X, _],
    [X, X, _, _, _],
    [X, X, _, _, _],
    [X, X, _, _, _],
  ]),

  Q: g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, X, X, X],
    [_, X, X, X, X],
  ]),

  R: g(5, [
    [X, X, X, X, _],
    [X, X, _, _, X],
    [X, X, X, X, _],
    [X, X, _, X, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
  ]),

  S: g(5, [
    [_, X, X, X, X],
    [X, X, _, _, _],
    [_, X, X, X, _],
    [_, _, _, X, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  T: g(5, [
    [X, X, X, X, X],
    [_, _, X, X, _],
    [_, _, X, X, _],
    [_, _, X, X, _],
    [_, _, X, X, _],
    [_, _, X, X, _],
  ]),

  U: g(5, [
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
    [_, X, X, X, _],
  ]),

  V: g(5, [
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
    [X, X, _, X, X],
    [_, X, X, X, _],
    [_, _, X, X, _],
  ]),

  W: g(8, [
    [X, X, _, X, X, _, X, X],
    [X, X, _, X, X, _, X, X],
    [X, X, _, X, X, _, X, X],
    [X, X, X, X, X, X, X, _],
    [X, X, X, X, X, X, X, _],
    [_, X, X, _, X, X, _, _],
  ]),

  X: g(5, [
    [X, X, _, X, X],
    [X, X, _, X, X],
    [_, X, X, X, _],
    [_, X, X, X, _],
    [X, X, _, X, X],
    [X, X, _, X, X],
  ]),

  Y: g(5, [
    [X, X, _, X, X],
    [X, X, _, X, X],
    [_, X, X, X, _],
    [_, _, X, X, _],
    [_, _, X, X, _],
    [_, _, X, X, _],
  ]),

  Z: g(5, [
    [X, X, X, X, X],
    [_, _, _, X, X],
    [_, _, X, X, _],
    [_, X, X, _, _],
    [X, X, _, _, _],
    [X, X, X, X, X],
  ]),

  '0': g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  '1': g(3, [
    [_, X, X],
    [X, X, X],
    [_, X, X],
    [_, X, X],
    [_, X, X],
    [X, X, X],
  ]),

  '2': g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [_, _, _, X, X],
    [_, _, X, X, _],
    [_, X, X, _, _],
    [X, X, X, X, X],
  ]),

  '3': g(5, [
    [X, X, X, X, _],
    [_, _, _, X, X],
    [_, X, X, X, _],
    [_, _, _, X, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  '4': g(5, [
    [_, _, X, X, _],
    [_, X, X, X, _],
    [X, X, _, X, X],
    [X, X, X, X, X],
    [_, _, _, X, X],
    [_, _, _, X, X],
  ]),

  '5': g(5, [
    [X, X, X, X, X],
    [X, X, _, _, _],
    [X, X, X, X, _],
    [_, _, _, X, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  '6': g(5, [
    [_, X, X, X, _],
    [X, X, _, _, _],
    [X, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  '7': g(5, [
    [X, X, X, X, X],
    [_, _, _, X, X],
    [_, _, X, X, _],
    [_, X, X, _, _],
    [_, X, X, _, _],
    [_, X, X, _, _],
  ]),

  '8': g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [_, X, X, X, _],
  ]),

  '9': g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [X, X, _, _, X],
    [_, X, X, X, X],
    [_, _, _, X, X],
    [_, X, X, X, _],
  ]),

  '!': g(2, [
    [X, X],
    [X, X],
    [X, X],
    [X, X],
    [_, _],
    [X, X],
  ]),

  '?': g(5, [
    [_, X, X, X, _],
    [X, X, _, _, X],
    [_, _, _, X, X],
    [_, _, X, X, _],
    [_, _, _, _, _],
    [_, _, X, X, _],
  ]),

  '.': g(2, [
    [_, _],
    [_, _],
    [_, _],
    [_, _],
    [X, X],
    [X, X],
  ]),

  ',': g(2, [
    [_, _],
    [_, _],
    [_, _],
    [_, _],
    [X, X],
    [X, _],
  ]),

  '-': g(4, [
    [_, _, _, _],
    [_, _, _, _],
    [X, X, X, _],
    [_, _, _, _],
    [_, _, _, _],
    [_, _, _, _],
  ]),

  "'": g(2, [
    [X, X],
    [X, X],
    [X, _],
    [_, _],
    [_, _],
    [_, _],
  ]),
};
