import type { AiMuseCatalogEntry, AiMuseConfig } from '@pixopen/core';

export type RankedMatch = {
  entry: AiMuseCatalogEntry;
  score: number;
};

function ageOverlaps(config: AiMuseConfig, entry: AiMuseCatalogEntry): boolean {
  // Full adult range = no age preference applied.
  if (config.ageMin <= 18 && config.ageMax >= 65) return true;
  if (entry.ageMin == null && entry.ageMax == null) return true;
  const entryMin = entry.ageMin ?? entry.ageMax ?? 18;
  const entryMax = entry.ageMax ?? entry.ageMin ?? 65;
  return entryMax >= config.ageMin && entryMin <= config.ageMax;
}

function scoreEntry(config: AiMuseConfig, entry: AiMuseCatalogEntry): number | null {
  const ratio = entry.width / entry.height;
  // Align with ingest: portrait / near-square only (rejects wide scenery).
  if (!(ratio >= 0.55 && ratio <= 1.15) || entry.nsfwLevel !== 'None') return null;
  if (!ageOverlaps(config, entry)) return null;
  // Library files are user-owned; Civitai entries must carry the realism tag from ingest.
  if (!entry.tags.includes('library') && !entry.tags.includes('realism-cue')) return null;

  let score = 1;

  if (config.ethnicities.length > 0) {
    if (entry.ethnicity && config.ethnicities.includes(entry.ethnicity)) score += 4;
    else if (entry.ethnicity) return null;
    else score -= 1;
  }

  if (config.eyeColor !== 'any') {
    if (entry.eyeColor === config.eyeColor) score += 3;
    else if (entry.eyeColor) return null;
    else score -= 1;
  }

  if (config.hairColor !== 'any') {
    if (entry.hairColor === config.hairColor) score += 3;
    else if (entry.hairColor) return null;
    else score -= 1;
  }

  if (config.hairLength !== 'any') {
    if (entry.hairLength === config.hairLength) score += 2;
    else if (entry.hairLength) return null;
    else score -= 1;
  }

  if (config.settings.length > 0) {
    const hit = config.settings.some((setting) => entry.settings.includes(setting));
    if (hit) score += 3;
    else score -= 1;
  }

  if (entry.ageMin != null || entry.ageMax != null) score += 1;
  if (entry.width === entry.height) score += 2;
  if ([512, 768, 1024].includes(entry.width)) score += 1;
  if (entry.tags.includes('realism-cue')) score += 2;

  return score;
}

export function rankMatches(config: AiMuseConfig, entries: AiMuseCatalogEntry[]): RankedMatch[] {
  const ranked: RankedMatch[] = [];
  for (const entry of entries) {
    const score = scoreEntry(config, entry);
    if (score == null) continue;
    ranked.push({ entry, score });
  }
  ranked.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return ranked;
}

export function selectNextMatch(
  config: AiMuseConfig,
  entries: AiMuseCatalogEntry[],
  recentIds: string[],
): { match: RankedMatch | null; matchCount: number } {
  return selectRandomMatch(config, entries, recentIds);
}

/** Prefer unseen matches; pick randomly among the best-scoring fresh candidates. */
export function selectRandomMatch(
  config: AiMuseConfig,
  entries: AiMuseCatalogEntry[],
  recentIds: string[],
): { match: RankedMatch | null; matchCount: number } {
  const ranked = rankMatches(config, entries);
  if (ranked.length === 0) return { match: null, matchCount: 0 };

  const recent = new Set(recentIds);
  const fresh = ranked.filter((row) => !recent.has(row.entry.id));
  const pool = fresh.length > 0 ? fresh : ranked;
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? null;
  return { match: pick, matchCount: ranked.length };
}
