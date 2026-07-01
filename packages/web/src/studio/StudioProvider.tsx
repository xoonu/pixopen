import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CANVAS_SIZE, createEmptyFrame, normalizeProject, projectTypeLabel as formatProjectTypeLabel, shouldUseFlipNoteUi, shouldUseStockTickerUi, shouldUseWeatherUi, shouldUseDvdScreensaverUi, type Frame, type Project, type Rect } from '@pixopen/core';
import { api } from '../lib/api';
import { cloneProject, useProjectHistory } from '../hooks/useProjectHistory';
import { useToast } from '../components/Toast';

export type StudioTool = 'pencil' | 'eraser' | 'fill' | 'live-area';

export type StudioEditorApi = {
  project: Project | null;
  projects: Project[];
  setProject: React.Dispatch<React.SetStateAction<Project | null>>;
  projectId: string | null;
  frameIndex: number;
  setFrameIndex: React.Dispatch<React.SetStateAction<number>>;
  frameCount: number;
  currentFrame: Frame | null;
  tool: StudioTool;
  setTool: React.Dispatch<React.SetStateAction<StudioTool>>;
  color: string;
  setColor: React.Dispatch<React.SetStateAction<string>>;
  setStatus: (message: string) => void;
  previewPixels: number[] | null;
  /** True when the server has an active live runtime (any project). */
  liveRuntimeActive: boolean;
  /** Which project is streaming live, if any. */
  liveRuntimeProjectId: string | null;
  runtimeError: string | null;
  refreshRuntimeStatus: () => void;
  datasources: Awaited<ReturnType<typeof api.datasources.list>>;
  liveDraft: { x: number; y: number; w: number; h: number; datasourceId?: string; widgetId?: string; config?: Record<string, unknown> };
  setLiveDraft: React.Dispatch<React.SetStateAction<{ x: number; y: number; w: number; h: number; datasourceId?: string; widgetId?: string; config?: Record<string, unknown> }>>;
  liveRegionPreview: Rect | null;
  setLiveRegionPreview: React.Dispatch<React.SetStateAction<Rect | null>>;
  importImageFile: File | null;
  setImportImageFile: React.Dispatch<React.SetStateAction<File | null>>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  gifInputRef: React.RefObject<HTMLInputElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  save: () => Promise<Project>;
  nameConflict: boolean | null | undefined;
  projectTypeLabel: string;
  drawingTools: StudioTool[];
  thumbs: Frame[];
  updateFrame: (next: Frame, options?: { recordUndo?: boolean }) => void;
  applyProject: (recipe: (current: Project) => Project, options?: { recordUndo?: boolean }) => void;
  addBlankFrame: () => void;
  duplicateCurrentFrame: () => void;
  removeCurrentFrame: () => void;
  reorderFrame: (fromIndex: number, toIndex: number) => void;
  getPos: (e: React.MouseEvent<HTMLCanvasElement>) => { x: number; y: number };
  floodFill: (startX: number, startY: number) => void;
  paint: (x: number, y: number) => void;
  commitStroke: () => void;
  strokeSnapshot: React.MutableRefObject<Project | null>;
  strokeChanged: React.MutableRefObject<boolean>;
  drawing: React.MutableRefObject<boolean>;
  cloneProject: typeof cloneProject;
};

const StudioContext = createContext<StudioEditorApi | null>(null);

export function useStudio() {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio must be used within StudioProvider');
  return value;
}

function frameToImageData(frame: Frame): ImageData {
  const data = new Uint8ClampedArray(frame.pixels);
  return new ImageData(data, CANVAS_SIZE, CANVAS_SIZE);
}

