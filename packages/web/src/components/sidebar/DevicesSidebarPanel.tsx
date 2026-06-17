import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../../lib/api';
import { Field } from '../ControlSection';

type Props = {
  selectedIp: string;
  onSelect: (ip: string) => void;
  onStatus?: (message: string) => void;
};

export function DevicesSidebarPanel({ selectedIp, onSelect, onStatus }: Props) {
  const [devices, setDevices] = useState<SavedDevice[]>([]);
  const [manualIp, setManualIp] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.devices.list().then(setDevices);
  }, []);

  const discover = async () => {
    setBusy(true);
    onStatus?.('Searching for Pixoo devices…');
    try {
      setDevices(await api.devices.discover());
      onStatus?.('Search complete');
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  };

  const addManual = async () => {
    if (!manualIp.trim()) return;
    setBusy(true);
    try {
      const device = await api.devices.add(manualIp.trim());
      setDevices((prev) => [...prev, device]);
      onSelect(device.ip);
      setManualIp('');
      onStatus?.(`Added ${device.ip}`);
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sidebar-panel-stack">
      <p className="sidebar-panel-hint muted">
        {selectedIp ? <>Target: <strong>{selectedIp}</strong></> : 'No Pixoo selected yet.'}
      </p>
      <button type="button" className="primary sidebar-full-btn" disabled={busy} onClick={() => void discover()}>
        Search network
      </button>
      <Field label="Manual IP" htmlFor="sidebar-manual-ip">
        <input
          id="sidebar-manual-ip"
          placeholder="192.168.1.42"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addManual()}
        />
      </Field>
      <button type="button" className="sidebar-full-btn" disabled={busy || !manualIp.trim()} onClick={() => void addManual()}>
        Add device
      </button>
      {devices.length > 0 ? (
        <div className="sidebar-device-picker">
          <span className="field-label">Quick select</span>
          {devices.map((device) => (
            <button
              key={device.id}
              type="button"
              className={`sidebar-device-btn${selectedIp === device.ip ? ' is-selected' : ''}`}
              onClick={() => onSelect(device.ip)}
            >
              {selectedIp === device.ip ? '✓ ' : ''}{device.name}
              <span className="muted">{device.ip}</span>
            </button>
          ))}
        </div>
      ) : null}
      {selectedIp ? (
        <button
          type="button"
          className="sidebar-full-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            onStatus?.(`Checking ${selectedIp}…`);
            try {
              const result = await api.devices.ping(selectedIp);
              if (result.ok) onStatus?.(`Connected to Pixoo at ${selectedIp}`);
              else onStatus?.(result.error);
            } catch (e) {
              onStatus?.(e instanceof Error ? e.message : 'Connection check failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          Test connection
        </button>
      ) : null}
    </div>
  );
}
