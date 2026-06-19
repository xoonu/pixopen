/**
 * Glyphs are hand-crafted in src/flipNote/glyphs.ts (Bitcount Prop Double style).
 * This script only validates the glyph set — it does not overwrite glyphs.ts.
 *
 * Run: node scripts/generate-flip-note-font.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GLYPHS_PATH = join(__dirname, '../src/flipNote/glyphs.ts');

const EXPECTED = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,-\''.split('');

const src = readFileSync(GLYPHS_PATH, 'utf8');
function hasGlyph(ch, src) {
  if (ch >= 'A' && ch <= 'Z') return src.includes(`  ${ch}: g(`);
  if (ch === ' ') return src.includes(`  ' ': g(`);
  if (ch === "'") return src.includes(`  "'": g(`);
  return src.includes(`  '${ch}': g(`);
}

const missing = EXPECTED.filter((ch) => !hasGlyph(ch, src));
const found = EXPECTED.filter((ch) => hasGlyph(ch, src));

if (missing.length) {
  console.error('Missing glyphs:', missing.map(JSON.stringify).join(', '));
  process.exit(1);
}

console.log(`Validated ${found.length} hand-crafted glyphs in ${GLYPHS_PATH}`);
