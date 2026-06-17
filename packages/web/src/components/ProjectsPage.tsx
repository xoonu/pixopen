import { useEffect, useRef, useState } from 'react';
import type { Frame, Project } from '@pixopen/core';
import { getAppTemplate, projectTypeLabel } from '@pixopen/core';
import { api } from '../lib/api';

const CANVAS_SIZE = 64;

function frameToImageData(frame: Frame): ImageData {
  return new ImageData(new Uint8ClampedArray(frame.pixels), CANVAS_SIZE, CANVAS_SIZE);
}

function ProjectThumb({ frame }: { frame: Frame }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(frameToImageData(frame), 0, 0);
  }, [frame]);
  return <canvas ref={ref} width={64} height={64} className="project-thumb" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Props = {
  onOpen: (projectId: string) => void;
};

export function ProjectsPage({ onOpen }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refresh = async () => {
    setProjects(await api.projects.list());
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startRename = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const saveRename = async (project: Project) => {
    const name = editName.trim();
    if (!name) {
      setStatus('Name cannot be empty');
      return;
    }
    try {
      const updated = await api.projects.update({ ...project, name });
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingId(null);
      setStatus(`Renamed to "${updated.name}"`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Rename failed');
    }
  };

  const removeProject = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await api.projects.delete(project.id);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setStatus(`Deleted "${project.name}"`);
  };

  const duplicateProject = async (project: Project) => {
    try {
      const copy = await api.projects.duplicate(project.id);
      setProjects((prev) => [copy, ...prev]);
      setStatus(`Duplicated as "${copy.name}"`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Duplicate failed');
    }
  };

  return (
    <div>
      <div className="panel">
        <h2>Projects</h2>
        <p className="muted">Your saved Pixoo apps. Create new ones from the app library in the sidebar.</p>
        {status && <p className="muted">{status}</p>}
      </div>

      <div className="panel">
        {projects.length === 0 ? (
          <p className="muted">No projects yet. Create one in the sidebar to get started.</p>
        ) : (
          <div className="project-grid">
            {projects.map((project) => (
              <article key={project.id} className="project-card">
                <ProjectThumb frame={project.frames[0]} />
                <div className="project-card-body">
                  {editingId === project.id ? (
                    <div className="project-rename">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveRename(project);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button onClick={() => void saveRename(project)}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <h3 className="project-name">{project.name}</h3>
                  )}
                  <div className="project-meta">
                    <span className={`badge badge-${project.type}`}>
                      {projectTypeLabel(project.type)}
                    </span>
                    {project.templateId && getAppTemplate(project.templateId)?.category === 'example' ? (
                      <span className="badge badge-example">{getAppTemplate(project.templateId)?.name}</span>
                    ) : null}
                    <span>{project.frames.length} frame{project.frames.length === 1 ? '' : 's'}</span>
                    {project.type === 'live-sign' && project.templateId !== 'vesta-note' ? (
                      <span>{project.liveAreas.length} live area{project.liveAreas.length === 1 ? '' : 's'}</span>
                    ) : null}
                  </div>
                  <p className="muted project-date">Updated {formatDate(project.updatedAt)}</p>
                  <div className="project-actions">
                    <button className="primary" onClick={() => onOpen(project.id)}>Open</button>
                    <button onClick={() => startRename(project)}>Rename</button>
                    <button onClick={() => void duplicateProject(project)}>Duplicate</button>
                    <button className="danger" onClick={() => void removeProject(project)}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
