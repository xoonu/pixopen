import { CANVAS_SIZE, createBlackFramePixels } from '@pixopen/core';
import sharp from 'sharp';

const artCache = new Map<string, number[]>();

function bufferToPixels(buffer: Buffer): number[] {
  const pixels = createBlackFramePixels();
  const expected = CANVAS_SIZE * CANVAS_SIZE * 4;
  const len = Math.min(buffer.length, expected);
  for (let i = 0; i < len; i++) pixels[i] = buffer[i]!;
  return pixels;
}

export async function fetchAlbumArtPixels(imageUrl: string): Promise<number[]> {
  const cached = artCache.get(imageUrl);
  if (cached) return [...cached];

  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Album art fetch failed (${res.status})`);
  const arrayBuffer = await res.arrayBuffer();
  const resized = await sharp(Buffer.from(arrayBuffer))
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'cover', kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const pixels = bufferToPixels(resized);
  artCache.set(imageUrl, pixels);
  // Bound cache size for long-running servers
  if (artCache.size > 40) {
    const first = artCache.keys().next().value;
    if (first) artCache.delete(first);
  }
  return [...pixels];
}
