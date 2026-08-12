import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, weatherFrameLocations, type WeatherSnapshot } from '@pixopen/core';
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

function locationsKey(appConfig: Record<string, unknown>): string {
  const config = parseWeatherFrameConfig(appConfig);
  return JSON.stringify({
    locations: weatherFrameLocations(config).map((loc) => ({
      lat: loc.lat,
      lon: loc.lon,
      name: loc.name,
    })),
    unit: config.temperatureUnit,
  });
}

export function WeatherPreview({ appConfig = {}, scale = 6, playing = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const snapshotsRef = useRef<WeatherSnapshot[]>([]);
  const [dataHint, setDataHint] = useState('Add a location to load weather');
  const locKey = locationsKey(appConfig);

  configRef.current = appConfig;
  playingRef.current = playing;

  useEffect(() => {
    const config = parseWeatherFrameConfig(configRef.current);
    const locations = weatherFrameLocations(config);
    if (locations.length === 0) {
      snapshotsRef.current = [];
      setDataHint('Add a location to load weather');
      return;
    }

    let cancelled = false;
    const load = () => {
      const current = parseWeatherFrameConfig(configRef.current);
      const locs = weatherFrameLocations(current);
      if (locs.length === 0) return;
      void Promise.all(locs.map((loc) => api.weather.snapshot(loc, current.temperatureUnit)))
        .then((snapshots) => {
          if (cancelled) return;
          snapshotsRef.current = snapshots;
          const names = snapshots.map((s) => s.location.name).join(' · ');
          setDataHint(
            snapshots.length === 1
              ? `Live weather for ${names}`
              : `Cycling ${snapshots.length} places · ${names}`,
          );
        })
        .catch((err) => {
          if (cancelled) return;
          snapshotsRef.current = [];
          setDataHint(err instanceof Error ? err.message : 'Could not load weather');
        });
    };

    load();
    const id = window.setInterval(load, 10 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [locKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = Date.now();
    let raf = 0;

    const draw = () => {
      const elapsed = playingRef.current ? Date.now() - start : 0;
      const frame = renderWeatherPreview(configRef.current, snapshotsRef.current, elapsed);
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
