import type { DotGlyph } from './glyphs.js';
import { GLYPHS } from './glyphs.js';

export function glyphFor(ch: string): DotGlyph {
  return GLYPHS[ch.toUpperCase()] ?? GLYPHS[' '];
}

export function glyphWidth(ch: string): number {
  return glyphFor(ch).width;
}
