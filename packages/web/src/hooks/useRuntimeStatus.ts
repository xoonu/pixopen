import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export type RuntimeStatus =
  | { running: false }
  | { running: true; projectId: string; deviceIp: string; lastError?: string | null };

export function useRuntimeStatus(pollMs = 2000) {
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({ running: false });

  const refreshRuntimeStatus = useCallback(() => {
    void api.runtime.status().then((s) => {
      if (s.running && s.projectId) {
        setRuntimeStatus({
          running: true,
          projectId: s.projectId,
          deviceIp: s.deviceIp ?? '',
          lastError: s.lastError ?? null,
        });
      } else {
        setRuntimeStatus({ running: false });
      }
    });
  }, []);

  useEffect(() => {
    refreshRuntimeStatus();
    const id = window.setInterval(refreshRuntimeStatus, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refreshRuntimeStatus]);

  return { runtimeStatus, refreshRuntimeStatus };
}
