import {
  normalizeInstagramUsername,
  type InstagramAccountStatus,
  type InstagramFeedItem,
} from '@pixopen/core';
import { cacheRemoteImage } from './media.js';

/** Well-known Instagram web client app id used by the public profile endpoint. */
const IG_APP_ID = '936619743392459';

type IgMediaNode = {
  id?: string;
  shortcode?: string;
  is_video?: boolean;
  display_url?: string;
  thumbnail_src?: string;
  taken_at_timestamp?: number;
  dimensions?: { height?: number; width?: number };
  edge_sidecar_to_children?: {
    edges?: Array<{ node?: IgMediaNode }>;
  };
};

type IgProfileResponse = {
  data?: {
    user?: {
      username?: string;
      is_private?: boolean;
      edge_owner_to_timeline_media?: {
        edges?: Array<{ node?: IgMediaNode }>;
      };
    };
  };
};

export type ScrapedAccountResult = {
  status: InstagramAccountStatus;
  items: InstagramFeedItem[];
};

function pickImageUrl(node: IgMediaNode): string | null {
  const url = node.display_url || node.thumbnail_src;
  return typeof url === 'string' && url.startsWith('http') ? url : null;
}

/** Prefer a static image from a carousel; skip pure-video posts. */
function resolveStaticImage(node: IgMediaNode): {
  id: string;
  url: string;
  width: number;
  height: number;
  takenAt?: string;
} | null {
  const shortcode = typeof node.shortcode === 'string' ? node.shortcode : '';
  const id = shortcode || (typeof node.id === 'string' ? node.id : '');
  if (!id) return null;

  const takenAt =
    typeof node.taken_at_timestamp === 'number' && Number.isFinite(node.taken_at_timestamp)
      ? new Date(node.taken_at_timestamp * 1000).toISOString()
      : undefined;

  const sidecar = node.edge_sidecar_to_children?.edges;
  if (Array.isArray(sidecar) && sidecar.length > 0) {
    for (const edge of sidecar) {
      const child = edge?.node;
      if (!child || child.is_video) continue;
      const url = pickImageUrl(child);
      if (!url) continue;
      return {
        id: `${id}:${child.shortcode || child.id || '0'}`,
        url,
        width: Number(child.dimensions?.width) || Number(node.dimensions?.width) || 1080,
        height: Number(child.dimensions?.height) || Number(node.dimensions?.height) || 1080,
        ...(takenAt ? { takenAt } : {}),
      };
    }
    return null;
  }

  if (node.is_video) return null;
  const url = pickImageUrl(node);
  if (!url) return null;
  return {
    id,
    url,
    width: Number(node.dimensions?.width) || 1080,
    height: Number(node.dimensions?.height) || 1080,
    ...(takenAt ? { takenAt } : {}),
  };
}

async function fetchProfileJson(username: string): Promise<IgProfileResponse> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-IG-App-ID': IG_APP_ID,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://www.instagram.com/${username}/`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });

  if (res.status === 404) {
    throw new Error('not found');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('blocked');
  }
  if (res.status === 429) {
    throw new Error('rate limited');
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return (await res.json()) as IgProfileResponse;
}

/** Fetch recent static images for one public Instagram username. */
export async function scrapeInstagramAccount(rawUsername: string): Promise<ScrapedAccountResult> {
  const username = normalizeInstagramUsername(rawUsername);
  if (!username) {
    return {
      status: { username: rawUsername.trim(), ok: false, imageCount: 0, error: 'invalid username' },
      items: [],
    };
  }

  try {
    const json = await fetchProfileJson(username);
    const user = json.data?.user;
    if (!user) {
      return {
        status: { username, ok: false, imageCount: 0, error: 'not found' },
        items: [],
      };
    }
    if (user.is_private) {
      return {
        status: { username, ok: false, imageCount: 0, error: 'private' },
        items: [],
      };
    }

    const edges = user.edge_owner_to_timeline_media?.edges ?? [];
    const items: InstagramFeedItem[] = [];

    for (const edge of edges) {
      const resolved = edge?.node ? resolveStaticImage(edge.node) : null;
      if (!resolved) continue;
      try {
        const cached = await cacheRemoteImage(`${username}_${resolved.id}`, resolved.url);
        items.push({
          id: `${username}:${resolved.id}`,
          username,
          url: cached.url,
          width: resolved.width,
          height: resolved.height,
          ...(resolved.takenAt ? { takenAt: resolved.takenAt } : {}),
        });
      } catch {
        // Skip images that fail to download; keep scraping the rest.
      }
    }

    if (items.length === 0) {
      return {
        status: { username, ok: false, imageCount: 0, error: 'no images' },
        items: [],
      };
    }

    return {
      status: { username, ok: true, imageCount: items.length },
      items,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: { username, ok: false, imageCount: 0, error: message },
      items: [],
    };
  }
}
