import { useEffect, useRef } from 'react';
import { api } from '../lib/api';

/** Connect automatically when there is exactly one saved or discoverable Pixoo. */
export function useAutoConnectDevice(deviceIp: string, onConnect: (ip: string) => void) {
  const attempted = useRef(false);

  useEffect(() => {
    if (deviceIp || attempted.current) return;
    attempted.current = true;

    void (async () => {
      const saved = await api.devices.list();
      if (saved.length === 1) {
        onConnect(saved[0].ip);
        return;
      }

      try {
        const { discovered } = await api.devices.discover();
        if (discovered.length === 1) {
          onConnect(discovered[0].ip);
        }
      } catch {
        // Discovery unavailable — user can connect manually.
      }
    })();
  }, [deviceIp, onConnect]);
}
