import { useEffect, useState } from 'react';
import { getAppTemplate, type AppTemplate } from '@pixopen/core';
import { api } from '../../lib/api';
import { Field } from '../ControlSection';
import { useToast } from '../Toast';

type Props = {
  onOpen: (projectId: string) => void;
};

export function ProjectsSidebarPanel({ onOpen }: Props) {
  const [templates, setTemplates] = useState<AppTemplate[]>([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    void api.apps.list().then(setTemplates);
  }, []);

  const examples = templates.filter((t) => t.category === 'example');
  const blanks = templates.filter((t) => t.category === 'blank');

  const createFromTemplate = async (templateId: string) => {
    setBusy(true);
    try {
      const project = await api.projects.createFromTemplate(templateId, newName);
      setNewName('');
      pushToast(`Created "${project.name}"`);
      onOpen(project.id);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sidebar-panel-stack">
      <p className="sidebar-panel-hint muted">
        Pick an app from the library or start from a blank template.
      </p>
      <Field label="Project name (optional)" htmlFor="sidebar-new-project-name">
        <input
          id="sidebar-new-project-name"
          placeholder="Auto-named if empty"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && blanks[0] && void createFromTemplate(blanks[0].id)}
        />
      </Field>

      {examples.length > 0 ? (
        <div className="app-library-section">
          <span className="field-label">Example apps</span>
          <div className="app-library-grid">
            {examples.map((app) => (
              <button
                key={app.id}
                type="button"
                className="app-library-card"
                disabled={busy}
                onClick={() => void createFromTemplate(app.id)}
              >
                <span className="app-library-icon" aria-hidden>{app.icon}</span>
                <span className="app-library-name">{app.name}</span>
                <span className="app-library-desc muted">{app.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="app-library-section">
        <span className="field-label">Blank apps</span>
        <div className="app-library-grid">
          {blanks.map((app) => (
            <button
              key={app.id}
              type="button"
              className="app-library-card app-library-card-blank"
              disabled={busy}
              onClick={() => void createFromTemplate(app.id)}
            >
              <span className="app-library-icon" aria-hidden>{app.icon}</span>
              <span className="app-library-name">{app.name}</span>
              <span className="app-library-desc muted">{app.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function projectTemplateLabel(templateId: string | null): string | null {
  if (!templateId) return null;
  return getAppTemplate(templateId)?.name ?? null;
}
