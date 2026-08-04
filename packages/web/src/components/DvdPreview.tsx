import { useEffect, useRef } from 'react';
import { CANVAS_SIZE } from '@pixopen/core';
import {
  parseDvdScreensaverConfig,
  renderDvdScreensaverFromSimulator,
  DvdSimulator,
  dvdEffectiveSimConfig,
} from '@pixopen/renderer';

type Props = {
  appConfig?: Record<string, unknown>;
  scale?: number;
  playing?: boolean;
  className?: string;
  onCornerHitsChange?: (hits: number) => void;
};

const PREVIEW_SLEEP_GAP_MS = 5_000;
const PREVIEW_MAX_ADVANCE_MS = 100;

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
  const simRef = useRef<DvdSimulator | null>(null);
  const simKeyRef = useRef('');
  const lastFrameAtRef = useRef(0);

  configRef.current = appConfig;
  playingRef.current = playing;
  onCornerHitsRef.current = onCornerHitsChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let lastHits = -1;

    const draw = () => {
      const now = Date.now();
      const config = parseDvdScreensaverConfig(configRef.current);
      const simConfig = dvdEffectiveSimConfig(config);
      const simKey = `${simConfig.seed}|${simConfig.speedPxPerSec}|${simConfig.logoScale}|${simConfig.cornerSensitivity}`;

      if (!simRef.current || simKeyRef.current !== simKey) {
        simRef.current = new DvdSimulator(simConfig);
        simKeyRef.current = simKey;
        lastFrameAtRef.current = 0;
      }

      if (playingRef.current) {
        const gap = lastFrameAtRef.current > 0 ? now - lastFrameAtRef.current : 16;
        lastFrameAtRef.current = now;
        const delta = gap > PREVIEW_SLEEP_GAP_MS ? 16 : Math.min(Math.max(gap, 16), PREVIEW_MAX_ADVANCE_MS);
        simRef.current.advanceBy(delta);
      }

      const frame = renderDvdScreensaverFromSimulator(config, simRef.current);
      putFramePixels(ctx, frame.pixels);

      const hits = simRef.current.getState().cornerHits;
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
