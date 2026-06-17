import { networkInterfaces } from 'node:os';

export function localIpv4Addresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((n) => n?.family === 'IPv4' && !n.internal)
    .map((n) => n!.address);
}

export function subnetMismatchHint(deviceIp: string): string | undefined {
  const parts = deviceIp.trim().split('.');
  if (parts.length !== 4) return undefined;
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const local = localIpv4Addresses();
  if (local.length === 0) return undefined;
  const sameSubnet = local.some((ip) => ip.startsWith(`${prefix}.`));
  if (sameSubnet) return undefined;
  return `Your computer is on ${local.join(' / ')} but the Pixoo is ${deviceIp}. They're on different networks or subnets — use the same Wi‑Fi (not guest/IoT) for both.`;
}
