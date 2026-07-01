import { Canvas, Channel, PixooClient, unwrap, type PixooFailure } from '@cyanheads/pixoo-toolkit';
import type { Frame, SavedDevice } from '@pixopen/core';
import { formatPixooError, formatPixooResult } from './errors.js';
import { subnetMismatchHint } from './network.js';

export { formatPixooError, formatPixooResult } from './errors.js';
export { localIpv4Addresses, subnetMismatchHint } from './network.js';

const DISCOVERY_URL = 'https://app.divoom-gz.com/Device/ReturnSameLANDevice';

export type DiscoveredDevice = {
  deviceName: string;
  deviceId: number;
  devicePrivateIp: string;
};

export async function discoverDevices(): Promise<SavedDevice[]> {
  const response = await fetch(DISCOVERY_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Discovery failed: HTTP ${response.status}`);
  const data = (await response.json()) as {
    DeviceList?: Array<{
      DeviceName?: string;
      DeviceId?: number;
      DevicePrivateIP?: string;
    }>;
  };
  const list = data.DeviceList ?? [];
  return list
    .filter((d) => d.DevicePrivateIP)
    .map((d) => ({
      id: String(d.DeviceId ?? d.DevicePrivateIP),
      name: d.DeviceName ?? 'Pixoo',
      ip: d.DevicePrivateIP!,
      source: 'discovered' as const,
      lastSeenAt: new Date().toISOString(),
    }));
}

export function createClient(ip: string): PixooClient {
  return new PixooClient(ip.trim(), { timeout: 8000, retries: 1, retryDelay: 400 });
}

function throwIfFailed(result: PixooFailure | { ok: true }, ip: string): void {
  if (!result.ok) throw new Error(formatPixooResult(result, ip));
}

async function prepareCustomDisplay(ip: string): Promise<PixooClient> {
  const client = createClient(ip);
  unwrap(await client.setScreen(true));
  const channel = await client.setChannel(Channel.Custom);
  throwIfFailed(channel, ip);
  return client;
}

/** Pixoo reboots if SendHttpGif frames arrive too quickly — do not lower. */
const MIN_STREAM_PUSH_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendStreamFrame(client: PixooClient, canvas: Canvas, picId: number, ip: string): Promise<number> {
  const nextPicId = (picId + 1) % 10000;
  const pushed = await client.send('Draw/SendHttpGif', {
    PicNum: 1,
    PicWidth: canvas.width,
    PicOffset: 0,
    PicID: nextPicId,
    PicSpeed: 100,
    PicData: canvas.toBase64(),
  });
  throwIfFailed(pushed, ip);
  return nextPicId;
}

export type PixooStream = {
  push: (frame: Frame) => Promise<void>;
};

/** Open a persistent Custom-channel session for repeated frame pushes (live frames). */
export async function openPixooStream(ip: string): Promise<PixooStream> {
  const trimmed = ip.trim();
  const client = await prepareCustomDisplay(trimmed);
  // Reset once when opening the stream — not before every frame (that reboots/overloads the device).
  throwIfFailed(await client.resetGifId(), trimmed);
  let picId = Date.now() % 10000;
  let lastPushFinishedAt = 0;

  return {
    async push(frame: Frame) {
      const elapsed = Date.now() - lastPushFinishedAt;
      if (elapsed < MIN_STREAM_PUSH_MS) {
        await sleep(MIN_STREAM_PUSH_MS - elapsed);
      }
      try {
        const canvas = frameToCanvas(frame);
        picId = await sendStreamFrame(client, canvas, picId, trimmed);
      } finally {
        lastPushFinishedAt = Date.now();
      }
    },
  };
}

export async function checkDevice(ip: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = ip.trim();
  if (!trimmed) return { ok: false, error: 'No Pixoo IP provided' };
  const mismatch = subnetMismatchHint(trimmed);
  try {
    const client = createClient(trimmed);
    const result = await client.getChannel();
    if (!result.ok) {
      const base = formatPixooResult(result, trimmed);
      return { ok: false, error: mismatch ? `${base} ${mismatch}` : base };
    }
    return { ok: true };
  } catch (e) {
    const base = formatPixooError(e instanceof Error ? e.message : 'Unreachable', trimmed);
    return { ok: false, error: mismatch ? `${base} ${mismatch}` : base };
  }
}

export async function pingDevice(ip: string): Promise<boolean> {
  const result = await checkDevice(ip);
  return result.ok;
}

export async function prepareCustomChannel(ip: string): Promise<void> {
  const client = createClient(ip);
  unwrap(await client.setChannel(Channel.Custom));
}

export async function setBrightness(ip: string, brightness: number): Promise<void> {
  const client = createClient(ip);
  unwrap(await client.setBrightness(brightness));
}

export async function pushTestPattern(ip: string): Promise<void> {
  const client = await prepareCustomDisplay(ip);
  const canvas = new Canvas();
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const r = Math.floor((x / 63) * 255);
      const g = Math.floor((y / 63) * 255);
      const b = 128;
      canvas.setPixel(x, y, [r, g, b]);
    }
  }
  const pushed = await client.push(canvas);
  throwIfFailed(pushed, ip);
}

export function frameToCanvas(frame: Frame): Canvas {
  const canvas = new Canvas();
  const { pixels } = frame;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const i = (y * 64 + x) * 4;
      canvas.setPixel(x, y, [pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  }
  return canvas;
}

export async function pushFrame(ip: string, frame: Frame): Promise<void> {
  const client = await prepareCustomDisplay(ip);
  const canvas = frameToCanvas(frame);
  const pushed = await client.push(canvas);
  throwIfFailed(pushed, ip);
}

export async function pushAnimation(
  ip: string,
  frames: Frame[],
  frameDurationMs: number,
): Promise<void> {
  const client = await prepareCustomDisplay(ip);
  const canvases = frames.map(frameToCanvas);
  const pushed = await client.pushAnimation(canvases, frameDurationMs);
  throwIfFailed(pushed, ip);
}

export async function proxyCommand(ip: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`http://${ip}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  return response.json();
}
