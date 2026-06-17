import type { PixooFailure } from '@cyanheads/pixoo-toolkit';

export function formatPixooError(message: string, ip?: string): string {
  const trimmed = message.trim();
  const target = ip ? ` at ${ip}` : '';

  if (/\[network\]/i.test(trimmed) || /fetch failed/i.test(trimmed)) {
    return `Can't reach your Pixoo${target}. Make sure it's powered on, on the same Wi‑Fi as this computer, and run Search network again for a fresh IP.`;
  }
  if (/\[timeout\]/i.test(trimmed)) {
    return `Pixoo${target} didn't respond in time. Wake the display and confirm the IP under Devices.`;
  }
  if (/\[device\]/i.test(trimmed)) {
    return trimmed.replace(/^\[device\]\s*/i, 'Pixoo rejected the command: ');
  }
  return trimmed.replace(/^\[(network|timeout|http|device)\]\s*/i, '');
}

export function formatPixooResult(result: PixooFailure, ip?: string): string {
  return formatPixooError(`[${result.kind}] ${result.message}`, ip);
}
