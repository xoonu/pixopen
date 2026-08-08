import { useEffect, useRef } from 'react';
import { CANVAS_SIZE } from '@pixopen/core';
import { parseOnAirConfig, renderOnAirBoard } from '@pixopen/renderer';

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

export function OnAirPreview({
  appConfig = {},
  scale = 6,
  playing = true,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const startedAtRef = useRef(Date.now());

  configRef.current = appConfig;
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;

    const draw = () => {
      const config = parseOnAirConfig(configRef.current);
      const elapsedMs = playingRef.current ? Date.now() - startedAtRef.current : 0;
      const frame = renderOnAirBoard(config, elapsedMs);
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
      className={`on-air-preview-canvas ${className}`.trim()}
      style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
      aria-label="On Air preview"
    />
  );
}
