import { useState } from 'react';
import type { Project } from '@pixopen/core';
import { SpotifyCredentialsForm } from './SpotifyCredentialsForm';
import { SpotifyPreview } from './SpotifyPreview';

type Props = {
  project: Project;
};

/** Compact status + preview for the Spotify project left sidebar. */
export function SpotifyPanel({ project }: Props) {
  const [previewKey, setPreviewKey] = useState(0);

  return (
    <section className="spotify-now-playing-sidebar-panel" aria-label="Spotify">
      <div className="spotify-now-playing-sidebar-preview">
        <span className="field-label">Preview</span>
        <SpotifyPreview key={previewKey} appConfig={project.appConfig} scale={3} playing />
      </div>
      <SpotifyCredentialsForm compact onConnected={() => setPreviewKey((k) => k + 1)} />
    </section>
  );
}
