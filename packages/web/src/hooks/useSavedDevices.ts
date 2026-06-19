import { useEffect, useState } from 'react';
import type { SavedDevice } from '@pixopen/core';
import { api } from '../lib/api';

export function useSavedDevices(refreshKey: unknown = 0) {
  const [devices, setDevices] = useState<SavedDevice[]>([]);

  useEffect(() => {
    void api.devices.list().then(setDevices);
  }, [refreshKey]);

  return devices;
}
