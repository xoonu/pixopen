import { CANVAS_SIZE, createBlackFramePixels } from '@pixopen/core';
import sharp from 'sharp';
import { readCachedMedia, resolveMediaFilename } from './media.js';

const artCache = new Map<string, number[]>();
/** Aspect ratios within this of 1.0 use a simple cover crop. */
const NEAR_SQUARE = 0.08;

type FaceRegion = { x: number; y: number; width: number; height: number; score: number };

function bufferToPixels(buffer: Buffer): number[] {
  const pixels = createBlackFramePixels();
  const expected = CANVAS_SIZE * CANVAS_SIZE * 4;
  const len = Math.min(buffer.length, expected);
  for (let i = 0; i < len; i++) pixels[i] = buffer[i]!;
  return pixels;
}

async function loadImageBytes(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('/api/instagram-feed/media/')) {
    const name = imageUrl.slice('/api/instagram-feed/media/'.length);
    const filename = resolveMediaFilename(name);
    if (!filename) throw new Error('Invalid media path');
    const bytes = await readCachedMedia(filename);
    if (!bytes) throw new Error('Cached media missing');
    return bytes;
  }

  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Instagram image fetch failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // Classic RGB skin heuristic — biases crops toward faces/people.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    max - min > 15 &&
    Math.abs(r - g) > 15
  );
}

/** Find dense skin-tone blobs (proxy for faces) in RGBA pixel data. */
function detectFaceRegions(
  data: Buffer,
  width: number,
  height: number,
): FaceRegion[] {
  const cell = Math.max(8, Math.floor(Math.min(width, height) / 16));
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const heat = new Float32Array(cols * rows);

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (!isSkinTone(r, g, b)) continue;
      const cx = Math.min(cols - 1, Math.floor(x / cell));
      const cy = Math.min(rows - 1, Math.floor(y / cell));
      heat[cy * cols + cx]! += 1;
    }
  }

  const cellArea = (cell * cell) / 4;
  const threshold = cellArea * 0.12;
  const regions: FaceRegion[] = [];

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const score = heat[cy * cols + cx] ?? 0;
      if (score < threshold) continue;
      const x = Math.max(0, cx * cell - cell);
      const y = Math.max(0, cy * cell - cell);
      const w = Math.min(width - x, cell * 3);
      const h = Math.min(height - y, cell * 3);
      regions.push({ x, y, width: w, height: h, score });
    }
  }

  regions.sort((a, b) => b.score - a.score);
  return regions.slice(0, 6);
}

function mergeFaceFocus(regions: FaceRegion[], width: number, height: number): { cx: number; cy: number } {
  if (regions.length === 0) {
    return { cx: width / 2, cy: height / 2 };
  }
  let weightSum = 0;
  let xSum = 0;
  let ySum = 0;
  for (const region of regions) {
    const w = Math.max(0.01, region.score);
    weightSum += w;
    xSum += (region.x + region.width / 2) * w;
    ySum += (region.y + region.height / 2) * w;
  }
  return { cx: xSum / weightSum, cy: ySum / weightSum };
}

async function faceAwareSquareCrop(
  bytes: Buffer,
  width: number,
  height: number,
): Promise<{ left: number; top: number; width: number; height: number }> {
  const side = Math.min(width, height);
  const previewScale = Math.min(1, 480 / Math.max(width, height));
  const previewW = Math.max(1, Math.round(width * previewScale));
  const previewH = Math.max(1, Math.round(height * previewScale));

  const preview = await sharp(bytes)
    .resize(previewW, previewH, { fit: 'fill', kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const regions = detectFaceRegions(preview.data, preview.info.width, preview.info.height);
  const focus = mergeFaceFocus(regions, preview.info.width, preview.info.height);
  const inv = previewScale > 0 ? 1 / previewScale : 1;

  const focusX = focus.cx * inv;
  const focusY = focus.cy * inv;
  let left = Math.round(focusX - side / 2);
  let top = Math.round(focusY - side / 2);
  left = Math.max(0, Math.min(width - side, left));
  top = Math.max(0, Math.min(height - side, top));
  return { left, top, width: side, height: side };
}

export async function fetchInstagramImagePixels(imageUrl: string): Promise<number[]> {
  const cached = artCache.get(imageUrl);
  if (cached) return [...cached];

  const bytes = await loadImageBytes(imageUrl);
  const meta = await sharp(bytes).metadata();
  const width = meta.width ?? CANVAS_SIZE;
  const height = meta.height ?? CANVAS_SIZE;
  const ratio = height > 0 ? width / height : 1;
  const nearSquare = Math.abs(1 - ratio) <= NEAR_SQUARE;

  let pipeline = sharp(bytes);
  if (!nearSquare && width > 0 && height > 0) {
    try {
      const crop = await faceAwareSquareCrop(bytes, width, height);
      pipeline = sharp(bytes).extract(crop);
    } catch {
      // Fall through to cover/attention resize.
    }
  }

  const resized = await pipeline
    .resize(CANVAS_SIZE, CANVAS_SIZE, {
      fit: 'cover',
      kernel: sharp.kernel.lanczos3,
      position: 'attention',
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const pixels = bufferToPixels(resized);
  artCache.set(imageUrl, pixels);
  if (artCache.size > 100) {
    const first = artCache.keys().next().value;
    if (first) artCache.delete(first);
  }
  return [...pixels];
}
