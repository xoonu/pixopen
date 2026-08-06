import type { AiMuseCatalogEntry, AiMuseSources } from '@pixopen/core';
import { hasRealismCue, isAnimeBaseModel, isPhotorealHumanWomanPrompt } from './quality.js';
import { fetchLibraryCandidates } from './library.js';
import {
  extractAgeBand,
  extractEthnicity,
  extractEyeColor,
  extractHairColor,
  extractHairLength,
  extractSettings,
  impliesMinor,
} from './tags.js';

const CIVITAI_IMAGES_URL = 'https://civitai.com/api/v1/images';

/**
 * Photoreal checkpoints used only as browse hints. Every image still must pass
 * prompt-based woman + realism gates — no metadata-free accepts.
 */
const PHOTOREAL_MODEL_IDS = [
  4201, // Realistic Vision
  81458, // AbsoluteReality
  25694, // epiCRealism
  132632, // epiCPhotoGasm
  139562, // RealVisXL
];

type CivitaiImage = {
  id?: number | string;
  url?: string;
  width?: number | null;
  height?: number | null;
  nsfwLevel?: string | number | boolean;
  baseModel?: string | null;
  meta?: {
    prompt?: string;
    aspectRatio?: { value?: string; width?: number; height?: number } | string;
  } | null;
  tags?: Array<string | { name?: string }>;
};

function nsfwIsNone(level: unknown): boolean {
  if (level == null) return true;
  if (typeof level === 'boolean') return !level;
  if (typeof level === 'number') return level === 1 || level === 0;
  const s = String(level).toLowerCase();
  return s === 'none' || s === '0' || s === 'false';
}

function resolveDimensions(item: CivitaiImage): { width: number; height: number } | null {
  let width = Number(item.width);
  let height = Number(item.height);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  const ar = item.meta?.aspectRatio;
  if (ar && typeof ar === 'object') {
    width = Number(ar.width);
    height = Number(ar.height);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
    if (ar.value === '1:1') return { width: 1024, height: 1024 };
  }
  if (typeof ar === 'string' && ar === '1:1') return { width: 1024, height: 1024 };
  return null;
}

/** Prefer portrait / near-square faces; reject ultra-wide scenery. */
function isDisplayableAspect(width: number, height: number): boolean {
  const ratio = width / height;
  return ratio >= 0.55 && ratio <= 1.15;
}

function collectText(item: CivitaiImage): { prompt: string; text: string; tags: string[] } {
  const tags: string[] = [];
  if (Array.isArray(item.tags)) {
    for (const tag of item.tags) {
      if (typeof tag === 'string' && tag.trim()) tags.push(tag.trim());
      else if (tag && typeof tag === 'object' && typeof tag.name === 'string' && tag.name.trim()) {
        tags.push(tag.name.trim());
      }
    }
  }
  const prompt = typeof item.meta?.prompt === 'string' ? item.meta.prompt.trim() : '';
  return { prompt, text: `${prompt}\n${tags.join(' ')}`, tags };
}

function parseEntry(item: CivitaiImage): AiMuseCatalogEntry | null {
  const id = item.id != null ? String(item.id) : '';
  const url = typeof item.url === 'string' ? item.url : '';
  const dims = resolveDimensions(item);
  if (!id || !url.startsWith('http') || !dims) return null;
  if (!isDisplayableAspect(dims.width, dims.height)) return null;
  if (!nsfwIsNone(item.nsfwLevel)) return null;
  if (isAnimeBaseModel(item.baseModel)) return null;

  const { prompt, text, tags } = collectText(item);
  // Hard requirement: real prompt metadata. No prompt → no accept.
  if (!prompt || prompt.length < 20) return null;
  if (!isPhotorealHumanWomanPrompt(prompt)) return null;
  if (impliesMinor(text)) return null;

  const age = extractAgeBand(text);
  return {
    id,
    url,
    width: dims.width,
    height: dims.height,
    nsfwLevel: 'None',
    ethnicity: extractEthnicity(text),
    eyeColor: extractEyeColor(text),
    hairColor: extractHairColor(text),
    hairLength: extractHairLength(text),
    ...age,
    settings: extractSettings(text),
    tags: hasRealismCue(prompt) ? [...tags, 'realism-cue', 'source:civitai'] : [...tags, 'source:civitai'],
    ingestedAt: new Date().toISOString(),
  };
}

