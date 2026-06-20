import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../../lib/api';
import { DevicePicker } from '../DevicePicker';
import { useToast } from '../Toast';

type Props = {
  selectedIp: string;
  onSelect: (ip: string) => void;
};

export function DevicesSidebarPanel({ selectedIp, onSelect }: Props) {
  const [, setDevices] = useState<SavedDevice[]>([]);
  const { pushToast } = useToast();

  useEffect(() => {
    void api.devices.list().then(setDevices);
  }, []);

  return (
    <div className="sidebar-panel-stack">
      <DevicePicker selectedIp={selectedIp} onSelect={onSelect} idPrefix="sidebar" />
      {selectedIp ? (
        <button
          type="button"
          className="sidebar-full-btn"
          onClick={async () => {
            pushToast(`Checking ${selectedIp}…`);
            try {
              const result = await api.devices.ping(selectedIp);
              if (result.ok) pushToast(`Connected to Pixoo at ${selectedIp}`);
              else pushToast(result.error);
            } catch (e) {
              pushToast(e instanceof Error ? e.message : 'Connection check failed');
            }
          }}
        >
          Test connection
        </button>
      ) : null}
    </div>
  );
}
