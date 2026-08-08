import type { Project } from '@pixopen/core';

/**
 * Live Frame templateIds that have a dedicated StudioPage early-return.
 * Keep this in sync when adding a new Live Frame — if an id is missing here,
 * Studio will show “rebuild UI” instead of the blank drawing editor.
 */
export const LIVE_FRAME_STUDIO_IDS = [
  'flip-note',
  'vesta-note',
  'stock-ticker',
  'weather-frame',
  'dvd-screensaver',
  'spotify-now-playing',
  'ai-muse',
  'instagram-feed',
  'on-air',
] as const;

export type LiveFrameStudioId = (typeof LIVE_FRAME_STUDIO_IDS)[number];

const LIVE_FRAME_STUDIO_ID_SET = new Set<string>(LIVE_FRAME_STUDIO_IDS);

/** True when this build has a dedicated studio branch for the project's template. */
export function hasLiveFrameStudioInThisBuild(project: Pick<Project, 'templateId'>): boolean {
  const id = project.templateId;
  return Boolean(id && LIVE_FRAME_STUDIO_ID_SET.has(id));
}

/**
 * Named Live Frames must never use the blank pixel / live-region editor.
 * Any live-sign with a templateId that isn't handled by a dedicated branch
 * (including brand-new types unknown to a stale web bundle) hits this.
 */
export function shouldBlockBlankLiveSignEditor(project: Pick<Project, 'type' | 'templateId'>): boolean {
  return project.type === 'live-sign' && Boolean(project.templateId);
}
