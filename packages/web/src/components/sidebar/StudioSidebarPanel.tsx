import { useState } from 'react';
import { shouldUseVestaNoteUi } from '@pixopen/core';
import { api } from '../../lib/api';
import { Field } from '../ControlSection';
import { SequencePreview } from '../SequencePreview';
import { VestaNotePreview } from '../VestaNotePreview';
import { useStudio } from '../../studio/StudioProvider';

type Props = {
  deviceIp: string;
  onProjectIdChange: (id: string | null) => void;
};

function isErrorStatus(status: string): boolean {
  return /failed|error|timeout|not found|required|exists|unable|select a pixoo|fix the|no frames|can't reach|didn't respond|rejected/i.test(status);
}

export function StudioSidebarPanel({ deviceIp, onProjectIdChange }: Props) {
  const [sending, setSending] = useState(false);
  const {
    project,
    projects,
    setProject,
    save,
    nameConflict,
    projectTypeLabel,
    status,
    setStatus,
    previewPixels,
    liveRuntimeActive,
    runtimeError,
    frameIndex,
    setFrameIndex,
  } = useStudio();

  if (!project) {
    return <p className="sidebar-panel-hint muted">Open a project from the list to edit it here.</p>;
  }

  const canSend = Boolean(deviceIp) && !nameConflict && Boolean(project.name.trim()) && !sending;

  const handleDeploy = async () => {
    if (!deviceIp) return setStatus('Select a Pixoo on the Devices tab');
    if (!project.name.trim()) return setStatus('Project name is required');
    if (nameConflict) return setStatus('Fix the project name before deploying');
    setSending(true);
    setStatus('Saving and sending to Pixoo…');
    try {
      await save();
      await api.projects.deploy(project.id, deviceIp);
      setStatus(`Deployed "${project.name}" to ${deviceIp}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Deploy failed');
    } finally {
      setSending(false);
    }
  };

  const handleRun = async () => {
    if (!deviceIp) return setStatus('Select a Pixoo on the Devices tab');
    if (!project.name.trim()) return setStatus('Project name is required');
    if (nameConflict) return setStatus('Fix the project name before running');
    setSending(true);
    setStatus('Saving and starting live display…');
    try {
      await save();
      await api.projects.run(project.id, deviceIp);
      setStatus(`Running live display "${project.name}" on ${deviceIp}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setSending(false);
    }
  };

  const handleStop = async () => {
    setSending(true);
    try {
      await api.runtime.stop();
      setStatus('Stopped live display');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Stop failed');
    } finally {
      setSending(false);
    }
  };

  const isVestaNote = shouldUseVestaNoteUi(project);

  return (
    <div className="sidebar-panel-stack">
      <Field label="Name" htmlFor="sidebar-project-name">
        <input
          id="sidebar-project-name"
          value={project.name}
          onChange={(e) => setProject({ ...project, name: e.target.value })}
        />
      </Field>
      <div className="sidebar-inline-meta">
        <span className={`badge badge-${project.type}`}>{projectTypeLabel}</span>
        <button type="button" onClick={() => void save()} disabled={!project.name.trim() || !!nameConflict || sending}>
          Save
        </button>
      </div>
      <Field label="Switch project" htmlFor="sidebar-project-switcher">
        <select
          id="sidebar-project-switcher"
          value={project.id}
          onChange={(e) => onProjectIdChange(e.target.value || null)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>

      {nameConflict ? (
        <p className="status-error sidebar-status">That name is already in use.</p>
      ) : null}

      <div className="sidebar-subsection">
        <h4 className="sidebar-subsection-title">Send to Pixoo</h4>
        <p className="sidebar-panel-hint muted">
          {deviceIp ? `Target: ${deviceIp}` : 'Select a Pixoo on Devices first.'}
        </p>
        <div className="sidebar-deploy-actions">
          {project.type === 'live-sign' ? (
            <>
              <button
                type="button"
                className="primary sidebar-full-btn"
                disabled={!canSend}
                onClick={() => void handleRun()}
              >
                {sending ? 'Sending…' : 'Run on Pixoo'}
              </button>
              <button
                type="button"
                className="sidebar-full-btn"
                disabled={sending}
                onClick={() => void handleStop()}
              >
                Stop live display
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary sidebar-full-btn"
              disabled={!canSend}
              onClick={() => void handleDeploy()}
            >
              {sending ? 'Sending…' : 'Deploy to Pixoo'}
            </button>
          )}
        </div>
        <div className="sidebar-preview-wrap">
          {isVestaNote ? (
            <div className="sidebar-vesta-preview">
              <span className="field-label">Preview</span>
              <VestaNotePreview appConfig={project.appConfig} scale={3} playing />
            </div>
          ) : (
            <SequencePreview
              compact
              frames={project.frames}
              frameDurationMs={project.frameDurationMs}
              loop={project.loop}
              livePixels={previewPixels}
              liveActive={project.type === 'live-sign' && liveRuntimeActive}
              editorFrameIndex={frameIndex}
              onFrameChange={setFrameIndex}
            />
          )}
        </div>
      </div>

      {runtimeError ? (
        <p className="status-error sidebar-status">Pixoo update failed: {runtimeError}</p>
      ) : null}
      {liveRuntimeActive && !runtimeError && isVestaNote ? (
        <p className="sidebar-status muted">Live on Pixoo — animation is streaming to your device.</p>
      ) : null}

      {status ? (
        <p className={isErrorStatus(status) ? 'status-error sidebar-status' : 'sidebar-status muted'}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
