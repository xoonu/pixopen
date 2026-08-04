import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../lib/api';
import { Field } from './ControlSection';
import { ConfirmModal } from './ConfirmModal';
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
  /** Optional controlled list — keeps picker labels in sync with a parent panel. */
  devices?: SavedDevice[];
  onDevicesChange?: (devices: SavedDevice[]) => void;
  /** When false, omit the inline saved-device list (e.g. Devices page has its own). */
  showSavedList?: boolean;
};

export function DevicePicker({
  selectedIp,
  onSelect,
  idPrefix = 'device',
  devices: devicesProp,
  onDevicesChange,
  showSavedList = true,
}: Props) {
  const { pushToast } = useToast();
  const [devicesLocal, setDevicesLocal] = useState<SavedDevice[]>([]);
  const devices = devicesProp ?? devicesLocal;
  const [manualIp, setManualIp] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const applyDevices = (next: SavedDevice[]) => {
    setDevicesLocal(next);
    onDevicesChange?.(next);
  };

  useEffect(() => {
    if (devicesProp) return;
    void api.devices.list().then((list) => {
      applyDevices(list);
      if (!selectedIp && list.length === 1) {
        onSelect(list[0].ip);
      }
    });
    // Intentionally run once on mount when uncontrolled; selection sync is handled by discover/remove/clear.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, []);

  const syncSelection = (next: SavedDevice[], discovered: SavedDevice[] = []) => {
    const stillSelected = selectedIp && next.some((d) => d.ip === selectedIp);
    if (stillSelected) return;

    const single = pickSingleDiscovered(next, discovered);
    if (single) {
      onSelect(single.ip);
      return;
    }
    if (discovered.length === 1) {
      onSelect(discovered[0].ip);
      return;
    }
    if (selectedIp) onSelect('');
  };

  const discover = async () => {
    setBusy(true);
    pushToast('Searching for Pixoo devices…');
    try {
      const { devices: next, discovered } = await api.devices.discover();
      applyDevices(next);
      const single = pickSingleDiscovered(next, discovered);
      if (single) {
        onSelect(single.ip);
        pushToast(`Connected to ${deviceDisplayLabel(next, single.ip)}`);
      } else if (discovered.length === 0) {
        syncSelection(next, discovered);
        pushToast('No Pixoo devices found on your network');
      } else {
        syncSelection(next, discovered);
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
      const next = await api.devices.list();
      applyDevices(next);
      onSelect(device.ip);
      setManualIp('');
      pushToast(`Added ${device.ip}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (device: SavedDevice) => {
    setBusy(true);
    try {
      const { devices: next } = await api.devices.remove(device.id);
      applyDevices(next);
      if (selectedIp === device.ip) {
        onSelect(next.length === 1 ? next[0].ip : '');
      }
      pushToast(`Removed ${deviceDisplayLabel([device], device.ip) || device.ip}`);
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  };

  const clearDevices = async () => {
    setBusy(true);
    try {
      const { devices: next } = await api.devices.clear();
      applyDevices(next);
      onSelect('');
      setConfirmClear(false);
      pushToast('Cleared saved devices');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Clear failed');
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
      {showSavedList ? (
        devices.length > 0 ? (
          <div className="grid gap-1.5 mt-1">
            <div className="flex items-center justify-between gap-2">
              <span className="field-label">Saved devices</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-muted"
                disabled={busy}
                onClick={() => setConfirmClear(true)}
              >
                Clear all
              </button>
            </div>
            {devices.map((device) => (
              <div
                key={device.id}
                className={`flex gap-1 rounded-lg border overflow-hidden ${selectedIp === device.ip ? 'border-brand ring-1 ring-brand/30' : 'border-border'}`}
              >
                <button
                  type="button"
                  className={`btn btn-sm flex-1 justify-start h-auto py-2.5 rounded-none border-0 ${selectedIp === device.ip ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => onSelect(device.ip)}
                >
                  <span className="grid text-left gap-0.5">
                    <span>{selectedIp === device.ip ? '✓ ' : ''}{device.name}</span>
                    <span className="text-xs opacity-80 font-normal">{device.ip}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm rounded-none border-0 border-l border-border text-muted"
                  disabled={busy}
                  aria-label={`Remove ${device.name}`}
                  title="Remove"
                  onClick={() => void removeDevice(device)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No saved devices yet — search the network or add one manually.</p>
        )
      ) : null}

      {confirmClear ? (
        <ConfirmModal
          title="Clear saved devices?"
          tone="danger"
          confirmLabel="Clear all"
          busy={busy}
          onConfirm={() => void clearDevices()}
          onCancel={() => setConfirmClear(false)}
        >
          This removes every saved Pixoo from this computer. Search the network again to rediscover devices.
        </ConfirmModal>
      ) : null}
    </div>
  );
}
