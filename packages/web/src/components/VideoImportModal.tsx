import { useState } from 'react';
import {
  DEFAULT_VIDEO_IMPORT_FPS,
  DEFAULT_VIDEO_IMPORT_FRAMES,
  MAX_VIDEO_IMPORT_FRAMES,
} from '@pixopen/core';

type Props = {
  file: File;
  onImport: (maxFrames: number) => void;
  onCancel: () => void;
  importing?: boolean;
};

export function VideoImportModal({ file, onImport, onCancel, importing = false }: Props) {
  const [maxFrames, setMaxFrames] = useState(DEFAULT_VIDEO_IMPORT_FRAMES);
  const clipSeconds = (maxFrames / DEFAULT_VIDEO_IMPORT_FPS).toFixed(1);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="video-import-title">
      <div className="modal-panel p-5 video-import-modal">
        <h3 id="video-import-title" className="font-bold text-lg">Import video clip</h3>
        <p className="text-sm text-muted">
          Converts the start of <strong>{file.name}</strong> into pixel frames for your animation.
        </p>

        <label className="control-row video-import-length">
          <span className="field-label">Clip length (frames)</span>
          <input
            type="range"
            min={1}
            max={MAX_VIDEO_IMPORT_FRAMES}
            value={maxFrames}
            disabled={importing}
            onChange={(e) => setMaxFrames(Number(e.target.value))}
          />
          <span className="control-value">{maxFrames}</span>
        </label>
        <p className="text-sm text-muted video-import-hint">
          Up to {MAX_VIDEO_IMPORT_FRAMES} frames · ~{clipSeconds}s at {DEFAULT_VIDEO_IMPORT_FPS} fps · from the start of the video
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            className="btn btn-primary"
            disabled={importing}
            onClick={() => onImport(maxFrames)}
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
