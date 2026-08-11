import { FIGTREE_GLYPHS, type SoftGlyph } from './figtreeGlyphs.js';

export type { SoftGlyph };

export function softGlyphFor(ch: string): SoftGlyph {
  return FIGTREE_GLYPHS[ch.toUpperCase()] ?? FIGTREE_GLYPHS[' '];
}

export function softGlyphWidth(ch: string): number {
  return softGlyphFor(ch).width;
}
