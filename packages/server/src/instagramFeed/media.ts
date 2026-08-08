import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const MEDIA_DIR = path.resolve(process.cwd(), 'data/instagram/media');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function instagramMediaDir(): string {
  return MEDIA_DIR;
}

export function mediaPublicUrl(filename: string): string {
  return `/api/instagram-feed/media/${encodeURIComponent(filename)}`;
}

export function resolveMediaFilename(name: string): string | null {
  const decoded = decodeURIComponent(name).trim();
  if (!decoded || decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null;
  }
  const ext = path.extname(decoded).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return null;
  return decoded;
}

export function resolveMediaFilePath(filename: string): string | null {
  const safe = resolveMediaFilename(filename);
  if (!safe) return null;
  const full = path.join(MEDIA_DIR, safe);
  if (!full.startsWith(MEDIA_DIR)) return null;
  return full;
}

function extFromContentType(type: string | null): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('png')) return '.png';
  if (t.includes('webp')) return '.webp';
  if (t.includes('gif')) return '.gif';
  return '.jpg';
}

export async function ensureMediaDir(): Promise<void> {
  await mkdir(MEDIA_DIR, { recursive: true });
}

/** Download a remote Instagram CDN image into the local cache; return public URL. */
export async function cacheRemoteImage(id: string, remoteUrl: string): Promise<{
  url: string;
  filePath: string;
}> {
  await ensureMediaDir();
  const safeId = id.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const probeExt = path.extname(new URL(remoteUrl).pathname).toLowerCase();
  const preferredExt = IMAGE_EXT.has(probeExt) ? probeExt : '.jpg';

  // Reuse an existing cached file if present (any supported ext).
  for (const ext of [preferredExt, '.jpg', '.jpeg', '.png', '.webp']) {
    const candidate = `${safeId}${ext}`;
    const existing = path.join(MEDIA_DIR, candidate);
    try {
      await readFile(existing);
      return { url: mediaPublicUrl(candidate), filePath: existing };
    } catch {
      // not cached yet
    }
  }

  const res = await fetch(remoteUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: 'https://www.instagram.com/',
    },
  });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const ext = extFromContentType(res.headers.get('content-type'));
  const filename = `${safeId}${ext}`;
  const filePath = path.join(MEDIA_DIR, filename);
  await writeFile(filePath, bytes);
  return { url: mediaPublicUrl(filename), filePath };
}

export async function readCachedMedia(filename: string): Promise<Buffer | null> {
  const filePath = resolveMediaFilePath(filename);
  if (!filePath) return null;
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
