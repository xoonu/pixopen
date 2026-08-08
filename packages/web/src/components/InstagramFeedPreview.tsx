import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, type InstagramFeedSnapshot } from '@pixopen/core';
import { renderInstagramFeedPreview } from '@pixopen/renderer';
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

function hintFor(snapshot: InstagramFeedSnapshot | null, feedLen: number, fallback: string): string {
  if (!snapshot) return fallback;
  if (snapshot.error) return snapshot.error;
  if (snapshot.imageId) {
    const who = snapshot.username ? `@${snapshot.username}` : 'feed';
    return `${who} · ${feedLen} image${feedLen === 1 ? '' : 's'} in playlist`;
  }
  return fallback;
}

export function InstagramFeedPreview({
  projectId,
  appConfig = {},
  scale = 6,
  playing = true,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const snapshotRef = useRef<InstagramFeedSnapshot | null>(null);
  const [dataHint, setDataHint] = useState('Loading Instagram feed…');

  configRef.current = appConfig;
  playingRef.current = playing;

  const feedKey = Array.isArray(appConfig.feed)
    ? appConfig.feed
        .map((item) => (item && typeof item === 'object' && 'id' in item ? String((item as { id: unknown }).id) : ''))
        .join('|')
    : '';
  const accountsKey = Array.isArray(appConfig.accounts)
    ? appConfig.accounts.map(String).join('|')
    : '';
  const refreshSeconds = Number(appConfig.refreshSeconds ?? 10);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void api.instagramFeed
        .snapshot(projectId ?? 'preview', configRef.current)
        .then((snapshot) => {
          if (cancelled) return;
          snapshotRef.current = snapshot;
          const len = Array.isArray(configRef.current.feed) ? configRef.current.feed.length : 0;
          setDataHint(hintFor(snapshot, len, 'Instagram Feed'));
        })
        .catch((err) => {
          if (cancelled) return;
          snapshotRef.current = null;
          setDataHint(err instanceof Error ? err.message : 'Could not load Instagram feed');
        });
    };

    load();
    const intervalMs = Math.max(5, Number.isFinite(refreshSeconds) ? refreshSeconds : 10) * 1000;
    const id = window.setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [projectId, feedKey, accountsKey, refreshSeconds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const draw = () => {
      if (playingRef.current || !snapshotRef.current) {
        const frame = renderInstagramFeedPreview(configRef.current, snapshotRef.current);
        putFramePixels(ctx, frame.pixels);
      }
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="instagram-feed-preview-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
        className={`instagram-feed-preview-canvas ${className}`.trim()}
      />
      <p className="muted instagram-feed-data-hint">{dataHint}</p>
    </div>
  );
}
