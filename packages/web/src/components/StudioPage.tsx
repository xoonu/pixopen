import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, clampRect, createEmptyFrame, EDITOR_CANVAS_DISPLAY_PX, shouldUseFlipNoteUi, type Frame, type LiveArea, type Rect } from '@pixopen/core';
import { api } from '../lib/api';
import { ControlSection, Field } from './ControlSection';
import { ScrollRegion } from './ScrollRegion';
import { EditorCanvasBar } from './EditorToolbar';
import { ImageImportModal } from './ImageImportModal';
import { VideoImportModal } from './VideoImportModal';
import { FlipNoteBoardPanel } from './FlipNoteBoardPanel';
import { FlipNoteStudio } from './FlipNoteStudio';
import { StudioChrome } from './StudioChrome';
import { SequencePreview } from './SequencePreview';
import { frameToImageData, useStudio } from '../studio/StudioProvider';

type ImageImportMode = 'animator' | 'single' | 'slideshow-add' | 'slideshow-replace';

type StudioPageProps = {
  deviceIp: string;
};

export function StudioPage({ deviceIp }: StudioPageProps) {
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
    liveRuntimeActive,
    liveRuntimeProjectId,
  } = studio;

  const liveSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveDragStart = useRef<{ x: number; y: number } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const slideshowInputRef = useRef<HTMLInputElement>(null);
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [importVideoFile, setImportVideoFile] = useState<File | null>(null);
  const [videoImporting, setVideoImporting] = useState(false);
  const [imageImportMode, setImageImportMode] = useState<ImageImportMode | null>(null);
  const imageImportModeRef = useRef<ImageImportMode | null>(null);

  useEffect(() => {
    void api.import.videoStatus().then((s) => setVideoAvailable(s.available));
  }, []);

  useEffect(() => () => {
    if (liveSyncTimer.current) clearTimeout(liveSyncTimer.current);
  }, []);

  const syncFlipNoteToRuntime = (projectId: string, appConfig: Record<string, unknown>) => {
    if (!liveRuntimeActive || liveRuntimeProjectId !== projectId) return;
    if (liveSyncTimer.current) clearTimeout(liveSyncTimer.current);
    liveSyncTimer.current = setTimeout(() => {
      void api.runtime.sync(projectId, appConfig);
    }, 200);
  };

  if (!project) {
    return (
      <div className="studio-page studio-page-empty grid place-items-center min-h-[40vh]">
        <div className="text-center max-w-sm px-6">
          <p className="font-semibold text-lg">Open a project to start editing</p>
          <p className="text-sm text-muted mt-2">
            Pick one from Projects, or create a new one with <strong>New project</strong>.
          </p>
        </div>
      </div>
    );
  }

  const isFlipNote = shouldUseFlipNoteUi(project);
  const isImageFrame = project.type === 'image-frame';
  const isAnimator = project.type === 'animator';
  const isLiveSign = project.type === 'live-sign' && !isFlipNote;
  const showToolbar = drawingTools.length > 0;
  const imageMode = String(project.appConfig?.mode ?? 'slideshow') as 'single' | 'slideshow';

  const playbackControls = frameCount > 1 ? (
    <SequencePreview
      hideDisplay
      compact
      frames={project.frames}
      frameDurationMs={project.frameDurationMs}
      loop={project.loop}
      editorFrameIndex={frameIndex}
      onFrameChange={setFrameIndex}
    />
  ) : null;

  if (isFlipNote) {
    const handleFlipNoteChange = (appConfig: Record<string, unknown>) => {
      setProject((prev) => (prev ? { ...prev, appConfig: { ...prev.appConfig, ...appConfig } } : prev));
      syncFlipNoteToRuntime(project.id, appConfig);
    };

    return (
      <div className="studio-page studio-workspace-layout">
        <aside className="studio-sidebar" aria-label="Project sidebar">
          <StudioChrome deviceIp={deviceIp} />
          <FlipNoteBoardPanel project={project} onChange={handleFlipNoteChange} />
        </aside>
        <main className="studio-main-panel min-w-0">
          <FlipNoteStudio project={project} onChange={handleFlipNoteChange} />
        </main>
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

  const removeSlideAt = (index: number) => {
    if (project.frames.length <= 1) {
      setStatus('Keep at least one slide in the slideshow');
      return;
    }
    applyProject((current) => ({
      ...current,
      frames: current.frames.filter((_, i) => i !== index),
    }));
    setFrameIndex((current) => {
      if (current === index) return Math.max(0, index - 1);
      if (current > index) return current - 1;
      return current;
    });
    setStatus(`Removed slide ${index + 1}`);
  };

  const openImageImport = (mode: ImageImportMode) => {
    imageImportModeRef.current = mode;
    setImageImportMode(mode);
    slideshowInputRef.current?.click();
  };

  const closeImageImport = () => {
    imageImportModeRef.current = null;
    setImportImageFile(null);
    setImageImportMode(null);
  };

  const applyImportedImage = (frame: Frame) => {
    const mode = imageImportModeRef.current ?? imageImportMode;
    if (mode === 'animator') {
      updateFrame(frame);
      setStatus('Image placed on current frame');
    } else if (mode === 'single') {
      applyProject((current) => ({ ...current, frames: [frame] }));
      setFrameIndex(0);
      setStatus('Image updated');
    } else if (mode === 'slideshow-replace') {
      applyProject((current) => {
        const frames = [...current.frames];
        frames[frameIndex] = frame;
        return { ...current, frames };
      });
      setStatus(`Updated slide ${frameIndex + 1}`);
    } else if (mode === 'slideshow-add') {
      const nextIndex = project.frames.length;
      applyProject((current) => ({ ...current, frames: [...current.frames, frame] }));
      setFrameIndex(nextIndex);
      setStatus('Image added to slideshow');
    }
    closeImageImport();
  };

  const imageImportModalCopy = (() => {
    switch (imageImportMode) {
      case 'single':
        return {
          title: 'Place image',
          hint: 'Adjust scale and position, then apply to your display.',
          applyLabel: 'Apply image',
          baseFrame: null as Frame | null,
        };
      case 'slideshow-add':
        return {
          title: 'Add slide to slideshow',
          hint: 'Adjust scale and position, then add this image as a new slide.',
          applyLabel: 'Add slide',
          baseFrame: null as Frame | null,
        };
      case 'slideshow-replace':
        return {
          title: `Replace slide ${frameIndex + 1}`,
          hint: 'Adjust scale and position, then replace the selected slide.',
          applyLabel: 'Replace slide',
          baseFrame: currentFrame,
        };
      default:
        return {
          title: 'Place image on frame',
          hint: 'Adjust scale and position, then apply to the current frame.',
          applyLabel: 'Apply to current frame',
          baseFrame: currentFrame,
        };
    }
  })();

  const sidebarContent = (
    <>
      {isImageFrame ? (
        <ControlSection
          title="Images"
          hint="Upload one still image or build a slideshow that cycles on your Pixoo."
        >
          <Field label="Display mode" htmlFor="image-frame-mode">
            <select
              id="image-frame-mode"
              className="select"
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
            {imageMode === 'single' ? (
              <button type="button" onClick={() => openImageImport('single')}>
                Upload image…
              </button>
            ) : (
              <>
                <button type="button" onClick={() => openImageImport('slideshow-add')}>
                  Add image to slideshow…
                </button>
                <button type="button" onClick={() => openImageImport('slideshow-replace')}>
                  Replace current slide…
                </button>
              </>
            )}
          </div>
          <input
            ref={slideshowInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !imageImportModeRef.current) return;
              setImportImageFile(file);
              e.target.value = '';
            }}
          />
          <Field label="Slide duration (ms)" htmlFor="slide-duration">
            <input
              id="slide-duration"
              className="input"
              type="number"
              min={500}
              step={100}
              value={project.frameDurationMs}
              onChange={(e) => setProject({ ...project, frameDurationMs: Number(e.target.value) })}
            />
          </Field>
          {imageMode === 'slideshow' ? (
            <>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={project.loop}
                  onChange={(e) => setProject({ ...project, loop: e.target.checked })}
                />
                <span>Loop slideshow</span>
              </label>
              {playbackControls}
              {frameCount > 0 ? (
                <ScrollRegion orientation="horizontal" label="Slideshow slides" viewportClassName="timeline">
                  {thumbs.map((f, i) => (
                    <FrameThumb
                      key={i}
                      frame={f}
                      index={i}
                      active={i === frameIndex}
                      onClick={() => setFrameIndex(i)}
                      onReorder={reorderFrame}
                      onRemove={frameCount > 1 ? () => removeSlideAt(i) : undefined}
                      removeLabel="Remove slide"
                    />
                  ))}
                </ScrollRegion>
              ) : null}
            </>
          ) : null}
        </ControlSection>
      ) : null}

      {isAnimator ? (
        <ControlSection
          title="Animation"
          hint="Draw frames, import GIFs, or convert a video clip into an animation loop."
        >
          <div className="field-row">
            <button type="button" onClick={addBlankFrame}>Add empty frame</button>
            <button type="button" onClick={duplicateCurrentFrame}>Copy frame to new</button>
            <button type="button" onClick={() => updateFrame(createEmptyFrame())}>Clear this frame</button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
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
            imageImportModeRef.current = 'animator';
            setImageImportMode('animator');
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
          <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImportVideoFile(file);
            e.target.value = '';
          }} />
          <Field label="Frame duration (ms)" htmlFor="frame-duration">
            <input
              id="frame-duration"
              className="input"
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
              className="checkbox"
              checked={project.loop}
              onChange={(e) => setProject({ ...project, loop: e.target.checked })}
            />
            <span>Loop animation</span>
          </label>
          {playbackControls}
          <ScrollRegion orientation="horizontal" label="Animation frames" viewportClassName="timeline">
            {thumbs.map((f, i) => (
              <FrameThumb key={i} frame={f} index={i} active={i === frameIndex} onClick={() => setFrameIndex(i)} onReorder={reorderFrame} />
            ))}
          </ScrollRegion>
        </ControlSection>
      ) : null}

      {isLiveSign ? (
        <ControlSection
          title="Live regions"
          hint="Pick a data source, choose the Live region tool, then drag on the canvas."
        >
          <div className="live-region-grid">
            <Field label="Data source" htmlFor="live-source">
              <select id="live-source" className="select" value={String(liveDraft.datasourceId ?? 'local.clock')} onChange={(e) => setLiveDraft((d) => ({ ...d, datasourceId: e.target.value }))}>
                {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
              </select>
            </Field>
            <Field label="How to display" htmlFor="live-widget">
              <select id="live-widget" className="select" value={String(liveDraft.widgetId ?? 'text')} onChange={(e) => setLiveDraft((d) => ({ ...d, widgetId: e.target.value }))}>
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
    </>
  );

  return (
    <>
    <div className="studio-page studio-workspace-layout">
      <aside className="studio-sidebar" aria-label="Project sidebar">
        <StudioChrome deviceIp={deviceIp} />
        {sidebarContent}
      </aside>

      <section
        className={`studio-editor-panel${isLiveSign ? ' studio-editor-panel-live' : ''}${isImageFrame ? ' studio-editor-panel-image' : ''}`}
        aria-label="Canvas editor"
      >
        <div className={`studio-editor-workspace${isLiveSign ? ' studio-editor-workspace-live' : ''}`}>
          {showToolbar ? (
            <EditorCanvasBar
              layout={isLiveSign ? 'column' : 'row'}
              tools={drawingTools}
              activeTool={tool}
              onToolChange={setTool}
              color={color}
              onColorChange={setColor}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          ) : null}

          <div className={`studio-canvas-rail${isLiveSign ? ' studio-canvas-rail-live' : ''}`}>
            <div className="studio-canvas-stack">
              <div className="editor-canvas-wrap">
                <div className="editor-canvas-viewport">
                  <canvas
                    ref={canvasRef}
                    width={64}
                    height={64}
                    className={`editor-canvas${tool === 'live-area' ? ' tool-live-area' : ''}`}
                    style={{
                      width: EDITOR_CANVAS_DISPLAY_PX,
                      height: EDITOR_CANVAS_DISPLAY_PX,
                    }}
                  onMouseDown={(e) => {
                    if (!showToolbar && !isImageFrame) return;
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
                    if (!showToolbar && !isImageFrame) return;
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
                    if (!showToolbar && !isImageFrame) return;
                    if (drawing.current && tool === 'live-area' && liveDragStart.current) {
                      finishLiveRegionDrag(getPos(e).x, getPos(e).y);
                      return;
                    }
                    if (drawing.current && (tool === 'pencil' || tool === 'eraser')) commitStroke();
                    drawing.current = false;
                  }}
                  onMouseLeave={(e) => {
                    if (!showToolbar && !isImageFrame) return;
                    if (drawing.current && tool === 'live-area' && liveDragStart.current) {
                      finishLiveRegionDrag(getPos(e).x, getPos(e).y);
                      return;
                    }
                    if (drawing.current && (tool === 'pencil' || tool === 'eraser')) commitStroke();
                    drawing.current = false;
                  }}
                />
                </div>
              </div>
              <p className="studio-canvas-meta muted">
                {`Frame ${frameIndex + 1} of ${frameCount} · ${CANVAS_SIZE}×${CANVAS_SIZE} pixels`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

      {importImageFile && imageImportMode ? (
        <ImageImportModal
          file={importImageFile}
          baseFrame={imageImportModalCopy.baseFrame}
          title={imageImportModalCopy.title}
          hint={imageImportModalCopy.hint}
          applyLabel={imageImportModalCopy.applyLabel}
          onApply={applyImportedImage}
          onCancel={closeImageImport}
        />
      ) : null}

      {importVideoFile && isAnimator ? (
        <VideoImportModal
          file={importVideoFile}
          importing={videoImporting}
          onCancel={() => {
            if (!videoImporting) setImportVideoFile(null);
          }}
          onImport={({ maxFrames, startSec, focusX, focusY }) => {
            void (async () => {
              setVideoImporting(true);
              setStatus('Converting video to frames…');
              try {
                const { frames, delays } = await api.import.video(importVideoFile, {
                  maxFrames,
                  startSec,
                  focusX,
                  focusY,
                });
                applyProject(() => ({
                  ...project,
                  frames,
                  frameDurationMs: delays[0] ?? project.frameDurationMs,
                }));
                setFrameIndex(0);
                setImportVideoFile(null);
                setStatus(`Imported ${frames.length} frames from video`);
              } catch (err) {
                setStatus(err instanceof Error ? err.message : 'Video import failed');
              } finally {
                setVideoImporting(false);
              }
            })();
          }}
        />
      ) : null}
    </>
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
  onRemove,
  removeLabel = 'Remove frame',
}: {
  frame: Frame;
  index: number;
  active: boolean;
  onClick: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove?: () => void;
  removeLabel?: string;
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
    <div className={`frame-thumb-wrap${active ? ' active' : ''}${dragOver ? ' drag-over' : ''}`}>
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
      {onRemove ? (
        <button
          type="button"
          className="frame-thumb-remove danger"
          title={removeLabel}
          aria-label={removeLabel}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
