/**
 * Pre-render Figtree Bold glyphs for Flip Note (browser-safe runtime).
 * Cleaner at small sizes than Quicksand’s rounded forms.
 * Run: npm run generate:flip-note-figtree -w @pixopen/renderer
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONT_PATH = join(ROOT, 'fonts/Figtree/Figtree.ttf');
const OUT_PATH = join(ROOT, 'src/flipNote/figtreeGlyphs.ts');

const SUPER = 8;
/** Final line box height in board pixels. */
const LINE_HEIGHT = 11;
/** Usable text width after bezel + inset (see layout TEXT_AREA ≈ 56). */
const TEXT_AREA = 56;
const CHAR_GAP = 1;

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !?.,'-";

GlobalFonts.registerFromPath(FONT_PATH, 'Figtree');

function applyFont(ctx, fontPx) {
  // Variable Figtree responds to bold / 700
  ctx.font = `700 ${fontPx}px Figtree`;
  ctx.letterSpacing = '0px';
}

/**
 * Largest supersampled size where typical words fit the padded text band
 * and the line box stays near LINE_HEIGHT.
 */
function pickFontPx() {
  const probe = createCanvas(8, 8).getContext('2d');
  let best = 56;
  for (let px = 96; px >= 48; px -= 1) {
    applyFont(probe, px);
    const welcome = measureRow(probe, 'WELCOME', px);
    const pixopen = measureRow(probe, 'PIXOPEN', px);
    const h = (px / SUPER) * 0.75;
    if (welcome <= TEXT_AREA && pixopen <= TEXT_AREA && h <= LINE_HEIGHT + 0.35) {
      best = px;
      break;
    }
  }
  return best;
}

function measureAdvance(ctx, ch, fontPx) {
  applyFont(ctx, fontPx);
  if (ch === ' ') {
    return Math.max(SUPER * 2, Math.round(ctx.measureText(' ').width));
  }
  const m = ctx.measureText(ch);
  return Math.max(SUPER, Math.ceil(m.width));
}

function measureRow(ctx, text, fontPx) {
  applyFont(ctx, fontPx);
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += measureAdvance(ctx, text[i], fontPx) / SUPER;
    if (i < text.length - 1) width += CHAR_GAP;
  }
  return width;
}

function downsampleAlpha(data, srcW, srcH, dstW, dstH) {
  const alpha = new Array(dstW * dstH);
  const scaleX = srcW / dstW;
  const scaleY = srcH / dstH;
  for (let ty = 0; ty < dstH; ty++) {
    for (let tx = 0; tx < dstW; tx++) {
      let sum = 0;
      let count = 0;
      const x0 = Math.floor(tx * scaleX);
      const y0 = Math.floor(ty * scaleY);
      const x1 = Math.min(srcW, Math.ceil((tx + 1) * scaleX));
      const y1 = Math.min(srcH, Math.ceil((ty + 1) * scaleY));
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * srcW + sx) * 4;
          const a = data[i + 3];
          const lum = Math.max(data[i], data[i + 1], data[i + 2]);
          sum += Math.max(a, lum);
          count += 1;
        }
      }
      // Mild contrast so mid greys don’t mush on Pixoo
      let v = count ? sum / count : 0;
      v = Math.min(255, Math.round(Math.pow(v / 255, 0.82) * 255));
      alpha[ty * dstW + tx] = v;
    }
  }
  return alpha;
}

function renderGlyph(ch, fontPx) {
  const pad = Math.round(fontPx * 0.1);
  const probe = createCanvas(8, 8).getContext('2d');
  const advanceHi = measureAdvance(probe, ch, fontPx);
  const cellW = advanceHi + pad * 2;
  const cellH = LINE_HEIGHT * SUPER;

  const canvas = createCanvas(cellW, cellH);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cellW, cellH);
  ctx.imageSmoothingEnabled = true;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  applyFont(ctx, fontPx);

  const baseline = Math.round(cellH * 0.82);
  const x = pad;

  if (ch !== ' ') {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    // Heavier stroke than Quicksand bake — holds weight after downsample
    ctx.lineWidth = Math.max(1.5, fontPx * 0.055);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(ch, x, baseline);
    ctx.fillText(ch, x, baseline);
  }

  const { data } = ctx.getImageData(0, 0, cellW, cellH);
  const width = Math.max(1, Math.round(advanceHi / SUPER));
  const bmpW = Math.max(width, Math.ceil(cellW / SUPER));
  const alpha = downsampleAlpha(data, cellW, cellH, bmpW, LINE_HEIGHT);

  return { width, bmpW, height: LINE_HEIGHT, alpha };
}

const fontPx = pickFontPx();
console.log(`Figtree Bold supersample font=${fontPx}px → lineHeight=${LINE_HEIGHT}`);

/** @type {Record<string, { width: number; bmpW: number; height: number; alpha: number[] }>} */
const glyphs = {};
for (const ch of CHARSET) {
  glyphs[ch] = renderGlyph(ch, fontPx);
  const g = glyphs[ch];
  const ink = g.alpha.filter((v) => v > 40).length;
  console.log(`  ${JSON.stringify(ch)} advance=${g.width} bmp=${g.bmpW}x${g.height} ink=${ink}`);
}

const probe = createCanvas(8, 8).getContext('2d');
const worst = 'WWWWWWWW';
console.log(`Row width "${worst}": ${measureRow(probe, worst, fontPx).toFixed(1)}px (textArea=${TEXT_AREA})`);
for (const s of ['HELLO', 'PIXOPEN', 'WELCOME', 'HELLO!!!']) {
  console.log(`  "${s}" → ${measureRow(probe, s, fontPx).toFixed(1)}px`);
}

const body = `/** Generated by scripts/generate-flip-note-figtree.mjs — do not edit by hand. */

export type SoftGlyph = {
  /** Layout advance in board pixels. */
  width: number;
  /** Alpha bitmap width (may be ≥ advance for AA fringe). */
  bmpW: number;
  height: number;
  /** Row-major alpha 0–255, length bmpW * height. */
  alpha: number[];
};

export const FIGTREE_LINE_HEIGHT = ${LINE_HEIGHT} as const;

export const FIGTREE_GLYPHS: Record<string, SoftGlyph> = ${JSON.stringify(glyphs, null, 2)};
`;

writeFileSync(OUT_PATH, body);
console.log(`Wrote ${OUT_PATH}`);
