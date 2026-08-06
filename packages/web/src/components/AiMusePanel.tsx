import {
  AI_MUSE_ETHNICITY_OPTIONS,
  MAX_AI_MUSE_POOL,
  normalizeAiMuseAppConfig,
  type AiMuseConfig,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';
import { AiMusePreview } from './AiMusePreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

function labelize(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Compact controls + preview for the AI Muse project left sidebar. */
export function AiMusePanel({ project, onChange }: Props) {
  const config = normalizeAiMuseAppConfig(project.appConfig);

  const applyConfig = (next: AiMuseConfig) => {
    onChange({ ...next });
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
    <section className="ai-muse-sidebar-panel" aria-label="AI Muse">
      <div className="ai-muse-sidebar-preview">
        <span className="field-label">Preview</span>
        <AiMusePreview projectId={project.id} appConfig={project.appConfig} scale={3} playing />
      </div>
      <div className="ai-muse-settings-block">
        <span className="field-label">Ethnicity</span>
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
      </div>
      <Field label="Refresh (sec)" htmlFor="ai-muse-sidebar-refresh">
        <NumberSlider
          id="ai-muse-sidebar-refresh"
          min={5}
          max={120}
          value={config.refreshSeconds}
          formatValue={(v) => `${v}s`}
          onChange={(refreshSeconds) => applyConfig({ ...config, refreshSeconds })}
        />
      </Field>
      <Field label="Pool size" htmlFor="ai-muse-sidebar-pool">
        <NumberSlider
          id="ai-muse-sidebar-pool"
          min={6}
          max={MAX_AI_MUSE_POOL}
          value={config.poolSize}
          onChange={(poolSize) => applyConfig({ ...config, poolSize })}
        />
      </Field>
      <p className="muted text-xs m-0">
        Feed: {config.feed.length} image{config.feed.length === 1 ? '' : 's'}
        {config.blockedIds.length > 0 ? ` · ${config.blockedIds.length} blocked` : ''}
        . Edit the playlist in the main studio view.
      </p>
    </section>
  );
}
