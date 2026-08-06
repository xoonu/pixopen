import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  canPanVideoCrop,
  clampVideoCropFocus,
  coverScaleDimensions,
  cropOffsetPixels,
  cropPanRange,
  DEFAULT_VIDEO_IMPORT_FPS,
  DEFAULT_VIDEO_IMPORT_FRAMES,
  MAX_VIDEO_IMPORT_FRAMES,
} from '@pixopen/core';
import { NumberSlider } from './NumberSlider';

export type VideoImportOptions = {
  maxFrames: number;
  startSec: number;
  focusX: number;
  focusY: number;
};

type Props = {
  file: File;
  onImport: (opts: VideoImportOptions) => void;
  onCancel: () => void;
  importing?: boolean;
};

const CROP_PREVIEW_PX = 280;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoImportModal({ file, onImport, onCancel, importing = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<{ x: number; y: number; focusX: number; focusY: number } | null>(null);

  const [maxFrames, setMaxFrames] = useState(DEFAULT_VIDEO_IMPORT_FRAMES);
  const [startSec, setStartSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [focusX, setFocusX] = useState(0.5);
  const [focusY, setFocusY] = useState(0.5);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const clipSec = maxFrames / DEFAULT_VIDEO_IMPORT_FPS;
  const maxStartSec = Math.max(0, durationSec - clipSec);
  const clampedStartSec = Math.min(startSec, maxStartSec);
  const endSec = clampedStartSec + clipSec;
  const focus = clampVideoCropFocus(focusX, focusY);
  const pannable = canPanVideoCrop(videoWidth, videoHeight);

  const coverLayout = useMemo(() => {
    const scaled = coverScaleDimensions(videoWidth, videoHeight, CROP_PREVIEW_PX);
    const pan = cropPanRange(scaled.width, scaled.height, CROP_PREVIEW_PX);
    const offset = cropOffsetPixels(scaled.width, scaled.height, CROP_PREVIEW_PX, focus);
    return { ...scaled, offsetX: offset.x, offsetY: offset.y, panX: pan.maxX, panY: pan.maxY };
  }, [videoWidth, videoHeight, focus]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setStartSec(0);
    setDurationSec(0);
    setVideoWidth(0);
    setVideoHeight(0);
    setFocusX(0.5);
    setFocusY(0.5);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (startSec > maxStartSec) setStartSec(maxStartSec);
  }, [startSec, maxStartSec]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clampedStartSec;
  }, [clampedStartSec, videoUrl]);

  const handleMetadata = (video: HTMLVideoElement) => {
    setDurationSec(video.duration || 0);
    setVideoWidth(video.videoWidth || 0);
    setVideoHeight(video.videoHeight || 0);
  };

  const applyPanDelta = useCallback(
    (dx: number, dy: number, baseFocusX: number, baseFocusY: number) => {
      const scaled = coverScaleDimensions(videoWidth, videoHeight, CROP_PREVIEW_PX);
      const { maxX, maxY } = cropPanRange(scaled.width, scaled.height, CROP_PREVIEW_PX);
      const next = clampVideoCropFocus(
        maxX > 0 ? baseFocusX - dx / maxX : baseFocusX,
        maxY > 0 ? baseFocusY - dy / maxY : baseFocusY,
      );
      setFocusX(next.focusX);
      setFocusY(next.focusY);
    },
    [videoWidth, videoHeight],
  );

  const onCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pannable || importing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, focusX, focusY };
  };

  const onCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    applyPanDelta(e.clientX - drag.x, e.clientY - drag.y, drag.focusX, drag.focusY);
  };

  const onCropPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const timeline = useMemo(() => {
    if (durationSec <= 0) return { left: 0, width: 0 };
    const left = (clampedStartSec / durationSec) * 100;
    const width = Math.min(100 - left, (clipSec / durationSec) * 100);
    return { left, width };
  }, [clampedStartSec, clipSec, durationSec]);

  const ready = durationSec > 0 && videoWidth > 0 && videoHeight > 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="video-import-title">
      <div className="modal-panel modal-panel-lg p-5 video-import-modal">
        <h3 id="video-import-title" className="font-bold text-lg">Import video clip</h3>
        <p className="text-sm text-muted">
          Choose a section of <strong>{file.name}</strong> and position the square crop on your video.
        </p>

        <div className="video-import-crop-wrap">
          <p className="field-label m-0">Square crop (64×64)</p>
          <div
            className={`video-import-crop-stage${pannable ? ' is-draggable' : ''}`}
            style={{ width: CROP_PREVIEW_PX, height: CROP_PREVIEW_PX }}
            onPointerDown={onCropPointerDown}
            onPointerMove={onCropPointerMove}
            onPointerUp={onCropPointerUp}
            onPointerCancel={onCropPointerUp}
            aria-label={pannable ? 'Drag to position the video crop' : 'Video crop preview'}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="video-import-crop-video"
                muted
                playsInline
                preload="metadata"
                style={{
                  width: coverLayout.width,
                  height: coverLayout.height,
                  transform: `translate(${-coverLayout.offsetX}px, ${-coverLayout.offsetY}px)`,
                }}
                onLoadedMetadata={(e) => handleMetadata(e.currentTarget)}
              />
            ) : null}
            <div className="video-import-crop-frame" aria-hidden />
          </div>
          <p className="text-sm text-muted video-import-hint m-0">
            {ready
              ? pannable
                ? 'Drag to reposition · aspect ratio is preserved in the final frames'
                : 'Square video — no repositioning needed'
              : 'Loading preview…'}
          </p>
        </div>

        <div className="video-import-timeline" aria-hidden={!ready}>
          <div className="video-import-timeline-track">
            <div
              className="video-import-timeline-selection"
              style={{ left: `${timeline.left}%`, width: `${timeline.width}%` }}
            />
          </div>
          <div className="video-import-timeline-labels">
            <span>{formatTime(0)}</span>
            <span>{formatTime(durationSec)}</span>
          </div>
        </div>

        <label className="control-row video-import-length">
          <span className="field-label">Start</span>
          <NumberSlider
            min={0}
            max={maxStartSec || 0}
            step={0.05}
            value={clampedStartSec}
            disabled={importing || !ready}
            formatValue={formatTime}
            onChange={setStartSec}
          />
        </label>

        <label className="control-row video-import-length">
          <span className="field-label">Clip length (frames)</span>
          <NumberSlider
            min={1}
            max={MAX_VIDEO_IMPORT_FRAMES}
            value={maxFrames}
            disabled={importing || !ready}
            onChange={setMaxFrames}
          />
        </label>

        {coverLayout.panX > 0 ? (
          <label className="control-row video-import-length">
            <span className="field-label">Horizontal position</span>
            <NumberSlider
              min={0}
              max={100}
              value={Math.round(focus.focusX * 100)}
              disabled={importing || !ready}
              formatValue={(v) => `${v}%`}
              onChange={(v) => setFocusX(v / 100)}
            />
          </label>
        ) : null}
        {coverLayout.panY > 0 ? (
          <label className="control-row video-import-length">
            <span className="field-label">Vertical position</span>
            <NumberSlider
              min={0}
              max={100}
              value={Math.round(focus.focusY * 100)}
              disabled={importing || !ready}
              formatValue={(v) => `${v}%`}
              onChange={(v) => setFocusY(v / 100)}
            />
          </label>
        ) : null}

        <p className="text-sm text-muted video-import-hint">
          {ready ? (
            <>
              {formatTime(clampedStartSec)} → {formatTime(endSec)} · {maxFrames} frames at{' '}
              {DEFAULT_VIDEO_IMPORT_FPS} fps (~{clipSec.toFixed(1)}s)
            </>
          ) : (
            <>Loading video…</>
          )}
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={importing || !ready}
            onClick={() =>
              onImport({
                maxFrames,
                startSec: clampedStartSec,
                focusX: focus.focusX,
                focusY: focus.focusY,
              })
            }
          >
            {importing ? 'Converting…' : 'Import frames'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={importing} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
