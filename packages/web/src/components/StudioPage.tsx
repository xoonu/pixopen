import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, clampRect, createEmptyFrame, shouldUseVestaNoteUi, type Frame, type LiveArea, type Project, type Rect } from '@pixopen/core';
import { api } from '../lib/api';
import { ControlSection, Field } from './ControlSection';
import { EditorToolBar } from './EditorToolbar';
import { ImageImportModal } from './ImageImportModal';
import { VestaNoteStudio } from './VestaNoteStudio';
import { cloneProject, frameToImageData, useStudio } from '../studio/StudioProvider';

export function StudioPage() {
  const studio = useStudio();
  const {
    project,
    frameIndex,
    setFrameIndex,
    frameCount,
    currentFrame,
    tool,
    setTool,
    color,
    setColor,
    editorZoom,
    setEditorZoom,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    drawingTools,
    datasources,
    liveDraft,
    setLiveDraft,
    setLiveRegionPreview,
    importImageFile,
    setImportImageFile,
    imageInputRef,
    gifInputRef,
    canvasRef,
    thumbs,
    updateFrame,
    applyProject,
    addBlankFrame,
    duplicateCurrentFrame,
    removeCurrentFrame,
    reorderFrame,
    getPos,
    floodFill,
    paint,
    commitStroke,
    strokeSnapshot,
    strokeChanged,
    drawing,
    setStatus,
    cloneProject,
    setProject,
  } = studio;

  const liveDragStart = useRef<{ x: number; y: number } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const slideshowInputRef = useRef<HTMLInputElement>(null);
  const [videoAvailable, setVideoAvailable] = useState(false);

  useEffect(() => {
    void api.import.videoStatus().then((s) => setVideoAvailable(s.available));
  }, []);

  if (!project) {
    return (
      <div className="studio-page">
        <div className="panel studio-main-panel">
          <p className="muted">Choose a project on the Projects tab, or create one from the sidebar.</p>
        </div>
      </div>
    );
  }

  const isVestaNote = shouldUseVestaNoteUi(project);
  const isImageFrame = project.type === 'image-frame';
  const isAnimator = project.type === 'animator';
  const isLiveSign = project.type === 'live-sign' && !isVestaNote;
  const showToolbar = drawingTools.length > 0;
  const imageMode = String(project.appConfig?.mode ?? 'slideshow') as 'single' | 'slideshow';

  if (isVestaNote) {
    return (
      <div className="studio-page">
        <div className="panel studio-main-panel vesta-studio-panel">
          <VestaNoteStudio
            project={project}
            onChange={(appConfig) => setProject({ ...project, appConfig })}
          />
        </div>
      </div>
    );
  }

  const placeLiveRegion = (rect: Rect) => {
    const clamped = clampRect(rect);
    applyProject((current) => {
      const area: LiveArea = {
        id: crypto.randomUUID(),
        rect: clamped,
        zIndex: current.liveAreas.length,
        datasourceId: String(liveDraft.datasourceId ?? 'local.clock'),
        widgetId: String(liveDraft.widgetId ?? 'text'),
        config: liveDraft.config ?? { format: 'HH:MM' },
        refreshPolicy: 'inherit',
      };
      return { ...current, liveAreas: [...current.liveAreas, area] };
    });
    setLiveDraft((d) => ({ ...d, ...clamped }));
    setStatus(`Placed live region ${clamped.w}×${clamped.h} at (${clamped.x}, ${clamped.y})`);
  };

  const finishLiveRegionDrag = (x: number, y: number) => {
    const start = liveDragStart.current;
    liveDragStart.current = null;
    setLiveRegionPreview(null);
    drawing.current = false;
    if (!start || !isLiveSign) return;
    placeLiveRegion(rectFromPoints(start.x, start.y, x, y));
  };

  const addSlideshowImage = async (file: File) => {
    const { frame } = await api.import.image(file);
    applyProject((current) => ({
      ...current,
      frames: imageMode === 'single' ? [frame] : [...current.frames, frame],
    }));
    if (imageMode === 'single') setFrameIndex(0);
    else setFrameIndex(project.frames.length);
    setStatus(imageMode === 'single' ? 'Image updated' : 'Image added to slideshow');
  };

  return (
    <div className="studio-page">
      <div className="panel studio-main-panel">
        <div className={`studio-draw-row${showToolbar ? '' : ' studio-draw-row-preview-only'}`}>
          {showToolbar ? (
            <aside className="studio-toolbar-panel">
              <EditorToolBar
                tools={drawingTools}
                activeTool={tool}
                onToolChange={setTool}
                color={color}
                onColorChange={setColor}
                editorZoom={editorZoom}
                onEditorZoomChange={setEditorZoom}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </aside>
          ) : null}
          <div className="studio-canvas-panel">
            <div className="editor-canvas-wrap">
              <canvas
                ref={canvasRef}
                width={64}
                height={64}
                className={`editor-canvas${tool === 'live-area' ? ' tool-live-area' : ''}`}
                style={{ width: 64 * editorZoom, height: 64 * editorZoom }}
                onMouseDown={(e) => {
                  if (!showToolbar) return;
                  drawing.current = true;
                  const { x, y } = getPos(e);
                  if (tool === 'fill') {
                    floodFill(x, y);
                    drawing.current = false;
                  } else if (tool === 'live-area' && isLiveSign) {
                    liveDragStart.current = { x, y };
                    setLiveRegionPreview(clampRect({ x, y, w: 1, h: 1 }));
                  } else if (tool === 'pencil' || tool === 'eraser') {
                    const activeProject = project;
                    if (activeProject) strokeSnapshot.current = cloneProject(activeProject);
                    strokeChanged.current = false;
                    paint(x, y);
                  }
                }}
                onMouseMove={(e) => {
                  if (!showToolbar) return;
                  const { x, y } = getPos(e);
                  if (drawing.current && tool === 'live-area' && liveDragStart.current) {
                    const start = liveDragStart.current;
                    setLiveRegionPreview(rectFromPoints(start.x, start.y, x, y));
                    return;
                  }
                  if (!drawing.current || tool === 'fill' || tool === 'live-area') return;
                  paint(x, y);
                }}
                onMouseUp={(e) => {
                  if (!showToolbar) return;
                  if (drawing.current && tool === 'live-area' && liveDragStart.current) {
                    finishLiveRegionDrag(getPos(e).x, getPos(e).y);
                    return;
                  }
                  if (drawing.current && (tool === 'pencil' || tool === 'eraser')) commitStroke();
                  drawing.current = false;
                }}
                onMouseLeave={(e) => {
                  if (!showToolbar) return;
                  if (drawing.current && tool === 'live-area' && liveDragStart.current) {
                    finishLiveRegionDrag(getPos(e).x, getPos(e).y);
                    return;
                  }
                  if (drawing.current && (tool === 'pencil' || tool === 'eraser')) commitStroke();
                  drawing.current = false;
                }}
              />
            </div>
            <p className="studio-canvas-meta muted">
              {isVestaNote
                ? 'Live preview — use Run on Pixoo to send to device'
                : `Frame ${frameIndex + 1} of ${frameCount} · ${CANVAS_SIZE}×${CANVAS_SIZE} pixels`}
            </p>
          </div>
        </div>

        {isImageFrame ? (
          <ControlSection
            title="Images"
            hint="Upload one still image or build a slideshow that cycles on your Pixoo."
          >
            <Field label="Display mode" htmlFor="image-frame-mode">
              <select
                id="image-frame-mode"
                value={imageMode}
                onChange={(e) =>
                  setProject({
                    ...project,
                    appConfig: { ...(project.appConfig ?? {}), mode: e.target.value },
                    frames: e.target.value === 'single' && project.frames.length > 1
                      ? [project.frames[frameIndex] ?? project.frames[0]]
                      : project.frames,
                  })
                }
              >
                <option value="single">Single image</option>
                <option value="slideshow">Slideshow</option>
              </select>
            </Field>
            <div className="field-row">
              <button type="button" onClick={() => slideshowInputRef.current?.click()}>
                {imageMode === 'single' ? 'Upload image…' : 'Add image to slideshow…'}
              </button>
            </div>
            <input
              ref={slideshowInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void addSlideshowImage(file);
                e.target.value = '';
              }}
            />
            <Field label="Slide duration (ms)" htmlFor="slide-duration">
              <input
                id="slide-duration"
                type="number"
                min={500}
                step={100}
                value={project.frameDurationMs}
                onChange={(e) => setProject({ ...project, frameDurationMs: Number(e.target.value) })}
              />
            </Field>
            {imageMode === 'slideshow' ? (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={project.loop}
                  onChange={(e) => setProject({ ...project, loop: e.target.checked })}
                />
                <span>Loop slideshow</span>
              </label>
            ) : null}
            {frameCount > 1 ? (
              <div className="timeline">
                {thumbs.map((f, i) => (
                  <FrameThumb
                    key={i}
                    frame={f}
                    index={i}
                    active={i === frameIndex}
                    onClick={() => setFrameIndex(i)}
                    onReorder={reorderFrame}
                  />
                ))}
              </div>
            ) : null}
          </ControlSection>
        ) : null}

        {isAnimator ? (
          <>
            <ControlSection
              title="Frames"
              hint="Draw frames, import GIFs, or convert a video clip into an animation loop."
            >
              <div className="field-row">
                <button type="button" onClick={addBlankFrame}>Add empty frame</button>
                <button type="button" onClick={duplicateCurrentFrame}>Copy frame to new</button>
                <button type="button" onClick={() => updateFrame(createEmptyFrame())}>Clear this frame</button>
                <button
                  type="button"
                  className="danger"
                  disabled={frameCount <= 1}
                  onClick={removeCurrentFrame}
                >
                  Delete this frame
                </button>
                <button type="button" onClick={() => imageInputRef.current?.click()}>Upload still image…</button>
                <button type="button" onClick={() => gifInputRef.current?.click()}>Upload animated GIF…</button>
                <button
                  type="button"
                  disabled={!videoAvailable}
                  title={videoAvailable ? undefined : 'Install ffmpeg on the server for video import'}
                  onClick={() => videoInputRef.current?.click()}
                >
                  Upload video…
                </button>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportImageFile(file);
                e.target.value = '';
              }} />
              <input ref={gifInputRef} type="file" accept="image/gif,video/mp4" hidden onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const { frames, delays } = await api.import.gif(file);
                applyProject(() => ({
                  ...project,
                  frames,
                  frameDurationMs: delays[0] ?? project.frameDurationMs,
                }));
                setFrameIndex(0);
                setStatus(`Imported ${frames.length} frames from GIF`);
                e.target.value = '';
              }} />
              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setStatus('Converting video to frames…');
                try {
                  const { frames, delays } = await api.import.video(file);
                  applyProject(() => ({
                    ...project,
                    frames,
                    frameDurationMs: delays[0] ?? project.frameDurationMs,
                  }));
                  setFrameIndex(0);
                  setStatus(`Imported ${frames.length} frames from video`);
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Video import failed');
                }
                e.target.value = '';
              }} />
              <Field label="Frame duration (ms)" htmlFor="frame-duration">
                <input
                  id="frame-duration"
                  type="number"
                  min={50}
                  step={50}
                  value={project.frameDurationMs}
                  onChange={(e) => setProject({ ...project, frameDurationMs: Number(e.target.value) })}
                />
              </Field>
              <label className="checkbox-field" htmlFor="animation-loop">
                <input
                  id="animation-loop"
                  type="checkbox"
                  checked={project.loop}
                  onChange={(e) => setProject({ ...project, loop: e.target.checked })}
                />
                <span>Loop animation</span>
              </label>
              <div className="timeline">
                {thumbs.map((f, i) => (
                  <FrameThumb key={i} frame={f} index={i} active={i === frameIndex} onClick={() => setFrameIndex(i)} onReorder={reorderFrame} />
                ))}
              </div>
            </ControlSection>
          </>
        ) : null}

        {isLiveSign ? (
          <ControlSection
            title="Live regions"
            hint="Pick a data source, choose the Live region tool, then drag on the canvas."
          >
            <div className="live-region-grid">
              <Field label="Data source" htmlFor="live-source">
                <select id="live-source" value={String(liveDraft.datasourceId ?? 'local.clock')} onChange={(e) => setLiveDraft((d) => ({ ...d, datasourceId: e.target.value }))}>
                  {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                </select>
              </Field>
              <Field label="How to display" htmlFor="live-widget">
                <select id="live-widget" value={String(liveDraft.widgetId ?? 'text')} onChange={(e) => setLiveDraft((d) => ({ ...d, widgetId: e.target.value }))}>
                  <option value="text">Static text</option>
                  <option value="text-scroll">Scrolling text</option>
                  <option value="icon-value">Icon and value</option>
                </select>
              </Field>
            </div>
            {project.liveAreas.length > 0 ? (
              <ul className="live-area-list">
                {project.liveAreas.map((area) => (
                  <li key={area.id} className="live-area-item">
                    <div className="live-area-summary">
                      <strong>{datasources.find((d) => d.id === area.datasourceId)?.name ?? area.datasourceId}</strong>
                      <span className="muted">{area.rect.w}×{area.rect.h} at ({area.rect.x}, {area.rect.y})</span>
                    </div>
                    <button type="button" onClick={() => applyProject((current) => ({
                      ...current,
                      liveAreas: current.liveAreas.filter((a) => a.id !== area.id),
                    }))}>Remove</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No live regions placed yet.</p>
            )}
          </ControlSection>
        ) : null}
      </div>

      {importImageFile && currentFrame && isAnimator ? (
        <ImageImportModal
          file={importImageFile}
          baseFrame={currentFrame}
          onApply={(frame) => {
            updateFrame(frame);
            setImportImageFile(null);
            setStatus('Image placed on current frame');
          }}
          onCancel={() => setImportImageFile(null)}
        />
      ) : null}
    </div>
  );
}

function rectFromPoints(x0: number, y0: number, x1: number, y1: number): Rect {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  const w = Math.abs(x1 - x0) + 1;
  const h = Math.abs(y1 - y0) + 1;
  return clampRect({ x, y, w, h });
}

function FrameThumb({
  frame,
  index,
  active,
  onClick,
  onReorder,
}: {
  frame: Frame;
  index: number;
  active: boolean;
  onClick: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(frameToImageData(frame), 0, 0);
  }, [frame]);

  return (
    <button
      type="button"
      draggable
      className={`frame-thumb-btn${active ? ' active' : ''}${dragOver ? ' drag-over' : ''}`}
      onClick={onClick}
      title={`Frame ${index + 1}. Drag to reorder.`}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const from = Number(e.dataTransfer.getData('text/plain'));
        if (!Number.isNaN(from)) onReorder(from, index);
      }}
      onDragEnd={() => setDragOver(false)}
    >
      <canvas ref={ref} width={64} height={64} className="frame-thumb" />
      <span className="frame-thumb-label">{index + 1}</span>
    </button>
  );
}
