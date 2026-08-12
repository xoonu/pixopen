/**
 * Pre-render Figtree Bold digits for Weather Frame temperature.
 * Larger than Flip Note glyphs so we avoid soft upscaling blur.
 * Run: npm run generate:weather-temp-figtree -w @pixopen/renderer
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FONT_PATH = join(ROOT, 'fonts/Figtree/Figtree.ttf');
const OUT_PATH = join(ROOT, 'src/weatherFrame/tempFigtreeGlyphs.ts');

const SUPER = 8;
/** Native glyph box — tall enough to read, narrow enough for 2–3 chars in TEMP_COL. */
const LINE_HEIGHT = 18;
const CHAR_GAP = 0;
const CHARSET = '0123456789-';

GlobalFonts.registerFromPath(FONT_PATH, 'Figtree');

function applyFont(ctx, fontPx) {
  ctx.font = `700 ${fontPx}px Figtree`;
  ctx.letterSpacing = '0px';
}

function pickFontPx() {
  const probe = createCanvas(8, 8).getContext('2d');
  let best = 160;
  // Largest supersampled size whose cropped height lands near LINE_HEIGHT
  for (let px = 280; px >= 120; px -= 1) {
    applyFont(probe, px);
    const m = probe.measureText('8');
    const ink = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const h = ink / SUPER;
    if (h <= LINE_HEIGHT + 0.4) {
      best = px;
      break;
    }
  }
  return best;
}

function bakeGlyph(ch, fontPx) {
  const big = createCanvas(fontPx * 3, fontPx * 3);
  const bctx = big.getContext('2d');
  bctx.clearRect(0, 0, big.width, big.height);
  bctx.fillStyle = '#ffffff';
  bctx.textBaseline = 'alphabetic';
  applyFont(bctx, fontPx);
  const m = bctx.measureText(ch);
  const ascent = Math.ceil(m.actualBoundingBoxAscent);
  const descent = Math.ceil(m.actualBoundingBoxDescent);
  const left = Math.ceil(Math.max(0, -m.actualBoundingBoxLeft));
  const right = Math.ceil(Math.max(m.width, m.actualBoundingBoxRight));
  const pad = 4;
  const bw = left + right + pad * 2;
  const bh = ascent + descent + pad * 2;
  const canvas = createCanvas(bw, bh);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  applyFont(ctx, fontPx);
  ctx.fillText(ch, pad + left, pad + ascent);
  const { data } = ctx.getImageData(0, 0, bw, bh);

  const outW = Math.max(1, Math.ceil(bw / SUPER));
  const outH = Math.max(1, Math.ceil(bh / SUPER));
  const alpha = [];
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let sum = 0;
      let count = 0;
      for (let sy = 0; sy < SUPER; sy++) {
        for (let sx = 0; sx < SUPER; sx++) {
          const ix = x * SUPER + sx;
          const iy = y * SUPER + sy;
          if (ix >= bw || iy >= bh) continue;
          sum += data[(iy * bw + ix) * 4 + 3];
          count++;
        }
      }
      const avg = count ? sum / count : 0;
      // Harder edge than Flip Note — temperature must read crisp on glass
      const t = Math.pow(avg / 255, 0.5);
      const sharpened = t < 0.22 ? 0 : t > 0.78 ? 1 : (t - 0.22) / 0.56;
      alpha.push(Math.round(Math.min(255, Math.max(0, sharpened * 255))));
    }
  }

  let minX = outW;
  let maxX = -1;
  let minY = outH;
  let maxY = -1;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      if ((alpha[y * outW + x] ?? 0) > 12) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) {
    return { w: Math.max(1, Math.round(m.width / SUPER)), h: LINE_HEIGHT, bmpW: 1, alpha: [0] };
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      cropped.push(alpha[y * outW + x] ?? 0);
    }
  }

  return {
    w: cropW,
    h: LINE_HEIGHT,
    bmpW: cropW,
    alpha: cropped,
    baseline: Math.round((pad + ascent) / SUPER) - minY,
  };
}

const fontPx = pickFontPx();
const glyphs = {};
for (const ch of CHARSET) {
  glyphs[ch] = bakeGlyph(ch, fontPx);
}

const body = `/* AUTO-GENERATED — run: npm run generate:weather-temp-figtree -w @pixopen/renderer */
export const WEATHER_TEMP_LINE_HEIGHT = ${LINE_HEIGHT};
export const WEATHER_TEMP_CHAR_GAP = ${CHAR_GAP};

export type WeatherTempSoftGlyph = {
  w: number;
  h: number;
  bmpW: number;
  alpha: number[];
  baseline?: number;
};

export const WEATHER_TEMP_GLYPHS: Record<string, WeatherTempSoftGlyph> = ${JSON.stringify(glyphs, null, 2)};
`;

writeFileSync(OUT_PATH, body);
console.log(`Wrote ${OUT_PATH} (fontPx=${fontPx}, line=${LINE_HEIGHT})`);
