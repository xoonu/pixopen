import { CANVAS_SIZE, createBlackFramePixels } from '@pixopen/core';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { resolveLibraryFilePath } from './library.js';

const artCache = new Map<string, number[]>();

function bufferToPixels(buffer: Buffer): number[] {
  const pixels = createBlackFramePixels();
  const expected = CANVAS_SIZE * CANVAS_SIZE * 4;
  const len = Math.min(buffer.length, expected);
  for (let i = 0; i < len; i++) pixels[i] = buffer[i]!;
  return pixels;
}

async function loadImageBytes(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('/api/ai-muse/library/')) {
    const name = imageUrl.slice('/api/ai-muse/library/'.length);
    const filePath = resolveLibraryFilePath(name);
    if (!filePath) throw new Error('Invalid library image path');
    return readFile(filePath);
  }

  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`AI Muse image fetch failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export async function fetchAiMuseImagePixels(imageUrl: string): Promise<number[]> {
  const cached = artCache.get(imageUrl);
  if (cached) return [...cached];

  const bytes = await loadImageBytes(imageUrl);
  const resized = await sharp(bytes)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const pixels = bufferToPixels(resized);
  artCache.set(imageUrl, pixels);
  if (artCache.size > 80) {
    const first = artCache.keys().next().value;
    if (first) artCache.delete(first);
  }
  return [...pixels];
}
