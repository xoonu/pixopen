import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, type AiMuseSnapshot } from '@pixopen/core';
import { renderAiMusePreview } from '@pixopen/renderer';
import { api } from '../lib/api';

type Props = {
  projectId?: string;
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

function hintFor(snapshot: AiMuseSnapshot | null, feedLen: number, fallback: string): string {
  if (!snapshot) return fallback;
  if (snapshot.error) return snapshot.error;
  if (snapshot.imageId) {
    if (feedLen > 0) {
      return `Feed ${feedLen} · cycling playlist`;
    }
    return `Pool ${snapshot.poolSize} · pulled ${snapshot.candidateCount} · ${snapshot.matchCount} matched prefs`;
  }
  return fallback;
}

export function AiMusePreview({
  projectId,
  appConfig = {},
  scale = 6,
  playing = true,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const snapshotRef = useRef<AiMuseSnapshot | null>(null);
  const [dataHint, setDataHint] = useState('Loading AI Muse feed…');

  configRef.current = appConfig;
  playingRef.current = playing;

  const settingsKey = Array.isArray(appConfig.settings) ? appConfig.settings.join('|') : '';
  const ethnicitiesKey = Array.isArray(appConfig.ethnicities)
    ? appConfig.ethnicities.join('|')
    : String(appConfig.ethnicity ?? '');
  const feedKey = Array.isArray(appConfig.feed)
    ? appConfig.feed.map((item) => (item && typeof item === 'object' && 'id' in item ? String((item as { id: unknown }).id) : '')).join('|')
    : '';
  const refreshSeconds = Number(appConfig.refreshSeconds ?? 10);
  const poolSize = Number(appConfig.poolSize ?? 24);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void api.aiMuse
        .snapshot(projectId ?? 'preview', configRef.current)
        .then((snapshot) => {
          if (cancelled) return;
          snapshotRef.current = snapshot;
          const len = Array.isArray(configRef.current.feed) ? configRef.current.feed.length : 0;
          setDataHint(hintFor(snapshot, len, 'AI Muse'));
        })
        .catch((err) => {
          if (cancelled) return;
          snapshotRef.current = null;
          setDataHint(err instanceof Error ? err.message : 'Could not load AI Muse');
        });
    };

    load();
    const intervalMs = Math.max(5, Number.isFinite(refreshSeconds) ? refreshSeconds : 10) * 1000;
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    projectId,
    appConfig.ageMin,
    appConfig.ageMax,
    ethnicitiesKey,
    appConfig.eyeColor,
    appConfig.hairColor,
    appConfig.hairLength,
    settingsKey,
    feedKey,
    refreshSeconds,
    poolSize,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      if (playingRef.current || !snapshotRef.current) {
        const frame = renderAiMusePreview(configRef.current, snapshotRef.current);
        putFramePixels(ctx, frame.pixels);
      }
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="ai-muse-preview-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
        className={`ai-muse-preview-canvas ${className}`.trim()}
      />
      <p className="muted ai-muse-data-hint">{dataHint}</p>
    </div>
  );
}
