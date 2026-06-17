import { CANVAS_SIZE, createEmptyFrame, type Frame } from '@pixopen/core';
import sharp from 'sharp';

function bufferToFrame(buffer: Buffer): Frame {
  const frame = createEmptyFrame();
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const i = (y * CANVAS_SIZE + x) * 4;
      frame.pixels[i] = buffer[i];
      frame.pixels[i + 1] = buffer[i + 1];
      frame.pixels[i + 2] = buffer[i + 2];
      frame.pixels[i + 3] = buffer[i + 3];
    }
  }
  return frame;
}

export async function importStillImage(file: Buffer): Promise<Frame> {
  const resized = await sharp(file)
    .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: 'cover', kernel: sharp.kernel.nearest })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return bufferToFrame(resized);
}

export async function importGif(file: Buffer): Promise<{ frames: Frame[]; delays: number[] }> {
  const gifFrames = (await import('gif-frames')).default;
  const results = await gifFrames({ url: file, frames: 'all', outputType: 'png', cumulative: true });
  const frames: Frame[] = [];
  const delays: number[] = [];

  for (const frame of results) {
    const stream = frame.getImage();
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });
    const png = Buffer.concat(chunks);
    frames.push(await importStillImage(png));
    delays.push(Math.max(50, (frame.frameInfo.delay ?? 10) * 10));
  }

  if (frames.length === 0) {
    frames.push(createEmptyFrame());
    delays.push(500);
  }

  return { frames, delays };
}
