import { useState } from 'react';
import { shouldUseFlipNoteUi } from '@pixopen/core';
import { api } from '../lib/api';
import { projectTypeBadgeClass } from '../lib/projectBadges';
import { deviceDisplayLabel, deviceDisplayTitle } from '../lib/deviceLabel';
import { useSavedDevices } from '../hooks/useSavedDevices';
import { useStudio } from '../studio/StudioProvider';

type Props = {
  deviceIp: string;
};

function isErrorStatus(status: string): boolean {
  return /failed|error|timeout|not found|required|exists|unable|select a pixoo|fix the|no frames|can't reach|didn't respond|rejected/i.test(status);
}

function isRedundantFlipNoteStatus(status: string): boolean {
  return /^live on /i.test(status.trim()) || /^deployed to /i.test(status.trim());
}

/** Project controls, device target, playback preview, and status — lives in the studio sidebar. */
export function StudioChrome({ deviceIp }: Props) {
  const [sending, setSending] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const savedDevices = useSavedDevices();
  const deviceLabel = deviceDisplayLabel(savedDevices, deviceIp);
  const {
    project,
    setProject,
    save,
    nameConflict,
    projectTypeLabel,
    status,
    setStatus,
    liveRuntimeActive,
    liveRuntimeProjectId,
    runtimeError,
    refreshRuntimeStatus,
  } = useStudio();

  if (!project) return null;

  const isFlipNote = shouldUseFlipNoteUi(project);
  const canSend = Boolean(deviceIp) && !nameConflict && Boolean(project.name.trim()) && !sending;
  const isThisProjectLive = liveRuntimeActive && liveRuntimeProjectId === project.id && !runtimeError;
  const showStatus = status && (!isFlipNote || isErrorStatus(status) || !isRedundantFlipNoteStatus(status));

  const handleDeploy = async () => {
    if (!deviceIp) return setStatus('Select a Pixoo on the Devices tab');
    if (!project.name.trim()) return setStatus('Give your project a name before deploying');
    if (nameConflict) return setStatus('That project name is already in use');
    setSending(true);
    setStatus('Saving and sending to Pixoo…');
    try {
      await save();
      const wasLive = liveRuntimeActive && liveRuntimeProjectId === project.id;
      await api.projects.deploy(project.id, deviceIp);
      refreshRuntimeStatus();
      setStatus(wasLive ? `Stopped live display and deployed to ${deviceLabel}` : `Deployed to ${deviceLabel}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Deploy failed');
    } finally {
      setSending(false);
    }
  };

  const handleRun = async () => {
    if (!deviceIp) return setStatus('Select a Pixoo on the Devices tab');
    if (!project.name.trim()) return setStatus('Give your project a name before running');
    if (nameConflict) return setStatus('That project name is already in use');
    setSending(true);
    setStatus('Saving and starting live display…');
    try {
      await save();
      await api.projects.run(project.id, deviceIp);
      if (!shouldUseFlipNoteUi(project)) {
        setStatus(`Live on ${deviceLabel}`);
      } else {
        setStatus('');
      }
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
      refreshRuntimeStatus();
      setStatus('Stopped live display');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Stop failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="studio-sidebar-chrome">
      <div className="studio-sidebar-section">
        <input
          className={`studio-sidebar-title${nameFocused ? ' is-focused' : ''}${!project.name.trim() ? ' is-empty' : ''}`}
          value={project.name}
          placeholder="Untitled project"
          aria-label="Project name"
          onChange={(e) => setProject({ ...project, name: e.target.value })}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
        />
        {!isFlipNote ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={projectTypeBadgeClass(project.type)}>{projectTypeLabel}</span>
            {isThisProjectLive ? (
              <span className="badge badge-live">Live on Pixoo</span>
            ) : null}
          </div>
        ) : null}
        {nameConflict ? (
          <p className="status-error text-sm mt-2 mb-0">That name is already in use — pick another.</p>
        ) : null}
      </div>

      <div className="studio-sidebar-section studio-sidebar-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full"
          disabled={!project.name.trim() || !!nameConflict || sending}
          onClick={() => void save()}
        >
          Save
        </button>
        {project.type === 'live-sign' ? (
          <>
            <button type="button" className="btn btn-primary btn-sm w-full" disabled={!canSend} onClick={() => void handleRun()}>
              {sending ? <span className="spinner" /> : 'Run on Pixoo'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full" disabled={sending} onClick={() => void handleStop()}>
              Stop
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-sm w-full" disabled={!canSend} onClick={() => void handleDeploy()}>
            {sending ? <span className="spinner" /> : 'Deploy to Pixoo'}
          </button>
        )}
      </div>

      {!isFlipNote ? (
        <div className="studio-sidebar-section">
          <p className="field-label m-0">Target device</p>
          <p className="text-sm text-muted m-0 mt-1">
            {deviceIp ? (
              <>
                Connected to{' '}
                <strong className="text-fg" title={deviceDisplayTitle(savedDevices, deviceIp)}>
                  {deviceLabel}
                </strong>
              </>
            ) : (
              'No Pixoo selected — choose one on Devices'
            )}
          </p>
        </div>
      ) : null}

      {runtimeError ? (
        <p className="status-error text-sm m-0 studio-sidebar-status">Pixoo update failed: {runtimeError}</p>
      ) : null}
      {showStatus ? (
        <p className={`text-sm m-0 studio-sidebar-status${isErrorStatus(status) ? ' status-error' : ' text-muted'}`}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
