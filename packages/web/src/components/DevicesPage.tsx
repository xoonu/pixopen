import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../lib/api';
import { DevicePicker } from './DevicePicker';
import { ConfirmModal } from './ConfirmModal';
import { deviceDisplayLabel } from '../lib/deviceLabel';
import { useToast } from './Toast';

export function DevicesPage({ selectedIp, onSelect }: { selectedIp: string; onSelect: (ip: string) => void }) {
  const [devices, setDevices] = useState<SavedDevice[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const { pushToast } = useToast();

  const refresh = async () => {
    setDevices(await api.devices.list());
  };

  useEffect(() => { void refresh(); }, []);

  const removeDevice = async (device: SavedDevice) => {
    setBusy(true);
    try {
      const { devices: next } = await api.devices.remove(device.id);
      setDevices(next);
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
      setDevices(next);
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
    <div className="grid gap-5">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Pixoo devices</h2>
        <p className="text-sm text-muted mt-1">
          Discover and connect your display. The selected device is used when you deploy or run from Studio.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 items-start">
        <section className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Connect a device</h3>
            <DevicePicker
              idPrefix="devices-page"
              selectedIp={selectedIp}
              onSelect={onSelect}
              devices={devices}
              onDevicesChange={setDevices}
              showSavedList={false}
            />
            {selectedIp ? (
              <button
                type="button"
                className="btn btn-outline btn-sm w-full mt-2"
                onClick={async () => {
                  const label = deviceDisplayLabel(devices, selectedIp);
                  pushToast(`Checking ${label}…`);
                  try {
                    const result = await api.devices.ping(selectedIp);
                    if (result.ok) pushToast(`Connected to Pixoo at ${label}`);
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
        </section>

        <section className="card">
          <div className="card-body">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold m-0">Saved devices</h3>
              {devices.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-muted"
                  disabled={busy}
                  onClick={() => setConfirmClear(true)}
                >
                  Clear all
                </button>
              ) : null}
            </div>
            {devices.length === 0 ? (
              <p className="text-sm text-muted">No devices saved yet — discover one above.</p>
            ) : (
              <ul className="grid gap-2">
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className={`flex gap-1 rounded-lg border overflow-hidden ${selectedIp === d.ip ? 'border-brand ring-1 ring-brand/30' : 'border-border'}`}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost flex-1 justify-start h-auto py-3 rounded-none border-0"
                      onClick={() => onSelect(d.ip)}
                    >
                      <span className="grid text-left gap-0.5">
                        <span className="font-semibold text-sm">{d.name}</span>
                        <span className="text-xs text-muted">{d.ip}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm rounded-none border-0 border-l border-border"
                      disabled={busy}
                      onClick={async () => {
                        pushToast(`Sending test pattern to ${d.ip}…`);
                        try {
                          await api.devices.testPattern(d.ip);
                          pushToast(`Test pattern displayed on ${d.ip}`);
                        } catch (e) {
                          pushToast(e instanceof Error ? e.message : 'Test failed — check the IP and network');
                        }
                      }}
                    >
                      Test pattern
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm rounded-none border-0 border-l border-border text-muted"
                      disabled={busy}
                      aria-label={`Remove ${d.name}`}
                      title="Remove"
                      onClick={() => void removeDevice(d)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

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