async function fetchImagePage(params: Record<string, string>): Promise<{
  items: CivitaiImage[];
  nextCursor?: string;
}> {
  const url = new URL(CIVITAI_IMAGES_URL);
  for (const [key, value] of Object.entries(params)) {
    if (key === 'cursor' && !value) continue;
    url.searchParams.set(key, value);
  }
  if (!url.searchParams.has('limit')) url.searchParams.set('limit', '100');
  url.searchParams.set('nsfw', 'None');
  url.searchParams.set('type', 'image');
  url.searchParams.set('withMeta', 'true');

  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) break;
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  if (!res?.ok) throw new Error(`Civitai fetch failed (${res?.status ?? 'network'})`);
  const body = (await res.json()) as {
    items?: CivitaiImage[];
    metadata?: { nextCursor?: string | null };
  };
  const next = body.metadata?.nextCursor;
  return {
    items: Array.isArray(body.items) ? body.items : [],
    nextCursor: typeof next === 'string' ? next : undefined,
  };
}

type BrowseSpec = {
  sort: string;
  period?: string;
  maxPages: number;
  modelId?: number;
};

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

async function fetchCivitaiCandidates(limit: number): Promise<AiMuseCatalogEntry[]> {
  const target = Math.max(6, Math.min(80, limit));
  const out: AiMuseCatalogEntry[] = [];
  const seen = new Set<string>();

  // Prefer meta-rich browse feeds. Model IDs are secondary and still require prompts.
  const browseSources: BrowseSpec[] = [
    { sort: 'Newest', maxPages: 16 },
    { sort: 'Most Reactions', period: 'Month', maxPages: 8 },
    { sort: 'Most Reactions', period: 'Week', maxPages: 6 },
  ];
  const modelSources: BrowseSpec[] = PHOTOREAL_MODEL_IDS.map((modelId) => ({
    sort: 'Newest',
    maxPages: 3,
    modelId,
  }));

  shuffleInPlace(modelSources);
  const ordered = [...browseSources, ...modelSources];

  for (const source of ordered) {
    if (out.length >= target) break;
    let cursor: string | undefined;
    // Occasional page skip on Newest for variety — not so deep we starve matches.
    let pagesToSkip = source.sort === 'Newest' && !source.modelId ? Math.floor(Math.random() * 2) : 0;

    for (let page = 0; page < source.maxPages && out.length < target; page++) {
      const params: Record<string, string> = {
        sort: source.sort,
        limit: '100',
      };
      if (source.period) params.period = source.period;
      if (source.modelId) params.modelId = String(source.modelId);
      if (cursor) params.cursor = cursor;

      let result: { items: CivitaiImage[]; nextCursor?: string };
      try {
        result = await fetchImagePage(params);
      } catch {
        break;
      }

      if (result.items.length === 0) break;

      if (pagesToSkip > 0) {
        pagesToSkip -= 1;
        cursor = result.nextCursor;
        if (!cursor) break;
        continue;
      }

      shuffleInPlace(result.items);

      for (const item of result.items) {
        const entry = parseEntry(item);
        if (!entry || seen.has(entry.id)) continue;
        seen.add(entry.id);
        out.push(entry);
        if (out.length >= target) break;
      }

      cursor = result.nextCursor;
      if (!cursor) break;
    }
  }

  return out;
}

/**
 * Pull candidates from enabled sources (Civitai + local library).
 */
export async function fetchLiveCandidates(
  limit = 24,
  sources: AiMuseSources = { civitai: true, library: true },
): Promise<AiMuseCatalogEntry[]> {
  const target = Math.max(6, Math.min(80, limit));
  const out: AiMuseCatalogEntry[] = [];
  const seen = new Set<string>();

  const pushAll = (entries: AiMuseCatalogEntry[]) => {
    for (const entry of entries) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
      if (out.length >= target) break;
    }
  };

  // Civitai first so quality-gated portraits fill the pool before optional library files.
  if (sources.civitai) {
    pushAll(await fetchCivitaiCandidates(target));
  }

  if (sources.library && out.length < target) {
    try {
      pushAll(await fetchLibraryCandidates(target - out.length));
    } catch {
      // Library is optional.
    }
  }

  shuffleInPlace(out);
  return out.slice(0, target);
}
