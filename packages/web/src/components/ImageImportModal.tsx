import { useCallback, useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, type Frame } from '@pixopen/core';
import { NumberSlider } from './NumberSlider';

/** CSS display scale for the 64×64 preview canvas. */
const PREVIEW_SCALE = 6;

export type ImagePlacement = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  merge: 'replace' | 'composite';
  smoothing: boolean;
};

type Props = {
  file: File;
  baseFrame: Frame | null;
  onApply: (frame: Frame) => void;
  onCancel: () => void;
  applyLabel?: string;
  title?: string;
  hint?: string;
};

function renderPlacedImage(
  img: HTMLImageElement,
  placement: ImagePlacement,
  baseFrame: Frame | null,
): Frame {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.imageSmoothingEnabled = placement.smoothing;

  if (placement.merge === 'composite' && baseFrame) {
    const base = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    for (let i = 0; i < baseFrame.pixels.length; i++) base.data[i] = baseFrame.pixels[i];
    ctx.putImageData(base, 0, 0);
  } else {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  const fitScale = Math.min(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
  const drawW = img.naturalWidth * fitScale * placement.zoom;
  const drawH = img.naturalHeight * fitScale * placement.zoom;
  const x = (CANVAS_SIZE - drawW) / 2 + placement.offsetX;
  const y = (CANVAS_SIZE - drawH) / 2 + placement.offsetY;

  ctx.drawImage(img, x, y, drawW, drawH);

  const data = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  return {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    pixels: Array.from(data.data),
  };
}

export function ImageImportModal({
  file,
  baseFrame,
  onApply,
  onCancel,
  applyLabel = 'Apply to current frame',
  title = 'Place image on frame',
  hint = 'Adjust scale and position, then apply to the current frame.',
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [placement, setPlacement] = useState<ImagePlacement>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    merge: 'replace',
    smoothing: false,
  });
  const [previewFrame, setPreviewFrame] = useState<Frame | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const updatePreview = useCallback(() => {
    if (!img) return;
    setPreviewFrame(renderPlacedImage(img, placement, baseFrame));
  }, [img, placement, baseFrame]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !previewFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    for (let i = 0; i < previewFrame.pixels.length; i++) imageData.data[i] = previewFrame.pixels[i];
    ctx.putImageData(imageData, 0, 0);
  }, [previewFrame]);

  const resetPlacement = () => {
    setPlacement((p) => ({ zoom: 1, offsetX: 0, offsetY: 0, merge: p.merge, smoothing: p.smoothing }));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: placement.offsetX,
      oy: placement.offsetY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const dx = (e.clientX - dragStart.current.x) / PREVIEW_SCALE;
    const dy = (e.clientY - dragStart.current.y) / PREVIEW_SCALE;
    setPlacement((p) => ({
      ...p,
      offsetX: Math.round(dragStart.current.ox + dx),
      offsetY: Math.round(dragStart.current.oy + dy),
    }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="image-import-title">
      <div className="modal-panel modal-panel-image-import">
        <header className="image-import-header">
          <div className="image-import-header-copy">
            <h3 id="image-import-title" className="font-bold text-xl m-0">{title}</h3>
            <p className="text-sm text-muted m-0 mt-1">{hint}</p>
            <p className="text-xs text-muted m-0 mt-1 truncate" title={file.name}>{file.name}</p>
          </div>
          <div className="image-import-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!previewFrame}
              onClick={() => previewFrame && onApply(previewFrame)}
            >
              {applyLabel}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetPlacement}>
              Reset
            </button>
          </div>
        </header>

        <div className="image-import-layout">
          <div className="image-import-preview-wrap">
            <canvas
              ref={previewRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="image-import-canvas"
              style={{ width: CANVAS_SIZE * PREVIEW_SCALE, height: CANVAS_SIZE * PREVIEW_SCALE }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            <p className="text-sm text-muted image-import-hint m-0">Drag preview to reposition</p>
          </div>

          <div className="image-import-controls">
            <label className="image-import-field">
              <span className="image-import-field-label">Scale</span>
              <NumberSlider
                min={0.25}
                max={4}
                step={0.05}
                value={placement.zoom}
                formatValue={(v) => `${v.toFixed(2)}×`}
                onChange={(zoom) => setPlacement((p) => ({ ...p, zoom }))}
              />
            </label>

            <label className="image-import-field">
              <span className="image-import-field-label">How to apply</span>
              <select
                className="select"
                value={placement.merge}
                onChange={(e) => setPlacement((p) => ({ ...p, merge: e.target.value as ImagePlacement['merge'] }))}
              >
                <option value="replace">Replace entire frame</option>
                <option value="composite">Layer on top of current frame</option>
              </select>
            </label>

            <label className="checkbox-field image-import-checkbox">
              <input
                type="checkbox"
                className="checkbox"
                checked={placement.smoothing}
                onChange={(e) => setPlacement((p) => ({ ...p, smoothing: e.target.checked }))}
              />
              <span>Smooth edges when scaling</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
