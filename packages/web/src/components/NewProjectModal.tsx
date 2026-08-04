import { useEffect, useState } from 'react';
import type { AppTemplate, ProjectType } from '@pixopen/core';
import { api } from '../lib/api';
import { Icon, icons, type IconName } from './icons';
import { ScrollRegion } from './ScrollRegion';

type Props = {
  onCreated: (projectId: string) => void;
  onClose: () => void;
};

const TEMPLATE_ICON: Record<string, IconName> = {
  'flip-note': 'flipNote',
  'stock-ticker': 'liveSign',
  'weather-frame': 'weatherFrame',
  'dvd-screensaver': 'dvdScreensaver',
  'spotify-now-playing': 'spotifyNowPlaying',
  'blank-image-frame': 'imageFrame',
  'blank-animator': 'animator',
};

function templateIconName(template: AppTemplate): IconName {
  if (template.id in TEMPLATE_ICON) return TEMPLATE_ICON[template.id]!;
  switch (template.type as ProjectType) {
    case 'image-frame':
      return 'imageFrame';
    case 'live-sign':
      return 'liveSign';
    default:
      return 'animator';
  }
}

export function NewProjectModal({ onCreated, onClose }: Props) {
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void api.apps.list().then(setTemplates);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const examples = templates.filter((t) => t.category === 'example');
  const blanks = templates.filter((t) => t.category === 'blank');

  const createFromTemplate = async (templateId: string) => {
    setBusy(templateId);
    setError('');
    try {
      const project = await api.projects.createFromTemplate(templateId);
      onCreated(project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create project');
      setBusy(null);
    }
  };

  const renderCard = (template: AppTemplate) => {
    const isExample = template.category === 'example';
    const isBusy = busy === template.id;
    const iconName = templateIconName(template);
    const accent =
      template.type === 'image-frame' ? 'image' : template.type === 'live-sign' ? 'live' : 'animator';
    return (
      <button
        key={template.id}
        type="button"
        className={`new-project-card template-accent-${accent}${isExample ? ' is-example' : ''}`}
        disabled={Boolean(busy)}
        onClick={() => void createFromTemplate(template.id)}
      >
        <span className="template-icon flex size-12 shrink-0 items-center justify-center rounded-xl">
          <Icon icon={icons[iconName]} size={32} strokeWidth={1.5} />
        </span>
        <span className="flex flex-col items-start gap-0.5 text-left min-w-0 flex-1">
          <span className="font-semibold text-base">{template.name}</span>
          <span className="text-sm text-muted whitespace-normal">{template.description}</span>
        </span>
        {isBusy ? (
          <span className="spinner shrink-0" aria-live="polite" />
        ) : (
          <Icon icon={icons.arrowRight} size={20} className="text-brand shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal-panel modal-panel-lg p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-border flex justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-1">New project</p>
            <h2 id="new-project-title" className="text-2xl font-bold">What are you making?</h2>
            <p className="text-sm text-muted mt-1 max-w-lg">
              Pick a starting point — name your project anytime in the studio.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square shrink-0"
            aria-label="Close"
            disabled={Boolean(busy)}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <ScrollRegion
          orientation="vertical"
          label="Project templates"
          className="max-h-[min(60vh,520px)]"
          viewportClassName="p-6 grid gap-5"
        >
          {examples.length > 0 ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Live Frames</h3>
              <div className="grid gap-2">{examples.map(renderCard)}</div>
            </section>
          ) : null}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Start from scratch</h3>
            <div className="grid gap-2">{blanks.map(renderCard)}</div>
          </section>

          {error ? <p className="status-error text-sm">{error}</p> : null}
        </ScrollRegion>
      </div>
    </div>
  );
}
