import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../lib/api';
import { Field } from './ControlSection';
import { deviceDisplayLabel, deviceDisplayTitle } from '../lib/deviceLabel';
import { useToast } from './Toast';

function pickSingleDiscovered(devices: SavedDevice[], discovered: SavedDevice[]): SavedDevice | null {
  if (discovered.length !== 1) return null;
  const ip = discovered[0].ip;
  return devices.find((d) => d.ip === ip) ?? discovered[0];
}

type Props = {
  selectedIp: string;
  onSelect: (ip: string) => void;
  idPrefix?: string;
};

export function DevicePicker({ selectedIp, onSelect, idPrefix = 'device' }: Props) {
  const { pushToast } = useToast();
  const [devices, setDevices] = useState<SavedDevice[]>([]);
  const [manualIp, setManualIp] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.devices.list().then((devices) => {
      setDevices(devices);
      if (!selectedIp && devices.length === 1) {
        onSelect(devices[0].ip);
      }
    });
  }, [onSelect, selectedIp]);

  const discover = async () => {
    setBusy(true);
    pushToast('Searching for Pixoo devices…');
    try {
      const { devices, discovered } = await api.devices.discover();
      setDevices(devices);
      const single = pickSingleDiscovered(devices, discovered);
      if (single) {
        onSelect(single.ip);
        pushToast(`Connected to ${deviceDisplayLabel(devices, single.ip)}`);
      } else if (discovered.length === 0) {
        pushToast('No Pixoo devices found on your network');
      } else {
        pushToast(`Found ${discovered.length} devices — select one below`);
      }
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Search failed');
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
      pushToast(`Added ${device.ip}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="device-picker">
      <p className="text-sm text-muted">
        {selectedIp ? (
          <>
            Selected:{' '}
            <strong className="text-fg" title={deviceDisplayTitle(devices, selectedIp)}>
              {deviceDisplayLabel(devices, selectedIp)}
            </strong>
          </>
        ) : (
          'Search your network or add a Pixoo by IP address.'
        )}
      </p>
      <button type="button" className="btn btn-primary btn-sm w-full" disabled={busy} onClick={() => void discover()}>
        {busy ? <span className="spinner" /> : 'Search network'}
      </button>
      <Field label="Manual IP" htmlFor={`${idPrefix}-manual-ip`}>
        <input
          id={`${idPrefix}-manual-ip`}
          className="input"
          placeholder="192.168.1.42"
          value={manualIp}
          onChange={(e) => setManualIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void addManual()}
        />
      </Field>
      <button type="button" className="btn btn-outline btn-sm w-full" disabled={busy || !manualIp.trim()} onClick={() => void addManual()}>
        Add device
      </button>
      {devices.length > 0 ? (
        <div className="grid gap-1.5 mt-1">
          <span className="field-label">Saved devices</span>
          {devices.map((device) => (
            <button
              key={device.id}
              type="button"
              className={`btn btn-sm justify-start h-auto py-2.5 ${selectedIp === device.ip ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onSelect(device.ip)}
            >
              <span className="grid text-left gap-0.5">
                <span>{selectedIp === device.ip ? '✓ ' : ''}{device.name}</span>
                <span className="text-xs opacity-80 font-normal">{device.ip}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No saved devices yet — search the network or add one manually.</p>
      )}
    </div>
  );
}
