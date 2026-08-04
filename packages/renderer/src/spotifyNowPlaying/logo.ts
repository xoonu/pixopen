import { SPOTIFY_LOGO_PIXELS } from './logoPixels.js';

let cachedLogoPixels: number[] | null = null;

/**
 * Full-bleed 64×64 Spotify mark rasterized from
 * `assets/spotify-logo.svg` (circular green logo with three arcs).
 */
export function createSpotifyLogoPixels(): number[] {
  if (cachedLogoPixels) return [...cachedLogoPixels];
  cachedLogoPixels = [...SPOTIFY_LOGO_PIXELS];
  return [...cachedLogoPixels];
}
