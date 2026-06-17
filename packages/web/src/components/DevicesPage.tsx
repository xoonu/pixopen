import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../lib/api';

export function DevicesPage({ selectedIp, onSelect }: { selectedIp: string; onSelect: (ip: string) => void }) {
  const [devices, setDevices] = useState<SavedDevice[]>([]);
  const [status, setStatus] = useState('');

  const refresh = async () => {
    setDevices(await api.devices.list());
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <div>
      <div className="panel">
        <h2>Pixoo devices</h2>
        <p className="muted">Discover and manage devices from the sidebar. Select a target Pixoo for deployment.</p>
        {status && <p className="status-banner muted">{status}</p>}
      </div>

      <div className="panel">
        <h3>Your devices</h3>
        {devices.length === 0 && <p className="muted">No Pixoo devices added yet.</p>}
        {devices.map((d) => (
          <div key={d.id} className="device-row">
            <button
              type="button"
              className={selectedIp === d.ip ? 'primary' : ''}
              onClick={() => onSelect(d.ip)}
              title="Use this Pixoo when deploying from Studio"
            >
              {selectedIp === d.ip ? '✓ ' : ''}{d.name} ({d.ip})
            </button>
            <button type="button" onClick={async () => {
              setStatus(`Sending test pattern to ${d.ip}…`);
              try {
                await api.devices.testPattern(d.ip);
                setStatus(`Test pattern displayed on ${d.ip}`);
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Test failed — check the IP and network');
              }
            }}>
              Send test pattern
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
