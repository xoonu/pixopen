import {
  AI_MUSE_ETHNICITY_OPTIONS,
  AI_MUSE_EYE_COLORS,
  AI_MUSE_HAIR_COLORS,
  AI_MUSE_HAIR_LENGTHS,
  AI_MUSE_SETTINGS,
  MAX_AI_MUSE_POOL,
  normalizeAiMuseAppConfig,
  type AiMuseConfig,
  type AiMuseSetting,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';
import { AiMuseFeed } from './AiMuseFeed';
import { AiMuseGenerate } from './AiMuseGenerate';
import { AiMusePreview } from './AiMusePreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

const PREVIEW_SCALE = 8;

function labelize(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AiMuseStudio({ project, onChange }: Props) {
  const config = normalizeAiMuseAppConfig(project.appConfig);

  const applyConfig = (next: AiMuseConfig) => {
    onChange({ ...next });
  };

  const toggleSetting = (setting: AiMuseSetting) => {
    const has = config.settings.includes(setting);
    applyConfig({
      ...config,
      settings: has ? config.settings.filter((s) => s !== setting) : [...config.settings, setting],
    });
  };

  const toggleEthnicity = (value: (typeof AI_MUSE_ETHNICITY_OPTIONS)[number]) => {
    const has = config.ethnicities.includes(value);
    applyConfig({
      ...config,
      ethnicities: has
        ? config.ethnicities.filter((e) => e !== value)
        : [...config.ethnicities, value],
    });
  };

  return (
    <div className="ai-muse-studio">
      <section className="ai-muse-preview-panel" aria-label="AI Muse preview">
        <span className="field-label">Preview</span>
        <div className="ai-muse-preview-stage">
          <AiMusePreview
            projectId={project.id}
            appConfig={project.appConfig}
            scale={PREVIEW_SCALE}
            playing
          />
        </div>
      </section>

      <AiMuseGenerate appConfig={project.appConfig} onChange={applyConfig} />

      <AiMuseFeed appConfig={project.appConfig} onChange={applyConfig} />

      <section className="ai-muse-controls-panel" aria-label="Look preferences">
        <h3 className="ai-muse-section-title">Sources</h3>
        <div className="ai-muse-settings-grid">
          <label className={`ai-muse-setting-chip${config.sources.civitai ? ' is-selected' : ''}`}>
            <input
              type="checkbox"
              checked={config.sources.civitai}
              onChange={() =>
                applyConfig({
                  ...config,
                  sources: { ...config.sources, civitai: !config.sources.civitai },
                })
              }
            />
            Civitai (live)
          </label>
          <label className={`ai-muse-setting-chip${config.sources.library ? ' is-selected' : ''}`}>
            <input
              type="checkbox"
              checked={config.sources.library}
              onChange={() =>
                applyConfig({
                  ...config,
                  sources: { ...config.sources, library: !config.sources.library },
                })
              }
            />
            Local library
          </label>
        </div>
        <p className="muted text-xs m-0">
          Civitai only accepts prompts that clearly describe a photoreal woman (no men, landscapes, or anime).
          Optional: drop your own files in <code>packages/server/data/ai-muse/library</code> or paste URLs.
        </p>

        <h3 className="ai-muse-section-title">Look preferences</h3>
        <p className="muted text-sm m-0">
          Preferences guide Find more / Refresh feed. Anime and cartoons are always filtered out.
          Leave ethnicity unchecked for the widest pool.
        </p>

        <div className="ai-muse-controls-grid">
          <Field label="Age min" htmlFor="ai-muse-age-min">
            <NumberSlider
              id="ai-muse-age-min"
              min={18}
              max={65}
              value={config.ageMin}
              onChange={(ageMin) => applyConfig({ ...config, ageMin })}
            />
          </Field>
          <Field label="Age max" htmlFor="ai-muse-age-max">
            <NumberSlider
              id="ai-muse-age-max"
              min={18}
              max={65}
              value={config.ageMax}
              onChange={(ageMax) => applyConfig({ ...config, ageMax })}
            />
          </Field>

          <Field label="Eye color" htmlFor="ai-muse-eye-color">
            <select
              id="ai-muse-eye-color"
              className="select w-full"
              value={config.eyeColor}
              onChange={(e) => applyConfig({ ...config, eyeColor: e.target.value as AiMuseConfig['eyeColor'] })}
            >
              {AI_MUSE_EYE_COLORS.map((value) => (
                <option key={value} value={value}>{labelize(value)}</option>
              ))}
            </select>
          </Field>

          <Field label="Hair color" htmlFor="ai-muse-hair-color">
            <select
              id="ai-muse-hair-color"
              className="select w-full"
              value={config.hairColor}
              onChange={(e) => applyConfig({ ...config, hairColor: e.target.value as AiMuseConfig['hairColor'] })}
            >
              {AI_MUSE_HAIR_COLORS.map((value) => (
                <option key={value} value={value}>{labelize(value)}</option>
              ))}
            </select>
          </Field>

          <Field label="Hair length" htmlFor="ai-muse-hair-length">
            <select
              id="ai-muse-hair-length"
              className="select w-full"
              value={config.hairLength}
              onChange={(e) => applyConfig({ ...config, hairLength: e.target.value as AiMuseConfig['hairLength'] })}
            >
              {AI_MUSE_HAIR_LENGTHS.map((value) => (
                <option key={value} value={value}>{labelize(value)}</option>
              ))}
            </select>
          </Field>

          <Field label="Refresh (seconds)" htmlFor="ai-muse-refresh">
            <NumberSlider
              id="ai-muse-refresh"
              min={5}
              max={120}
              value={config.refreshSeconds}
              formatValue={(v) => `${v}s`}
              onChange={(refreshSeconds) => applyConfig({ ...config, refreshSeconds })}
            />
          </Field>

          <Field label="Pool size" htmlFor="ai-muse-pool-size">
            <NumberSlider
              id="ai-muse-pool-size"
              min={6}
              max={MAX_AI_MUSE_POOL}
              value={config.poolSize}
              onChange={(poolSize) => applyConfig({ ...config, poolSize })}
            />
          </Field>
        </div>
        <p className="muted text-xs m-0">
          Pool size is how many candidates to pull when filling the feed. Larger = more choices per fetch, slower.
        </p>

        <div className="ai-muse-settings-block">
          <span className="field-label">Ethnicity (optional)</span>
          <div className="ai-muse-settings-grid">
            {AI_MUSE_ETHNICITY_OPTIONS.map((value) => {
              const checked = config.ethnicities.includes(value);
              return (
                <label key={value} className={`ai-muse-setting-chip${checked ? ' is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEthnicity(value)}
                  />
                  {labelize(value)}
                </label>
              );
            })}
          </div>
          <p className="muted text-xs m-0">Leave all unchecked to allow any ethnicity.</p>
        </div>

        <div className="ai-muse-settings-block">
          <span className="field-label">Settings (optional)</span>
          <div className="ai-muse-settings-grid">
            {AI_MUSE_SETTINGS.map((setting) => {
              const checked = config.settings.includes(setting);
              return (
                <label key={setting} className={`ai-muse-setting-chip${checked ? ' is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSetting(setting)}
                  />
                  {labelize(setting)}
                </label>
              );
            })}
          </div>
          <p className="muted text-xs m-0">Leave all unchecked to allow any scene.</p>
        </div>
      </section>
    </div>
  );
}
