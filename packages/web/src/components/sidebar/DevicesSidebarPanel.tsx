import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../../lib/api';
import { DevicePicker } from '../DevicePicker';

type Props = {
  selectedIp: string;
  onSelect: (ip: string) => void;
  onStatus?: (message: string) => void;
};

export function DevicesSidebarPanel({ selectedIp, onSelect, onStatus }: Props) {
  const [, setDevices] = useState<SavedDevice[]>([]);

  useEffect(() => {
    void api.devices.list().then(setDevices);
  }, []);

  return (
    <div className="sidebar-panel-stack">
      <DevicePicker selectedIp={selectedIp} onSelect={onSelect} onStatus={onStatus} idPrefix="sidebar" />
      {selectedIp ? (
        <button
          type="button"
          className="sidebar-full-btn"
          onClick={async () => {
            onStatus?.(`Checking ${selectedIp}…`);
            try {
              const result = await api.devices.ping(selectedIp);
              if (result.ok) onStatus?.(`Connected to Pixoo at ${selectedIp}`);
              else onStatus?.(result.error);
            } catch (e) {
              onStatus?.(e instanceof Error ? e.message : 'Connection check failed');
            }
          }}
        >
          Test connection
        </button>
      ) : null}
    </div>
  );
}
