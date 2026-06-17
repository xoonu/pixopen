import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '@pixopen/core';

export const MAX_UNDO_STEPS = 10;

export function cloneProject(project: Project): Project {
  return {
    ...project,
    frames: project.frames.map((frame) => ({
      ...frame,
      pixels: [...frame.pixels],
    })),
    liveAreas: project.liveAreas.map((area) => ({
      ...area,
      config: { ...area.config },
    })),
  };
}

export function useProjectHistory(projectId: string | null) {
  const undoStack = useRef<Project[]>([]);
  const redoStack = useRef<Project[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncMeta = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const reset = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    syncMeta();
  }, [syncMeta]);

  useEffect(() => {
    reset();
  }, [projectId, reset]);

  const pushUndo = useCallback(
    (snapshot: Project) => {
      undoStack.current = [...undoStack.current, cloneProject(snapshot)].slice(-MAX_UNDO_STEPS);
      redoStack.current = [];
      syncMeta();
    },
    [syncMeta],
  );

  const undo = useCallback(
    (current: Project): Project | null => {
      const previous = undoStack.current.pop();
      if (!previous) return null;
      redoStack.current = [...redoStack.current, cloneProject(current)].slice(-MAX_UNDO_STEPS);
      syncMeta();
      return cloneProject(previous);
    },
    [syncMeta],
  );

  const redo = useCallback(
    (current: Project): Project | null => {
      const next = redoStack.current.pop();
      if (!next) return null;
      undoStack.current = [...undoStack.current, cloneProject(current)].slice(-MAX_UNDO_STEPS);
      syncMeta();
      return cloneProject(next);
    },
    [syncMeta],
  );

  return { pushUndo, undo, redo, reset, canUndo, canRedo };
}
