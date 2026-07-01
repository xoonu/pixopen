import { useState } from 'react';
import { normalizeDvdScreensaverAppConfig, type Project } from '@pixopen/core';
import { DvdPreview } from './DvdPreview';

type Props = {
  project: Project;
};

/** Sidebar panel — live preview and corner-hit counter. */
export function DvdPanel({ project }: Props) {
  const config = normalizeDvdScreensaverAppConfig(project.appConfig);
  const [cornerHits, setCornerHits] = useState(0);

  return (
    <section className="dvd-screensaver-sidebar-panel" aria-label="DVD screensaver">
      <h3 className="dvd-screensaver-section-title">DVD Screensaver</h3>
      <div className="dvd-screensaver-sidebar-preview">
        <DvdPreview
          key={config.seed}
          appConfig={project.appConfig}
          scale={3}
          playing
          onCornerHitsChange={setCornerHits}
        />
      </div>
      <p className="dvd-screensaver-corner-label m-0">
        Corner hits: <strong>{cornerHits}</strong>
      </p>
      <p className="muted text-xs m-0">
        Hit <strong>Run on Pixoo</strong> above to stream the bouncing logo to your device.
      </p>
    </section>
  );
}
