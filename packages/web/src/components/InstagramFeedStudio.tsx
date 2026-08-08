import {
  normalizeInstagramFeedAppConfig,
  type InstagramFeedConfig,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';
import { InstagramFeedAccounts } from './InstagramFeedAccounts';
import { InstagramFeedPreview } from './InstagramFeedPreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

const PREVIEW_SCALE = 8;

export function InstagramFeedStudio({ project, onChange }: Props) {
  const config = normalizeInstagramFeedAppConfig(project.appConfig);

  const applyConfig = (next: InstagramFeedConfig) => {
    onChange({ ...next });
  };

  return (
    <div className="instagram-feed-studio">
      <section className="instagram-feed-preview-panel" aria-label="Instagram feed preview">
        <span className="field-label">Preview</span>
        <div className="instagram-feed-preview-stage">
          <InstagramFeedPreview
            projectId={project.id}
            appConfig={project.appConfig}
            scale={PREVIEW_SCALE}
            playing
          />
        </div>
      </section>

      <InstagramFeedAccounts appConfig={project.appConfig} onChange={applyConfig} />

      <section className="instagram-feed-controls-panel" aria-label="Display settings">
        <h3 className="instagram-feed-section-title">Display</h3>
        <div className="instagram-feed-controls-grid">
          <Field label="Cycle (sec)" htmlFor="instagram-feed-refresh">
            <NumberSlider
              id="instagram-feed-refresh"
              min={5}
              max={120}
              value={config.refreshSeconds}
              formatValue={(v) => `${v}s`}
              onChange={(refreshSeconds) => applyConfig({ ...config, refreshSeconds })}
            />
          </Field>
          <Field label="Re-fetch accounts (min)" htmlFor="instagram-feed-poll">
            <NumberSlider
              id="instagram-feed-poll"
              min={15}
              max={24 * 60}
              value={config.feedPollMinutes}
              formatValue={(v) => `${v}m`}
              onChange={(feedPollMinutes) => applyConfig({ ...config, feedPollMinutes })}
            />
          </Field>
        </div>
        <p className="muted text-xs m-0">
          Public profiles only. Instagram may rate-limit or block anonymous fetches — use Refresh feed if
          images stop updating.
        </p>
      </section>
    </div>
  );
}
