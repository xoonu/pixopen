import { useEffect, useMemo, useRef, useState } from 'react';
import type { Frame, Project } from '@pixopen/core';
import { getAppTemplate, shouldUseFlipNoteUi, shouldUseStockTickerUi, shouldUseWeatherUi, shouldUseDvdScreensaverUi } from '@pixopen/core';
import { api } from '../lib/api';
import { renderProjectCardPreview } from '../lib/projectCardPreview';
import { projectTypeBadgeClass, projectTypeBadgeLabel } from '../lib/projectBadges';
import { deviceDisplayLabel, deviceDisplayTitle } from '../lib/deviceLabel';
import { useSavedDevices } from '../hooks/useSavedDevices';
import { DeviceSelectModal } from './DeviceSelectModal';
import { ConfirmModal } from './ConfirmModal';
import { NewProjectModal } from './NewProjectModal';
import { Icon, icons } from './icons';
import { useRuntimeStatus } from '../hooks/useRuntimeStatus';
import { useToast } from './Toast';

const CANVAS_SIZE = 64;

function frameToImageData(frame: Frame): ImageData {
  return new ImageData(new Uint8ClampedArray(frame.pixels), CANVAS_SIZE, CANVAS_SIZE);
}

function ProjectCardPreview({ project }: { project: Project }) {
  const frame = useMemo(
    () => renderProjectCardPreview(project),
    [project.id, project.updatedAt, project.frames, project.appConfig, project.liveAreas, project.type, project.templateId],
  );
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(frameToImageData(frame), 0, 0);
  }, [frame]);

  return (
    <div className="project-card-preview-stage">
      <canvas ref={ref} width={64} height={64} className="project-card-canvas" aria-hidden="true" />
    </div>
  );
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type PendingSend = {
  project: Project;
  mode: 'deploy' | 'run';
};

type Props = {
  deviceIp: string;
  onDeviceIpChange: (ip: string) => void;
  onOpen: (projectId: string) => void;
  refreshKey?: number;
};

