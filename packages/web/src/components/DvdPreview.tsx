import { useEffect, useRef } from 'react';
import { CANVAS_SIZE } from '@pixopen/core';
import { parseDvdScreensaverConfig, renderDvdScreensaverPreview, simulateDvd, dvdEffectiveSimConfig } from '@pixopen/renderer';

type Props = {
  appConfig?: Record<string, unknown>;
  scale?: number;
  playing?: boolean;
  className?: string;
  onCornerHitsChange?: (hits: number) => void;
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

export function DvdPreview({
  appConfig = {},
  scale = 6,
  playing = true,
  className = '',
  onCornerHitsChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const onCornerHitsRef = useRef(onCornerHitsChange);

  configRef.current = appConfig;
  playingRef.current = playing;
  onCornerHitsRef.current = onCornerHitsChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = Date.now();
    let raf = 0;
    let lastHits = -1;

    const draw = () => {
      const elapsed = playingRef.current ? Date.now() - start : 0;
      const config = parseDvdScreensaverConfig(configRef.current);
      const frame = renderDvdScreensaverPreview(configRef.current, elapsed);
      putFramePixels(ctx, frame.pixels);

      const hits = simulateDvd(dvdEffectiveSimConfig(config), elapsed).cornerHits;
      if (hits !== lastHits) {
        lastHits = hits;
        onCornerHitsRef.current?.(hits);
      }

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
      className={`dvd-screensaver-preview-canvas ${className}`.trim()}
      style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
      aria-label="DVD screensaver preview"
    />
  );
}
