import {
  normalizeOnAirAppConfig,
  ON_AIR_MESSAGE_LABELS,
  ON_AIR_MESSAGES,
  type OnAirConfig,
  type OnAirMessage,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { OnAirPreview } from './OnAirPreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

const PREVIEW_SCALE = 8;

export function OnAirStudio({ project, onChange }: Props) {
  const config = normalizeOnAirAppConfig(project.appConfig);

  const applyConfig = (next: OnAirConfig) => {
    onChange({ ...next });
  };

  return (
    <div className="on-air-studio">
      <section className="on-air-preview-panel" aria-label="On Air preview">
        <span className="field-label">Preview</span>
        <div className="on-air-preview-stage">
          <OnAirPreview
            key={`${config.message}|${config.pulse ? 1 : 0}`}
            appConfig={project.appConfig}
            scale={PREVIEW_SCALE}
            playing
          />
        </div>
      </section>

      <section className="on-air-controls-panel">
        <h3 className="on-air-section-title">Message</h3>
        <div className="on-air-preset-chips" role="group" aria-label="Status message">
          {ON_AIR_MESSAGES.map((message) => {
            const selected = config.message === message;
            return (
              <button
                key={message}
                type="button"
                className={`on-air-preset-chip${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => applyConfig({ ...config, message: message as OnAirMessage })}
              >
                {ON_AIR_MESSAGE_LABELS[message]}
              </button>
            );
          })}
        </div>

        <Field label="Glow pulse" htmlFor="on-air-pulse">
          <label className="on-air-pulse-toggle" htmlFor="on-air-pulse">
            <input
              id="on-air-pulse"
              type="checkbox"
              checked={config.pulse}
              onChange={(e) => applyConfig({ ...config, pulse: e.target.checked })}
            />
            <span>Subtle brightness pulse on the red glow</span>
          </label>
          <p className="muted text-xs m-0 mt-1">
            Lettering stays solid either way — only the surround glow breathes.
          </p>
        </Field>
      </section>
    </div>
  );
}
