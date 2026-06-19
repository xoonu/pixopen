import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../lib/api';
import { DevicePicker } from './DevicePicker';
import { deviceDisplayLabel } from '../lib/deviceLabel';

export function DevicesPage({ selectedIp, onSelect }: { selectedIp: string; onSelect: (ip: string) => void }) {
  const [devices, setDevices] = useState<SavedDevice[]>([]);
  const [status, setStatus] = useState('');

  const refresh = async () => {
    setDevices(await api.devices.list());
  };

  useEffect(() => { void refresh(); }, []);

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
              onStatus={setStatus}
            />
            {selectedIp ? (
              <button
                type="button"
                className="btn btn-outline btn-sm w-full mt-2"
                onClick={async () => {
                  const label = deviceDisplayLabel(devices, selectedIp);
                  setStatus(`Checking ${label}…`);
                  try {
                    const result = await api.devices.ping(selectedIp);
                    if (result.ok) setStatus(`Connected to Pixoo at ${label}`);
                    else setStatus(result.error);
                  } catch (e) {
                    setStatus(e instanceof Error ? e.message : 'Connection check failed');
                  }
                }}
              >
                Test connection
              </button>
            ) : null}
            {status ? <p className="text-sm text-muted mt-2">{status}</p> : null}
          </div>
        </section>

        <section className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-3">Saved devices</h3>
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
                      onClick={async () => {
                        setStatus(`Sending test pattern to ${d.ip}…`);
                        try {
                          await api.devices.testPattern(d.ip);
                          setStatus(`Test pattern displayed on ${d.ip}`);
                        } catch (e) {
                          setStatus(e instanceof Error ? e.message : 'Test failed — check the IP and network');
                        }
                      }}
                    >
                      Test pattern
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
