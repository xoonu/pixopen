import { useEffect, useRef } from 'react';
import { CANVAS_SIZE } from '@pixopen/core';
import { parseFlipNoteConfig, renderFlipNotePreview } from '@pixopen/renderer';

type Props = {
  appConfig?: Record<string, unknown>;
  scale?: number;
  playing?: boolean;
  className?: string;
};

function putFramePixels(ctx: CanvasRenderingContext2D, pixels: number[]) {
  const data = new Uint8ClampedArray(pixels);
  try {
    ctx.putImageData(new ImageData(data, CANVAS_SIZE, CANVAS_SIZE), 0, 0);
  } catch {
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
  }
}

export function FlipNotePreview({ appConfig = {}, scale = 6, playing = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  configRef.current = appConfig;
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = Date.now();
    let raf = 0;

    const draw = () => {
      const config = parseFlipNoteConfig(configRef.current);
      const elapsed = playingRef.current ? Date.now() - start : 0;
      const frame = renderFlipNotePreview(config, elapsed);
      putFramePixels(ctx, frame.pixels);
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className={`flip-note-preview-canvas ${className}`.trim()}
      style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
      aria-label="Flip Note board preview"
    />
  );
}
