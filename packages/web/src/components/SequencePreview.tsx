import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame } from '@pixopen/core';
import { PixelPreview } from './PixelPreview';
import { Icon, icons } from './icons';

type Props = {
  frames: Frame[];
  frameDurationMs: number;
  loop: boolean;
  scale?: number;
  compact?: boolean;
  hideDisplay?: boolean;
  livePixels?: number[] | null;
  liveActive?: boolean;
  editorFrameIndex?: number;
  onFrameChange?: (index: number) => void;
};

export function SequencePreview({
  frames,
  frameDurationMs,
  loop,
  scale,
  compact = false,
  hideDisplay = false,
  livePixels = null,
  liveActive = false,
  editorFrameIndex,
  onFrameChange,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  const frameCount = frames.length;
  const duration = Math.max(50, frameDurationMs);

  const setPreviewIndex = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(frameCount - 1, next));
      indexRef.current = clamped;
      setIndex(clamped);
      onFrameChange?.(clamped);
    },
    [frameCount, onFrameChange],
  );

  useEffect(() => {
    if (liveActive) setPlaying(false);
  }, [liveActive]);

  useEffect(() => {
    if (playing || editorFrameIndex == null) return;
    const clamped = Math.max(0, Math.min(frameCount - 1, editorFrameIndex));
    indexRef.current = clamped;
    setIndex(clamped);
  }, [editorFrameIndex, playing, frameCount]);

  useEffect(() => {
    if (index >= frameCount) setPreviewIndex(Math.max(0, frameCount - 1));
  }, [frameCount, index, setPreviewIndex]);

  useEffect(() => {
    if (!playing || liveActive || frameCount < 2) return;

    const id = window.setInterval(() => {
      const current = indexRef.current;
      const atEnd = current >= frameCount - 1;
      if (atEnd) {
        if (loop) setPreviewIndex(0);
        else setPlaying(false);
        return;
      }
      setPreviewIndex(current + 1);
    }, duration);

    return () => window.clearInterval(id);
  }, [playing, liveActive, frameCount, loop, duration, setPreviewIndex]);

  const showLive = liveActive && livePixels;
  const currentFrame = frames[index] ?? null;
  const canAnimate = frameCount > 1 && !showLive;
  const previewScale = scale ?? (compact ? 3 : 4);

  return (
    <div className={`sequence-preview${compact ? ' sequence-preview-compact' : ''}${hideDisplay ? ' sequence-preview-controls-only' : ''}`}>
      {!hideDisplay ? (
        <div className="sequence-preview-display">
          {showLive ? (
            <PixelPreview frame={null} pixels={livePixels} scale={previewScale} />
          ) : (
            <PixelPreview frame={currentFrame} scale={previewScale} />
          )}
          {showLive && <span className="badge badge-live sequence-live-badge">Live</span>}
        </div>
      ) : null}

      {canAnimate && (
        <div className="sequence-controls">
          <div className="sequence-toolbar">
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1.5"
              onClick={() => setPlaying((p) => !p)}
            >
              <Icon icon={playing ? icons.pause : icons.play} size={16} />
              {playing ? (compact ? 'Pause' : 'Pause playback') : (compact ? 'Play' : 'Play animation')}
            </button>
            {!compact && (
              <>
                <button type="button" onClick={() => { setPlaying(false); setPreviewIndex(index - 1); }} disabled={index <= 0}>
                  Previous frame
                </button>
                <button
                  type="button"
                  onClick={() => { setPlaying(false); setPreviewIndex(index + 1); }}
                  disabled={index >= frameCount - 1}
                >
                  Next frame
                </button>
                <button type="button" onClick={() => { setPlaying(false); setPreviewIndex(0); }}>
                  Back to start
                </button>
              </>
            )}
            {compact && (
              <>
                <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={() => { setPlaying(false); setPreviewIndex(index - 1); }} disabled={index <= 0} aria-label="Previous frame">
                  <Icon icon={icons.arrowLeft} size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => { setPlaying(false); setPreviewIndex(index + 1); }}
                  disabled={index >= frameCount - 1}
                  aria-label="Next frame"
                >
                  <Icon icon={icons.arrowRight} size={16} />
                </button>
              </>
            )}
          </div>

          <label className="sequence-scrub">
            {!compact && <span className="field-label">Scrub timeline</span>}
            <input
              type="range"
              min={0}
              max={Math.max(0, frameCount - 1)}
              value={index}
              onChange={(e) => {
                setPlaying(false);
                setPreviewIndex(Number(e.target.value));
              }}
            />
            <span className="muted sequence-frame-label">
              {index + 1}/{frameCount}
              {!compact && (
                <>
                  {' · '}{duration} ms per frame
                  {loop ? ' · loops' : ' · plays once'}
                </>
              )}
            </span>
          </label>
        </div>
      )}

      {!canAnimate && !showLive && !compact && (
        <p className="muted sequence-hint">
          {frameCount <= 1
            ? 'Add another frame to preview how the animation will play.'
            : 'Single-frame preview'}
        </p>
      )}

      {showLive && !compact && (
        <p className="muted sequence-hint">Streaming live output from your Pixoo.</p>
      )}
    </div>
  );
}