function cloneFrame(frame: Frame): Frame {
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels: [...frame.pixels] };
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function colorsEqual(a: number[] | Uint8ClampedArray, b: number[]) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export function StudioProvider({
  active,
  projectId,
  onProjectIdChange,
  onProjectChange,
  children,
}: {
  active: boolean;
  projectId: string | null;
  onProjectIdChange: (id: string | null) => void;
  onProjectChange?: (project: Project | null) => void;
  children: ReactNode;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [tool, setTool] = useState<StudioTool>('pencil');
  const [color, setColor] = useState('#4f7cff');
  const { pushToast } = useToast();
  const setStatus = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      pushToast(message);
    },
    [pushToast],
  );
  const [previewPixels, setPreviewPixels] = useState<number[] | null>(null);
  const [liveRuntimeActive, setLiveRuntimeActive] = useState(false);
  const [liveRuntimeProjectId, setLiveRuntimeProjectId] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [datasources, setDatasources] = useState<Awaited<ReturnType<typeof api.datasources.list>>>([]);
  const [liveDraft, setLiveDraft] = useState<{ x: number; y: number; w: number; h: number; datasourceId?: string; widgetId?: string; config?: Record<string, unknown> }>({ x: 2, y: 2, w: 28, h: 10 });
  const [liveRegionPreview, setLiveRegionPreview] = useState<Rect | null>(null);
  const [importImageFile, setImportImageFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const drawing = useRef(false);
  const strokeSnapshot = useRef<Project | null>(null);
  const strokeChanged = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  const { pushUndo, undo, redo, canUndo, canRedo } = useProjectHistory(projectId);

  const currentFrame = project?.frames[frameIndex] ?? null;
  const frameCount = project?.frames.length ?? 0;

  useEffect(() => {
    if (!active) return;
    void api.projects.list().then(setProjects);
    void api.datasources.list().then(setDatasources);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (!projectId) {
      setProject(null);
      return;
    }
    void api.projects.get(projectId).then((p) => {
      setProject(normalizeProject(p));
      setFrameIndex(0);
    }).catch(() => {
      setProject(null);
      onProjectIdChange(null);
      setStatus('Project not found');
    });
  }, [active, projectId, onProjectIdChange]);

  useEffect(() => {
    if (!active) return;
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as { type?: string; pixels?: number[] };
      if (msg.type === 'preview' && msg.pixels) setPreviewPixels(msg.pixels);
    };
    return () => ws.close();
  }, [active]);

  const refreshRuntimeStatus = useCallback(() => {
    void api.runtime.status().then((s) => {
      if (s.running && s.projectId) {
        setLiveRuntimeActive(true);
        setLiveRuntimeProjectId(s.projectId);
        setRuntimeError(s.lastError ?? null);
      } else {
        setLiveRuntimeActive(false);
        setLiveRuntimeProjectId(null);
        setRuntimeError(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    refreshRuntimeStatus();
    const id = window.setInterval(refreshRuntimeStatus, 2000);
    return () => window.clearInterval(id);
  }, [active, projectId, refreshRuntimeStatus]);

  useEffect(() => {
    if (tool !== 'live-area') setLiveRegionPreview(null);
  }, [tool]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (project.templateId === 'flip-note' || shouldUseFlipNoteUi(project)) return;
    if (project.templateId === 'stock-ticker' || shouldUseStockTickerUi(project)) return;
    if (project.templateId === 'weather-frame' || shouldUseWeatherUi(project)) return;
    if (project.templateId === 'dvd-screensaver' || shouldUseDvdScreensaverUi(project)) return;

    if (!currentFrame) return;
    ctx.putImageData(frameToImageData(currentFrame), 0, 0);
    if (project.type === 'live-sign') {
      ctx.strokeStyle = '#7cff4f';
      ctx.setLineDash([]);
      for (const area of project.liveAreas) {
        ctx.strokeRect(area.rect.x, area.rect.y, area.rect.w, area.rect.h);
      }
      if (liveRegionPreview) {
        ctx.strokeStyle = '#ffeb3b';
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(liveRegionPreview.x, liveRegionPreview.y, liveRegionPreview.w, liveRegionPreview.h);
        ctx.setLineDash([]);
      }
    }
  }, [active, currentFrame, project, project?.liveAreas, project?.type, project?.templateId, project?.appConfig, liveRegionPreview]);

  const restoreProject = useCallback((next: Project) => {
    setProject(next);
    setFrameIndex((index) => Math.max(0, Math.min(index, next.frames.length - 1)));
  }, []);

  const applyProject = useCallback(
    (recipe: (current: Project) => Project, options?: { recordUndo?: boolean }) => {
      const current = projectRef.current;
      if (!current) return;
      if (options?.recordUndo !== false) pushUndo(current);
      restoreProject(recipe(cloneProject(current)));
    },
    [pushUndo, restoreProject],
  );

  const handleUndo = useCallback(() => {
    if (!project) return;
    const previous = undo(project);
    if (previous) restoreProject(previous);
  }, [project, undo, restoreProject]);

  const handleRedo = useCallback(() => {
    if (!project) return;
    const next = redo(project);
    if (next) restoreProject(next);
  }, [project, redo, restoreProject]);

  useEffect(() => {
    if (!active || !project) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, project, handleUndo, handleRedo]);

  const commitStroke = useCallback(() => {
    if (strokeSnapshot.current && strokeChanged.current) {
      pushUndo(strokeSnapshot.current);
    }
    strokeSnapshot.current = null;
    strokeChanged.current = false;
  }, [pushUndo]);

  const updateFrame = useCallback((next: Frame, options?: { recordUndo?: boolean }) => {
    if (!projectRef.current) return;
    applyProject(
      (current) => {
        const frames = [...current.frames];
        frames[frameIndex] = next;
        return { ...current, frames };
      },
      options,
    );
  }, [applyProject, frameIndex]);

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * CANVAS_SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * CANVAS_SIZE);
    return { x: Math.max(0, Math.min(63, x)), y: Math.max(0, Math.min(63, y)) };
  }, []);

  const paint = useCallback((x: number, y: number) => {
    const activeProject = projectRef.current;
    const frame = activeProject?.frames[frameIndex];
    if (!frame) return;
    const next = cloneFrame(frame);
    const i = (y * CANVAS_SIZE + x) * 4;
    if (tool === 'eraser') {
      next.pixels[i] = 0; next.pixels[i + 1] = 0; next.pixels[i + 2] = 0; next.pixels[i + 3] = 255;
    } else {
      const rgb = hexToRgb(color);
      next.pixels[i] = rgb[0]; next.pixels[i + 1] = rgb[1]; next.pixels[i + 2] = rgb[2]; next.pixels[i + 3] = 255;
    }
    strokeChanged.current = true;
    updateFrame(next, { recordUndo: false });
  }, [color, frameIndex, tool, updateFrame]);

  const floodFill = useCallback((startX: number, startY: number) => {
    if (!currentFrame) return;
    const target = (startY * CANVAS_SIZE + startX) * 4;
    const targetColor = currentFrame.pixels.slice(target, target + 4);
    const fill = [...hexToRgb(color), 255];
    if (colorsEqual(targetColor, fill)) return;
    applyProject((current) => {
      const source = current.frames[frameIndex];
      if (!source) return current;
      const frame = cloneFrame(source);
      const stack = [[startX, startY]];
      while (stack.length) {
        const [x, y] = stack.pop()!;
        const idx = (y * CANVAS_SIZE + x) * 4;
        const px = frame.pixels.slice(idx, idx + 4);
        if (!colorsEqual(px, targetColor)) continue;
        frame.pixels[idx] = fill[0]; frame.pixels[idx + 1] = fill[1]; frame.pixels[idx + 2] = fill[2]; frame.pixels[idx + 3] = 255;
        if (x > 0) stack.push([x - 1, y]);
        if (x < 63) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < 63) stack.push([x, y + 1]);
      }
      const frames = [...current.frames];
      frames[frameIndex] = frame;
      return { ...current, frames };
    });
  }, [applyProject, color, currentFrame, frameIndex]);

  const duplicateCurrentFrame = useCallback(() => {
    if (!project) return;
    const nextIndex = project.frames.length;
    applyProject((current) => ({
      ...current,
      frames: [...current.frames, cloneFrame(current.frames[frameIndex] ?? createEmptyFrame())],
    }));
    setFrameIndex(nextIndex);
    setStatus(`Copied frame ${frameIndex + 1} to new frame ${nextIndex + 1}`);
  }, [applyProject, frameIndex, project]);

  const addBlankFrame = useCallback(() => {
    if (!project) return;
    const nextIndex = project.frames.length;
    applyProject((current) => ({
      ...current,
      frames: [...current.frames, createEmptyFrame()],
    }));
    setFrameIndex(nextIndex);
    setStatus(`Added empty frame ${nextIndex + 1}`);
  }, [applyProject, project]);

  const removeCurrentFrame = useCallback(() => {
    if (!project || project.frames.length <= 1) {
      setStatus('Keep at least one frame in the sequence');
      return;
    }
    const removedIndex = frameIndex;
    const nextIndex = removedIndex >= project.frames.length - 1 ? removedIndex - 1 : removedIndex;
    applyProject((current) => ({
      ...current,
      frames: current.frames.filter((_, i) => i !== removedIndex),
    }));
    setFrameIndex(nextIndex);
    setStatus(`Removed frame ${removedIndex + 1}`);
  }, [applyProject, frameIndex, project]);

  const reorderFrame = useCallback((fromIndex: number, toIndex: number) => {
    if (!project || fromIndex === toIndex) return;
    const count = project.frames.length;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= count || toIndex >= count) return;

    applyProject((current) => {
      const frames = [...current.frames];
      const [moved] = frames.splice(fromIndex, 1);
      frames.splice(toIndex, 0, moved);
      return { ...current, frames };
    });

    setFrameIndex((current) => {
      if (current === fromIndex) return toIndex;
      if (fromIndex < current && toIndex >= current) return current - 1;
      if (fromIndex > current && toIndex <= current) return current + 1;
      return current;
    });
    setStatus(`Moved frame ${fromIndex + 1} to position ${toIndex + 1}`);
  }, [applyProject, project]);

  const save = useCallback(async (): Promise<Project> => {
    const current = projectRef.current;
    if (!current) throw new Error('No project loaded');
    try {
      const saved = await api.projects.update(current);
      setProject({ ...saved, appConfig: { ...current.appConfig, ...saved.appConfig } });
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        const merged = { ...saved, appConfig: { ...current.appConfig, ...saved.appConfig } };
        if (idx < 0) return [merged, ...prev];
        const next = [...prev];
        next[idx] = merged;
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setStatus(`Saved "${saved.name}"`);
      return { ...saved, appConfig: { ...current.appConfig, ...saved.appConfig } };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      setStatus(message);
      throw new Error(message);
    }
  }, []);

  const nameConflict =
    project &&
    projects.some(
      (p) => p.id !== project.id && p.name.trim().toLowerCase() === project.name.trim().toLowerCase(),
    );

  const projectTypeLabel = project ? formatProjectTypeLabel(project.type) : '';
  const drawingTools = (() => {
    if (!project || project.type === 'image-frame' || shouldUseFlipNoteUi(project) || shouldUseStockTickerUi(project) || shouldUseWeatherUi(project) || shouldUseDvdScreensaverUi(project)) return [] as StudioTool[];
    if (project.type === 'live-sign') return ['pencil', 'eraser', 'fill', 'live-area'] as StudioTool[];
    return ['pencil', 'eraser', 'fill'] as StudioTool[];
  })();
  const thumbs = useMemo(() => project?.frames ?? [], [project?.frames]);

  useEffect(() => {
    onProjectChange?.(project);
  }, [project, onProjectChange]);

  const value = useMemo<StudioEditorApi>(() => ({
    project,
    projects,
    setProject,
    projectId,
    frameIndex,
    setFrameIndex,
    frameCount,
    currentFrame,
    tool,
    setTool,
    color,
    setColor,
    setStatus,
    previewPixels,
    liveRuntimeActive,
    liveRuntimeProjectId,
    runtimeError,
    refreshRuntimeStatus,
    datasources,
    liveDraft,
    setLiveDraft,
    liveRegionPreview,
    setLiveRegionPreview,
    importImageFile,
    setImportImageFile,
    imageInputRef,
    gifInputRef,
    canvasRef,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    save,
    nameConflict,
    projectTypeLabel,
    drawingTools,
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
    cloneProject,
  }), [
    project, projects, projectId, frameIndex, frameCount, currentFrame, tool, color, setStatus, previewPixels,
    liveRuntimeActive, liveRuntimeProjectId, runtimeError, refreshRuntimeStatus, datasources, liveDraft, liveRegionPreview, importImageFile, canUndo, canRedo,
    handleUndo, handleRedo, save, nameConflict, projectTypeLabel, drawingTools, thumbs, updateFrame,
    applyProject, addBlankFrame, duplicateCurrentFrame, removeCurrentFrame, reorderFrame, getPos, floodFill, paint, commitStroke,
  ]);

  if (!active) return <>{children}</>;

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export { cloneProject } from '../hooks/useProjectHistory';
export { frameToImageData, cloneFrame };
