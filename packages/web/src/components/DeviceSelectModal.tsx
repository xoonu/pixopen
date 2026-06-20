import { useState } from 'react';
import type { Project } from '@pixopen/core';
import { DevicePicker } from './DevicePicker';

type Props = {
  project: Project;
  mode: 'deploy' | 'run';
  selectedIp: string;
  onSelect: (ip: string) => void;
  onConfirm: (ip: string) => void;
  onCancel: () => void;
  confirming?: boolean;
};

export function DeviceSelectModal({
  project,
  mode,
  selectedIp,
  onSelect,
  onConfirm,
  onCancel,
  confirming = false,
}: Props) {
  const [localIp, setLocalIp] = useState(selectedIp);
  const activeIp = localIp || selectedIp;

  const handleSelect = (ip: string) => {
    setLocalIp(ip);
    onSelect(ip);
  };

  const confirmLabel = mode === 'run' ? 'Run on Pixoo' : 'Deploy to Pixoo';
  const title = mode === 'run' ? 'Select Pixoo to run live display' : 'Select Pixoo to deploy';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-select-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirming) onCancel();
      }}
    >
      <div className="modal-panel p-5">
        <h3 id="device-select-title" className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-muted py-2">
          Choose a Pixoo for <strong className="text-fg">{project.name}</strong>, then {mode === 'run' ? 'run' : 'deploy'}.
        </p>
        <DevicePicker
          idPrefix="device-modal"
          selectedIp={activeIp}
          onSelect={handleSelect}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn btn-ghost btn-sm" disabled={confirming} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!activeIp.trim() || confirming}
            onClick={() => onConfirm(activeIp)}
          >
            {confirming ? <span className="spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