export function ProjectsPage({ deviceIp, onDeviceIpChange, onOpen, refreshKey = 0 }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingSend, setPendingSend] = useState<PendingSend | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const { pushToast } = useToast();
  const { runtimeStatus, refreshRuntimeStatus } = useRuntimeStatus();
  const savedDevices = useSavedDevices(refreshKey);

  const refresh = async () => {
    setProjects(await api.projects.list());
  };

  useEffect(() => {
    void refresh();
  }, [refreshKey]);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpenId]);

  const sendModeFor = (project: Project): 'deploy' | 'run' =>
    project.type === 'live-sign' ? 'run' : 'deploy';

  const sendLabelFor = (project: Project) =>
    sendModeFor(project) === 'run' ? 'Run' : 'Deploy';

  const sendToPixoo = async (project: Project, ip: string, mode: 'deploy' | 'run') => {
    setSendingId(project.id);
    pushToast(mode === 'run' ? 'Starting live display…' : 'Deploying…');
    try {
      if (mode === 'run') {
        await api.projects.run(project.id, ip);
        pushToast(`Running on ${deviceDisplayLabel(savedDevices, ip)}`);
      } else {
        await api.projects.deploy(project.id, ip);
        pushToast(`Deployed to ${deviceDisplayLabel(savedDevices, ip)}`);
      }
      refreshRuntimeStatus();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : mode === 'run' ? 'Run failed' : 'Deploy failed');
      throw e;
    } finally {
      setSendingId(null);
    }
  };

  const handleSendClick = (project: Project) => {
    const mode = sendModeFor(project);
    if (!deviceIp.trim()) {
      setPendingSend({ project, mode });
      return;
    }
    void sendToPixoo(project, deviceIp, mode);
  };

  const confirmPendingSend = async (ip: string) => {
    if (!pendingSend) return;
    onDeviceIpChange(ip);
    setSendingId(pendingSend.project.id);
    try {
      await sendToPixoo(pendingSend.project, ip, pendingSend.mode);
      setPendingSend(null);
    } catch {
      // toast already shown
    }
  };

  const requestDelete = (project: Project) => {
    setMenuOpenId(null);
    setPendingDelete(project);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.projects.delete(pendingDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      pushToast(`Deleted "${pendingDelete.name}"`);
      setPendingDelete(null);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const duplicateProject = async (project: Project) => {
    try {
      const copy = await api.projects.duplicate(project.id);
      setProjects((prev) => [copy, ...prev]);
      pushToast(`Duplicated as "${copy.name}"`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Duplicate failed');
    }
  };

  const typeAccent = (type: Project['type']) => {
    switch (type) {
      case 'image-frame': return 'project-card-type-image';
      case 'live-sign': return 'project-card-type-live';
      default: return 'project-card-type-animator';
    }
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">Your projects</h2>
          <p className="text-sm text-muted mt-1">
            {projects.length === 0
              ? 'Create something new — pick a type and start designing.'
              : `${projects.length} saved ${projects.length === 1 ? 'project' : 'projects'}`}
            {deviceIp ? (
              <>
                {' · Pixoo '}
                <strong title={deviceDisplayTitle(savedDevices, deviceIp)}>
                  {deviceDisplayLabel(savedDevices, deviceIp)}
                </strong>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm btn-pill shadow-md shadow-brand/30 shrink-0"
          onClick={() => setShowNewProject(true)}
        >
          <Icon icon={icons.add} size={16} />
          New project
        </button>
      </header>

      {projects.length === 0 ? (
        <div className="relative text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-surface-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-brand/10 to-transparent pointer-events-none" aria-hidden="true" />
          <p className="relative font-semibold text-lg">Nothing here yet</p>
          <button
            type="button"
            className="relative btn btn-primary btn-sm btn-pill mt-4 shadow-md shadow-brand/30"
            onClick={() => setShowNewProject(true)}
          >
            <Icon icon={icons.add} size={16} />
            New project
          </button>
          <p className="relative text-sm text-muted mt-3 max-w-md mx-auto">
            Choose Image Frame, Animator, Flip Note, or Stock Ticker to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {projects.map((project) => {
            const isLive =
              runtimeStatus.running
              && runtimeStatus.projectId === project.id
              && !runtimeStatus.lastError;
            const templateName = project.templateId && getAppTemplate(project.templateId)?.category === 'example'
              ? getAppTemplate(project.templateId)?.name
              : null;
            return (
              <article
                key={project.id}
                className={`card overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl ${typeAccent(project.type)}${isLive ? ' ring-2 ring-success/40' : ''}`}
              >
                <button
                  type="button"
                  className="block w-full p-0 border-0 bg-transparent cursor-pointer"
                  onClick={() => onOpen(project.id)}
                  aria-label={`Open ${project.name}`}
                >
                  <figure className="project-card-preview aspect-square grid place-items-center m-0">
                    <ProjectCardPreview project={project} />
                  </figure>
                </button>

                <div className="card-body gap-2 p-4 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      className="text-left font-semibold text-base hover:text-brand transition-colors line-clamp-2"
                      onClick={() => onOpen(project.id)}
                    >
                      {project.name || 'Untitled'}
                    </button>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square"
                        aria-label="Project actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === project.id ? null : project.id);
                        }}
                      >
                        <Icon icon={icons.more} size={18} />
                      </button>
                      {menuOpenId === project.id ? (
                        <div className="dropdown-menu" role="menu">
                          <button type="button" role="menuitem" onClick={() => void duplicateProject(project)}>Duplicate</button>
                          <button type="button" role="menuitem" className="text-error" onClick={() => requestDelete(project)}>Delete</button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {isLive ? (
                      <span
                        className="badge badge-live"
                        title={`Streaming to ${deviceDisplayLabel(savedDevices, runtimeStatus.deviceIp)}`}
                      >
                        Live
                      </span>
                    ) : null}
                    <span className={projectTypeBadgeClass(project.type)}>
                      {projectTypeBadgeLabel(project.type, templateName)}
                    </span>
                  </div>

                  <p className="text-xs text-muted">
                    {project.frames.length} frame{project.frames.length === 1 ? '' : 's'}
                    {project.type === 'live-sign' && !shouldUseFlipNoteUi(project) && !shouldUseStockTickerUi(project) && !shouldUseWeatherUi(project) && !shouldUseDvdScreensaverUi(project)
                      ? ` · ${project.liveAreas.length} region${project.liveAreas.length === 1 ? '' : 's'}`
                      : ''}
                    · Updated {formatRelativeDate(project.updatedAt)}
                  </p>

                  <div className="flex gap-2 mt-1">
                    <button type="button" className="btn btn-primary btn-sm flex-1" onClick={() => onOpen(project.id)}>
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm flex-1"
                      disabled={sendingId === project.id}
                      onClick={() => void handleSendClick(project)}
                    >
                      {sendingId === project.id ? <span className="spinner" /> : sendLabelFor(project)}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pendingDelete ? (
        <ConfirmModal
          title="Delete project?"
          tone="danger"
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (!deleting) setPendingDelete(null);
          }}
        >
          <p className="m-0">
            Delete <strong className="text-fg">{pendingDelete.name || 'Untitled'}</strong>? This cannot be undone.
          </p>
        </ConfirmModal>
      ) : null}

      {showNewProject ? (
        <NewProjectModal
          onCreated={(projectId) => {
            setShowNewProject(false);
            void refresh().then(() => onOpen(projectId));
          }}
          onClose={() => setShowNewProject(false)}
        />
      ) : null}

      {pendingSend ? (
        <DeviceSelectModal
          project={pendingSend.project}
          mode={pendingSend.mode}
          selectedIp={deviceIp}
          onSelect={onDeviceIpChange}
          onConfirm={(ip) => void confirmPendingSend(ip)}
          onCancel={() => {
            if (!sendingId) {
              setPendingSend(null);
            }
          }}
          confirming={Boolean(sendingId)}
        />
      ) : null}
    </div>
  );
}
