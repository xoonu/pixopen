import type { SpotifyNowPlayingSnapshot, SpotifyPlaybackSource } from '@pixopen/core';
import { createSpotifyLogoPixels } from '@pixopen/renderer';
import { getSpotifyAccessToken, spotifyAuthStatus } from './auth.js';
import { fetchAlbumArtPixels } from './art.js';

type SpotifyImage = { url?: string; height?: number; width?: number };

type SpotifyTrack = {
  name?: string;
  artists?: Array<{ name?: string }>;
  album?: {
    name?: string;
    images?: SpotifyImage[];
  };
};

type CurrentlyPlayingResponse = {
  is_playing?: boolean;
  item?: SpotifyTrack | null;
  currently_playing_type?: string;
};

type RecentlyPlayedResponse = {
  items?: Array<{ track?: SpotifyTrack | null }>;
};

function pickLargestImageUrl(images: SpotifyImage[] | undefined): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const url = sorted[0]?.url?.trim();
  return url || null;
}

function trackMeta(track: SpotifyTrack | null | undefined): {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  imageUrl: string | null;
} {
  if (!track) return { imageUrl: null };
  return {
    trackName: track.name?.trim() || undefined,
    artistName: track.artists?.map((a) => a.name?.trim()).filter(Boolean).join(', ') || undefined,
    albumName: track.album?.name?.trim() || undefined,
    imageUrl: pickLargestImageUrl(track.album?.images),
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

async function snapshotFromTrack(
  track: SpotifyTrack,
  source: Extract<SpotifyPlaybackSource, 'playing' | 'recent'>,
): Promise<SpotifyNowPlayingSnapshot> {
  const meta = trackMeta(track);
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
    const current = await spotifyGet<CurrentlyPlayingResponse>('/me/player/currently-playing', accessToken);
    const item = current.json?.item;
    if (current.status !== 204 && item && current.json?.currently_playing_type !== 'episode') {
      // Prefer album art whenever Spotify reports a track item (playing or paused).
      if (item.album?.images?.length || item.name) {
        return await snapshotFromTrack(item, 'playing');
      }
    }

    const recent = await spotifyGet<RecentlyPlayedResponse>('/me/player/recently-played?limit=1', accessToken);
    const recentTrack = recent.json?.items?.[0]?.track;
    if (recentTrack) {
      return await snapshotFromTrack(recentTrack, 'recent');
    }

    return logoSnapshot();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return logoSnapshot(message);
  }
}

export { spotifyAuthStatus } from './auth.js';
