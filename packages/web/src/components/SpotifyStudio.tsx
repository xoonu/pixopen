import { useState } from 'react';
import type { Project } from '@pixopen/core';
import { SpotifyCredentialsForm } from './SpotifyCredentialsForm';
import { SpotifyPreview } from './SpotifyPreview';

type Props = {
  project: Project;
};

const PREVIEW_SCALE = 8;

export function SpotifyStudio({ project }: Props) {
  const [previewKey, setPreviewKey] = useState(0);

  return (
    <div className="spotify-now-playing-studio">
      <section className="spotify-now-playing-preview-panel" aria-label="Spotify preview">
        <span className="field-label">Preview</span>
        <div className="spotify-now-playing-preview-stage">
          <SpotifyPreview key={previewKey} appConfig={project.appConfig} scale={PREVIEW_SCALE} playing />
        </div>
      </section>

      <section className="spotify-now-playing-help-panel" aria-label="Spotify credentials">
        <SpotifyCredentialsForm onConnected={() => setPreviewKey((k) => k + 1)} />
      </section>
    </div>
  );
}
