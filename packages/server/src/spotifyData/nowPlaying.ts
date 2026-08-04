import type { SpotifyNowPlayingSnapshot, SpotifyPlaybackSource } from '@pixopen/core';
import { createSpotifyLogoPixels } from '@pixopen/renderer';
import { getSpotifyAccessToken, spotifyAuthStatus } from './auth.js';
import { fetchAlbumArtPixels } from './art.js';

type SpotifyImage = { url?: string; height?: number; width?: number };

type SpotifyTrack = {
  type?: string;
  name?: string;
  artists?: Array<{ name?: string }>;
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
};

type SpotifyEpisode = {
  type?: string;
  name?: string;
  images?: SpotifyImage[];
  show?: {
    name?: string;
    publisher?: string;
    images?: SpotifyImage[];
  };
};

type CurrentlyPlayingResponse = {
  is_playing?: boolean;
  item?: (SpotifyTrack | SpotifyEpisode) | null;
  currently_playing_type?: string;
};

type RecentlyPlayedResponse = {
  items?: Array<{ track?: SpotifyTrack | null }>;
};

/** Prefer ~64px art for the Pixoo — Spotify usually ships 640 / 300 / 64. */
function pickDisplayImageUrl(images: SpotifyImage[] | undefined): string | null {
  if (!images?.length) return null;
  const scored = images
    .filter((img) => img.url?.trim())
    .map((img) => {
      const size = Math.max(img.width ?? 0, img.height ?? 0);
      return { url: img.url!.trim(), size };
    });
  if (!scored.length) return null;

  // Exact 64 if present, else smallest image that is still >= 64, else largest available.
  const exact = scored.find((img) => img.size === 64);
  if (exact) return exact.url;
  const bigEnough = scored
    .filter((img) => img.size >= 64)
    .sort((a, b) => a.size - b.size);
  if (bigEnough[0]) return bigEnough[0].url;
  return scored.sort((a, b) => b.size - a.size)[0]!.url;
}

function isEpisode(item: SpotifyTrack | SpotifyEpisode): item is SpotifyEpisode {
  return item.type === 'episode' || (!('album' in item) && 'show' in item);
}

function itemMeta(item: SpotifyTrack | SpotifyEpisode | null | undefined): {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  imageUrl: string | null;
} {
  if (!item) return { imageUrl: null };

  if (isEpisode(item)) {
    return {
      trackName: item.name?.trim() || undefined,
      artistName: item.show?.publisher?.trim() || item.show?.name?.trim() || undefined,
      albumName: item.show?.name?.trim() || undefined,
      // Episode-specific art first; fall back to show cover.
      imageUrl: pickDisplayImageUrl(item.images) || pickDisplayImageUrl(item.show?.images),
    };
  }

  return {
    trackName: item.name?.trim() || undefined,
    artistName: item.artists?.map((a) => a.name?.trim()).filter(Boolean).join(', ') || undefined,
    albumName: item.album?.name?.trim() || undefined,
    imageUrl: pickDisplayImageUrl(item.album?.images),
  };
}

async function spotifyGet<T>(path: string, accessToken: string): Promise<{ status: number; json: T | null }> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(12_000),
  });
  if (res.status === 204) return { status: 204, json: null };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify API ${path} failed (${res.status})${text ? `: ${text.slice(0, 180)}` : ''}`);
  }
  return { status: res.status, json: (await res.json()) as T };
}

async function snapshotFromItem(
  item: SpotifyTrack | SpotifyEpisode,
  source: Extract<SpotifyPlaybackSource, 'playing' | 'recent'>,
): Promise<SpotifyNowPlayingSnapshot> {
  const meta = itemMeta(item);
  const fetchedAt = new Date().toISOString();
  if (!meta.imageUrl) {
    return {
      source: 'logo',
      ...meta,
      imageUrl: null,
      pixels: createSpotifyLogoPixels(),
      fetchedAt,
    };
  }
  const pixels = await fetchAlbumArtPixels(meta.imageUrl);
  return {
    source,
    trackName: meta.trackName,
    artistName: meta.artistName,
    albumName: meta.albumName,
    imageUrl: meta.imageUrl,
    pixels,
    fetchedAt,
  };
}

function logoSnapshot(error?: string): SpotifyNowPlayingSnapshot {
  return {
    source: error ? 'error' : 'logo',
    pixels: createSpotifyLogoPixels(),
    fetchedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}

export async function fetchSpotifyNowPlaying(): Promise<SpotifyNowPlayingSnapshot> {
  const status = await spotifyAuthStatus();
  if (!status.configured) {
    return logoSnapshot('Spotify not connected. Enter Client ID + secret, then Connect with Spotify.');
  }

  try {
    const accessToken = await getSpotifyAccessToken();
    // additional_types=episode is required for podcasts — otherwise Spotify omits them.
    const current = await spotifyGet<CurrentlyPlayingResponse>(
      '/me/player/currently-playing?additional_types=episode',
      accessToken,
    );
    const item = current.json?.item;
    if (current.status !== 204 && item) {
      return await snapshotFromItem(item, 'playing');
    }

    const recent = await spotifyGet<RecentlyPlayedResponse>('/me/player/recently-played?limit=1', accessToken);
    const recentTrack = recent.json?.items?.[0]?.track;
    if (recentTrack) {
      return await snapshotFromItem(recentTrack, 'recent');
    }

    return logoSnapshot();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return logoSnapshot(message);
  }
}

export { spotifyAuthStatus } from './auth.js';
