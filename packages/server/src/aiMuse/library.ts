import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { AiMuseCatalogEntry } from '@pixopen/core';

const LIBRARY_DIR = path.resolve(process.cwd(), 'data/ai-muse/library');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function aiMuseLibraryDir(): string {
  return LIBRARY_DIR;
}

export function libraryPublicUrl(filename: string): string {
  return `/api/ai-muse/library/${encodeURIComponent(filename)}`;
}

export function resolveLibraryFilename(name: string): string | null {
  const decoded = decodeURIComponent(name).trim();
  if (!decoded || decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) {
    return null;
  }
  const ext = path.extname(decoded).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return null;
  return decoded;
}

export function resolveLibraryFilePath(filename: string): string | null {
  const safe = resolveLibraryFilename(filename);
  if (!safe) return null;
  const full = path.join(LIBRARY_DIR, safe);
  if (!full.startsWith(LIBRARY_DIR)) return null;
  return full;
}

/** Scan the local drop-folder for images the user has added. */
export async function fetchLibraryCandidates(limit = 80): Promise<AiMuseCatalogEntry[]> {
  const target = Math.max(1, Math.min(80, limit));
  let names: string[] = [];
  try {
    names = await readdir(LIBRARY_DIR);
  } catch {
    return [];
  }

  const files = names
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  // Randomize which library files we surface when there are many.
  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [files[i], files[j]] = [files[j]!, files[i]!];
  }

  const out: AiMuseCatalogEntry[] = [];
  for (const name of files) {
    if (out.length >= target) break;
    const full = path.join(LIBRARY_DIR, name);
    try {
      const info = await stat(full);
      if (!info.isFile()) continue;
      const meta = await sharp(full).metadata();
      const width = meta.width ?? 1024;
      const height = meta.height ?? 1024;
      out.push({
        id: `library:${name}`,
        url: libraryPublicUrl(name),
        width,
        height,
        nsfwLevel: 'None',
        settings: [],
        tags: ['library', 'realism-cue', 'source:library'],
        ingestedAt: new Date(info.mtimeMs).toISOString(),
      });
    } catch {
      // Skip unreadable / corrupt files.
    }
  }
  return out;
}
