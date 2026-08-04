import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, type SpotifyNowPlayingSnapshot } from '@pixopen/core';
import { renderSpotifyNowPlayingPreview } from '@pixopen/renderer';
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

function sourceHint(snapshot: SpotifyNowPlayingSnapshot | null, fallback: string): string {
  if (!snapshot) return fallback;
  if (snapshot.error) return snapshot.error;
  if (snapshot.source === 'playing') {
    return snapshot.trackName
      ? `Now playing: ${snapshot.trackName}${snapshot.artistName ? ` — ${snapshot.artistName}` : ''}`
      : 'Now playing';
  }
  if (snapshot.source === 'recent') {
    return snapshot.trackName
      ? `Recently played: ${snapshot.trackName}${snapshot.artistName ? ` — ${snapshot.artistName}` : ''}`
      : 'Recently played';
  }
  if (snapshot.source === 'logo') return 'Spotify logo (no recent track yet)';
  return fallback;
}

export function SpotifyPreview({ appConfig = {}, scale = 6, playing = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const snapshotRef = useRef<SpotifyNowPlayingSnapshot | null>(null);
  const [dataHint, setDataHint] = useState('Loading Spotify…');

  configRef.current = appConfig;
  playingRef.current = playing;

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void api.spotify
        .nowPlaying()
        .then((snapshot) => {
          if (cancelled) return;
          snapshotRef.current = snapshot;
          setDataHint(sourceHint(snapshot, 'Spotify'));
        })
        .catch((err) => {
          if (cancelled) return;
          snapshotRef.current = null;
          setDataHint(err instanceof Error ? err.message : 'Could not load Spotify');
        });
    };

    load();
    const id = window.setInterval(load, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      if (playingRef.current || !snapshotRef.current) {
        const frame = renderSpotifyNowPlayingPreview(configRef.current, snapshotRef.current);
        putFramePixels(ctx, frame.pixels);
      }
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="spotify-now-playing-preview-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`spotify-now-playing-preview-canvas ${className}`.trim()}
        style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
        aria-label="Spotify preview"
      />
      <p className="muted spotify-now-playing-data-hint">{dataHint}</p>
    </div>
  );
}
