import {
  createBlackFramePixels,
  isInstagramFeedUrl,
  MAX_INSTAGRAM_FEED,
  mixInstagramFeedItems,
  normalizeInstagramFeedAppConfig,
  type InstagramAccountStatus,
  type InstagramFeedItem,
  type InstagramFeedSnapshot,
} from '@pixopen/core';
import { scrapeInstagramAccount } from './scrape.js';
import { fetchInstagramImagePixels } from './art.js';

/** Cursor into the curated feed for sequential playback. */
const feedCursorByProject = new Map<string, number>();
/** Last successful account poll time per project (runtime). */
const lastPollByProject = new Map<string, number>();

export type InstagramRefreshResult = {
  feed: InstagramFeedItem[];
  accounts: InstagramAccountStatus[];
  error?: string;
};

function activeFeed(
  config: ReturnType<typeof normalizeInstagramFeedAppConfig>,
): InstagramFeedItem[] {
  const blocked = new Set(config.blockedIds);
  return config.feed.filter((item) => !blocked.has(item.id) && isInstagramFeedUrl(item.url));
}

function selectFromFeed(
  projectId: string,
  feed: InstagramFeedItem[],
): InstagramFeedItem | null {
  if (feed.length === 0) return null;
  const cursor = feedCursorByProject.get(projectId) ?? 0;
  const index = ((cursor % feed.length) + feed.length) % feed.length;
  feedCursorByProject.set(projectId, cursor + 1);
  return feed[index] ?? null;
}

/** Scrape configured accounts and build a mixed, capped feed. */
export async function refreshInstagramFeed(
  appConfig: Record<string, unknown> | undefined,
): Promise<InstagramRefreshResult> {
  const config = normalizeInstagramFeedAppConfig(appConfig);

  if (config.accounts.length === 0) {
    return {
      feed: [],
      accounts: [],
      error: 'Add at least one Instagram username',
    };
  }

  const accounts: InstagramAccountStatus[] = [];
  const collected: InstagramFeedItem[] = [];
  const blocked = new Set(config.blockedIds);

  for (const username of config.accounts) {
    const result = await scrapeInstagramAccount(username);
    accounts.push(result.status);
    for (const item of result.items) {
      if (blocked.has(item.id)) continue;
      collected.push(item);
    }
    // Small delay between accounts to reduce rate-limit risk.
    await new Promise((r) => setTimeout(r, 400));
  }

  const seen = new Set<string>();
  const unique = collected.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  // Square-first within each account, then round-robin across accounts for variety.
  const deduped = mixInstagramFeedItems(unique).slice(0, MAX_INSTAGRAM_FEED);

  if (deduped.length === 0) {
    const detail = accounts
      .filter((a) => a.error)
      .map((a) => `@${a.username}: ${a.error}`)
      .join('; ');
    return {
      feed: [],
      accounts,
      error: detail || 'No static images found for these accounts',
    };
  }

  return { feed: deduped, accounts };
}

export function markInstagramFeedPolled(projectId: string, at = Date.now()) {
  lastPollByProject.set(projectId, at);
}

export function shouldPollInstagramFeed(
  projectId: string,
  feedPollMinutes: number,
  feedEmpty = false,
): boolean {
  const last = lastPollByProject.get(projectId);
  if (last == null) {
    // Don't re-scrape on every Run when a feed already exists.
    if (!feedEmpty) {
      lastPollByProject.set(projectId, Date.now());
      return false;
    }
    return true;
  }
  return Date.now() - last >= feedPollMinutes * 60_000;
}

export async function fetchInstagramFeedSnapshot(
  projectId: string,
  appConfig: Record<string, unknown> | undefined,
): Promise<InstagramFeedSnapshot> {
  const config = normalizeInstagramFeedAppConfig(appConfig);
  const fetchedAt = new Date().toISOString();
  const feed = activeFeed(config);

  try {
    if (feed.length === 0) {
      return {
        pixels: createBlackFramePixels(),
        feedSize: 0,
        fetchedAt,
        error:
          config.accounts.length === 0
            ? 'Add an Instagram username'
            : 'Feed is empty — refresh to pull recent photos',
      };
    }

    const item = selectFromFeed(projectId, feed);
    if (!item) {
      return {
        pixels: createBlackFramePixels(),
        feedSize: feed.length,
        fetchedAt,
        error: 'Feed is empty',
      };
    }

    const pixels = await fetchInstagramImagePixels(item.url);
    return {
      imageId: item.id,
      url: item.url,
      username: item.username,
      pixels,
      feedSize: feed.length,
      fetchedAt,
    };
  } catch (err) {
    return {
      pixels: createBlackFramePixels(),
      feedSize: feed.length,
      fetchedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
