import { useState } from 'react';
import {
  normalizeDvdScreensaverAppConfig,
  type DvdCornerSensitivity,
  type DvdScreensaverConfig,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { DvdPreview } from './DvdPreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

const PREVIEW_SCALE = 8;

export function DvdStudio({ project, onChange }: Props) {
  const config = normalizeDvdScreensaverAppConfig(project.appConfig);
  const [cornerHits, setCornerHits] = useState(0);

  const applyConfig = (next: DvdScreensaverConfig) => {
    onChange({ ...next });
  };

  const resetCornerHits = () => {
    setCornerHits(0);
    applyConfig({ ...config, seed: config.seed + 1 });
  };

  return (
    <div className="dvd-screensaver-studio">
      <section className="dvd-screensaver-preview-panel" aria-label="DVD screensaver preview">
        <span className="field-label">Preview</span>
        <div className="dvd-screensaver-preview-stage">
          <DvdPreview
            appConfig={project.appConfig}
            scale={PREVIEW_SCALE}
            playing
            onCornerHitsChange={setCornerHits}
          />
        </div>
      </section>

      <section className="dvd-screensaver-controls-panel">
        <h3 className="dvd-screensaver-section-title">Settings</h3>
        <div className="dvd-screensaver-controls-grid">
          <Field label={`Movement speed (${config.speedPxPerSec} px/s)`} htmlFor="dvd-speed">
            <input
              id="dvd-speed"
              type="range"
              min={8}
              max={40}
              step={1}
              value={config.speedPxPerSec}
              onChange={(e) =>
                applyConfig({ ...config, speedPxPerSec: Number(e.target.value) })
              }
            />
            <p className="muted text-xs m-0 mt-1">
              Base travel speed. Pair with Smoothness for how it feels on the Pixoo.
            </p>
          </Field>
          <Field label={`Smoothness (${config.smoothness}/10)`} htmlFor="dvd-smoothness">
            <input
              id="dvd-smoothness"
              type="range"
              min={1}
              max={10}
              step={1}
              value={config.smoothness}
              onChange={(e) =>
                applyConfig({ ...config, smoothness: Number(e.target.value) })
              }
            />
            <p className="muted text-xs m-0 mt-1">
              Slows the logo and adds a motion trail tuned for Pixoo&apos;s ~2 fps updates.
              Higher = smaller jumps, softer movement.
            </p>
          </Field>
          <Field label="Logo size" htmlFor="dvd-logo-scale">
            <select
              id="dvd-logo-scale"
              className="select w-full"
              value={config.logoScale}
              onChange={(e) =>
                applyConfig({
                  ...config,
                  logoScale: Number(e.target.value) === 2 ? 2 : 1,
                })
              }
            >
              <option value={1}>1× (small)</option>
              <option value={2}>2× (large)</option>
            </select>
          </Field>
          <Field label="Corner sensitivity" htmlFor="dvd-corner-sensitivity">
            <select
              id="dvd-corner-sensitivity"
              className="select w-full"
              value={config.cornerSensitivity}
              onChange={(e) =>
                applyConfig({
                  ...config,
                  cornerSensitivity: Number(e.target.value) as DvdCornerSensitivity,
                })
              }
            >
              <option value={10}>Easy (10 px)</option>
              <option value={4}>Normal (4 px)</option>
              <option value={1}>Impossible (1 px)</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="dvd-screensaver-stats-panel" aria-label="Corner hits">
        <div className="dvd-screensaver-corner-row">
          <span className="dvd-screensaver-corner-label">
            Corner hits: <strong>{cornerHits}</strong>
          </span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={resetCornerHits}>
            Reset
          </button>
        </div>
        <p className="muted text-xs m-0">
          Will it hit the corner? The whole office is watching.
        </p>
      </section>
    </div>
  );
}
