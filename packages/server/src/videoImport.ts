import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSquareCoverCropFilter,
  CANVAS_SIZE,
  clampVideoCropFocus,
  DEFAULT_VIDEO_IMPORT_FPS,
  DEFAULT_VIDEO_IMPORT_FRAMES,
  MAX_VIDEO_IMPORT_FRAMES,
  type Frame,
} from '@pixopen/core';
import { importStillImage } from './import.js';

async function ffmpegPath(): Promise<string> {
  try {
    const { default: bin } = await import('ffmpeg-static');
    if (typeof bin === 'string' && bin) return bin;
  } catch {
    // optional dependency
  }
  return 'ffmpeg';
}

export async function importVideo(
  file: Buffer,
  opts?: { maxFrames?: number; fps?: number; startSec?: number; focusX?: number; focusY?: number },
): Promise<{ frames: Frame[]; delays: number[] }> {
  const maxFrames = Math.min(
    MAX_VIDEO_IMPORT_FRAMES,
    Math.max(1, Math.round(opts?.maxFrames ?? DEFAULT_VIDEO_IMPORT_FRAMES)),
  );
  const fps = opts?.fps ?? DEFAULT_VIDEO_IMPORT_FPS;
  const startSec = Math.max(0, opts?.startSec ?? 0);
  const durationSec = maxFrames / fps;
  const delayMs = Math.round(1000 / fps);
  const focus = clampVideoCropFocus(opts?.focusX ?? 0.5, opts?.focusY ?? 0.5);
  const vf = buildSquareCoverCropFilter(CANVAS_SIZE, focus, fps);
  const dir = await mkdtemp(join(tmpdir(), 'pixopen-video-'));
  const input = join(dir, 'input.bin');
  const outPattern = join(dir, 'frame_%03d.png');

  try {
    await writeFile(input, file);
    const bin = await ffmpegPath();
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y',
        '-i',
        input,
        '-ss',
        String(startSec),
        '-t',
        String(durationSec),
        '-vf',
        vf,
        '-frames:v',
        String(maxFrames),
        outPattern,
      ];
      const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      proc.on('error', (err) => reject(err));
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim().slice(-240) || `ffmpeg exited with code ${code}`));
      });
    });

    const files = (await readdir(dir))
      .filter((f) => f.startsWith('frame_') && f.endsWith('.png'))
      .sort();
    const frames: Frame[] = [];
    for (const name of files) {
      const png = await readFile(join(dir, name));
      frames.push(await importStillImage(png));
    }

    if (frames.length === 0) {
      throw new Error('No frames extracted — is ffmpeg installed? Try a shorter clip or different format.');
    }

    return { frames, delays: frames.map(() => delayMs) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function importVideoAvailable(): Promise<boolean> {
  try {
    const bin = await ffmpegPath();
    if (!bin || bin === 'ffmpeg') {
      return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      });
    }
    return true;
  } catch {
    return false;
  }
}
