import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, type WeatherSnapshot } from '@pixopen/core';
import { parseWeatherFrameConfig, renderWeatherPreview } from '@pixopen/renderer';
import { api } from '../lib/api';

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

export function WeatherPreview({ appConfig = {}, scale = 6, playing = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const snapshotRef = useRef<WeatherSnapshot | null>(null);
  const [dataHint, setDataHint] = useState('Set a location to load weather');

  configRef.current = appConfig;
  playingRef.current = playing;

  useEffect(() => {
    const config = parseWeatherFrameConfig(configRef.current);
    if (!config.location) {
      snapshotRef.current = null;
      setDataHint('Set a location to load weather');
      return;
    }

    let cancelled = false;
    const load = () => {
      const current = parseWeatherFrameConfig(configRef.current);
      if (!current.location) return;
      void api.weather
        .snapshot(current.location, current.temperatureUnit)
        .then((snapshot) => {
          if (cancelled) return;
          snapshotRef.current = snapshot;
          setDataHint(`Live weather for ${snapshot.location.name}`);
        })
        .catch((err) => {
          if (cancelled) return;
          snapshotRef.current = null;
          setDataHint(err instanceof Error ? err.message : 'Could not load weather');
        });
    };

    load();
    const id = window.setInterval(load, 10 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    JSON.stringify(appConfig.location),
    appConfig.temperatureUnit,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = Date.now();
    let raf = 0;

    const draw = () => {
      const elapsed = playingRef.current ? Date.now() - start : 0;
      const frame = renderWeatherPreview(configRef.current, snapshotRef.current, elapsed);
      putFramePixels(ctx, frame.pixels);
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="weather-frame-preview-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`weather-frame-preview-canvas ${className}`.trim()}
        style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
        aria-label="Weather preview"
      />
      <p className="muted weather-frame-data-hint">{dataHint}</p>
    </div>
  );
}
