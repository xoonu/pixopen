import {
  catalogEntryToFeedItem,
  createBlackFramePixels,
  isAiMuseFeedUrl,
  MAX_AI_MUSE_FEED,
  normalizeAiMuseAppConfig,
  type AiMuseFeedItem,
  type AiMuseSnapshot,
} from '@pixopen/core';
import { fetchLiveCandidates } from './live.js';
import { rankMatches, selectRandomMatch } from './match.js';
import { fetchAiMuseImagePixels } from './art.js';

/** In-memory only — avoids immediate repeats within a session when feed is empty. */
const recentByProject = new Map<string, string[]>();
/** Cursor into the curated feed for sequential playback. */
const feedCursorByProject = new Map<string, number>();
const MAX_RECENT = 40;

export type AiMuseCandidatesResult = {
  items: AiMuseFeedItem[];
  candidateCount: number;
  matchCount: number;
  error?: string;
};

function pushRecent(projectId: string, imageId: string) {
  const prev = recentByProject.get(projectId) ?? [];
  const next = [...prev.filter((id) => id !== imageId), imageId].slice(-MAX_RECENT);
  recentByProject.set(projectId, next);
}

function activeFeed(config: ReturnType<typeof normalizeAiMuseAppConfig>): AiMuseFeedItem[] {
  const blocked = new Set(config.blockedIds);
  return config.feed.filter((item) => !blocked.has(item.id) && isAiMuseFeedUrl(item.url));
}

function selectFromFeed(
  projectId: string,
  feed: AiMuseFeedItem[],
): AiMuseFeedItem | null {
  if (feed.length === 0) return null;
  const cursor = feedCursorByProject.get(projectId) ?? 0;
  const index = ((cursor % feed.length) + feed.length) % feed.length;
  feedCursorByProject.set(projectId, cursor + 1);
  return feed[index] ?? null;
}

/** Pull preference-matched candidates for filling / growing the curated feed. */
export async function fetchAiMuseCandidates(
  appConfig: Record<string, unknown> | undefined,
  excludeIds: string[] = [],
): Promise<AiMuseCandidatesResult> {
  const config = normalizeAiMuseAppConfig(appConfig);
  const exclude = new Set([...config.blockedIds, ...excludeIds, ...config.feed.map((i) => i.id)]);

  try {
    const candidates = await fetchLiveCandidates(config.poolSize, config.sources);
    const ranked = rankMatches(config, candidates).filter((row) => !exclude.has(row.entry.id));
    const room = Math.max(0, MAX_AI_MUSE_FEED - config.feed.length);

    if (room === 0) {
      return {
        items: [],
        candidateCount: candidates.length,
        matchCount: ranked.length,
        error: `Feed is full (max ${MAX_AI_MUSE_FEED}). Remove some images first.`,
      };
    }

    const items = ranked.slice(0, room).map((row) => catalogEntryToFeedItem(row.entry));

    if (items.length === 0) {
      return {
        items: [],
        candidateCount: candidates.length,
        matchCount: ranked.length,
        error:
          candidates.length === 0
            ? 'No photoreal SFW candidates available right now'
            : ranked.length === 0
              ? `Pulled ${candidates.length}, but none matched these preferences`
              : 'No new images to add — try adjusting preferences',
      };
    }

    return {
      items,
      candidateCount: candidates.length,
      matchCount: ranked.length,
    };
  } catch (err) {
    return {
      items: [],
      candidateCount: 0,
      matchCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchAiMuseSnapshot(
  projectId: string,
  appConfig: Record<string, unknown> | undefined,
): Promise<AiMuseSnapshot> {
  const config = normalizeAiMuseAppConfig(appConfig);
  const fetchedAt = new Date().toISOString();
  const feed = activeFeed(config);

  try {
    // Curated playlist takes priority when the user has kept any images.
    if (feed.length > 0) {
      const item = selectFromFeed(projectId, feed);
      if (!item) {
        return {
          pixels: createBlackFramePixels(),
          poolSize: config.poolSize,
          candidateCount: config.feed.length,
          matchCount: 0,
          fetchedAt,
          error: 'Feed is empty',
        };
      }
      const pixels = await fetchAiMuseImagePixels(item.url);
      pushRecent(projectId, item.id);
      return {
        imageId: item.id,
        url: item.url,
        pixels,
        poolSize: config.poolSize,
        candidateCount: config.feed.length,
        matchCount: feed.length,
        fetchedAt,
      };
    }

    // Empty feed — live random pick (same as before), excluding blocked ids.
    const candidates = await fetchLiveCandidates(config.poolSize, config.sources);
    const unblocked = candidates.filter((entry) => !config.blockedIds.includes(entry.id));
    const selection = selectRandomMatch(
      config,
      unblocked,
      recentByProject.get(projectId) ?? [],
    );

    if (!selection.match) {
      return {
        pixels: createBlackFramePixels(),
        poolSize: config.poolSize,
        candidateCount: candidates.length,
        matchCount: 0,
        fetchedAt,
        error:
          candidates.length === 0
            ? 'No photoreal SFW candidates available right now'
            : `Pulled ${candidates.length} of ${config.poolSize}, but none matched these preferences`,
      };
    }

    const entry = selection.match.entry;
    const pixels = await fetchAiMuseImagePixels(entry.url);
    pushRecent(projectId, entry.id);
    return {
      imageId: entry.id,
      url: entry.url,
      pixels,
      poolSize: config.poolSize,
      candidateCount: candidates.length,
      matchCount: selection.matchCount,
      fetchedAt,
    };
  } catch (err) {
    return {
      pixels: createBlackFramePixels(),
      poolSize: config.poolSize,
      candidateCount: 0,
      matchCount: 0,
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
