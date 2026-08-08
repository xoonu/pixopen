import {
  normalizeInstagramFeedAppConfig,
  type InstagramFeedConfig,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';
import { InstagramFeedPreview } from './InstagramFeedPreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

/** Compact controls + preview for the Instagram Feed project left sidebar. */
export function InstagramFeedPanel({ project, onChange }: Props) {
  const config = normalizeInstagramFeedAppConfig(project.appConfig);

  const applyConfig = (next: InstagramFeedConfig) => {
    onChange({ ...next });
  };

  return (
    <section className="instagram-feed-sidebar-panel" aria-label="Instagram Feed">
      <div className="instagram-feed-sidebar-preview">
        <span className="field-label">Preview</span>
        <InstagramFeedPreview projectId={project.id} appConfig={project.appConfig} scale={3} playing />
      </div>
      <Field label="Cycle (sec)" htmlFor="instagram-feed-sidebar-refresh">
        <NumberSlider
          id="instagram-feed-sidebar-refresh"
          min={5}
          max={120}
          value={config.refreshSeconds}
          formatValue={(v) => `${v}s`}
          onChange={(refreshSeconds) => applyConfig({ ...config, refreshSeconds })}
        />
      </Field>
      <p className="muted text-xs m-0">
        {config.accounts.length} account{config.accounts.length === 1 ? '' : 's'}
        {' · '}
        {config.feed.length} image{config.feed.length === 1 ? '' : 's'}
        {config.blockedIds.length > 0 ? ` · ${config.blockedIds.length} blocked` : ''}. Edit accounts in
        the main studio view.
      </p>
    </section>
  );
}
