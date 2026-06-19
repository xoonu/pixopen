import type { SavedDevice } from '@pixopen/core';

export function findDeviceByIp(devices: SavedDevice[], ip: string): SavedDevice | undefined {
  const trimmed = ip.trim();
  if (!trimmed) return undefined;
  return devices.find((d) => d.ip === trimmed);
}

function isDistinctDeviceName(name: string, ip: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === ip) return false;
  return trimmed.toLowerCase() !== 'pixoo';
}

/** Prefer the device name when it is more specific than the IP alone. */
export function deviceDisplayLabel(devices: SavedDevice[], ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return '';
  const device = findDeviceByIp(devices, trimmed);
  if (device && isDistinctDeviceName(device.name, trimmed)) return device.name.trim();
  return trimmed;
}

/** Tooltip text — include IP when the visible label is a device name. */
export function deviceDisplayTitle(devices: SavedDevice[], ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return '';
  const label = deviceDisplayLabel(devices, trimmed);
  return label !== trimmed ? trimmed : label;
}
