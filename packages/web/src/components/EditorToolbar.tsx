import { useId, useRef } from 'react';

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff3b3b', '#3bff5a', '#3b7cff', '#ffeb3b',
  '#ff3bff', '#3bfff0', '#ff8c3b', '#9b59b6', '#8b7355', '#4f7cff',
];

type Tool = 'pencil' | 'eraser' | 'fill' | 'live-area';

const TOOL_META: Record<Tool, { label: string; hint: string }> = {
  pencil: { label: 'Pencil', hint: 'Draw pixels' },
  eraser: { label: 'Eraser', hint: 'Erase to black' },
  fill: { label: 'Fill', hint: 'Flood fill matching area' },
  'live-area': { label: 'Live region', hint: 'Drag on canvas to draw a data region (live projects)' },
};

function ToolIcon({ tool }: { tool: Tool }) {
  switch (tool) {
    case 'pencil':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
          />
        </svg>
      );
    case 'eraser':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8.28 4l-4.6 4.6a2 2 0 0 0 0 2.83l7.07 7.07a2 2 0 0 0 2.83 0L18.17 8l-2.12-2.12-7.77 7.77-2.83-2.83L8.28 4zm9.9 9.9l-1.41 1.41-2.12-2.12 1.41-1.41 2.12 2.12zM5 20h14v2H5v-2z"
          />
        </svg>
      );
    case 'fill':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.56 5.44l-1.41 1.41 2.12 2.12 1.41-1.41a1.5 1.5 0 0 0 0-2.12l-.71-.71a1.5 1.5 0 0 0-2.12 0zm-2.83 2.83l-7.07 7.07a2 2 0 0 0 0 2.83l1.41 1.41a2 2 0 0 0 2.83 0l7.07-7.07-4.24-4.24zM5.5 18.5a.5.5 0 0 1 .5-.5H9v2H6a.5.5 0 0 1-.5-.5z"
          />
        </svg>
      );
    case 'live-area':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3 2"
            d="M5 5h10v10H5z"
          />
          <circle cx="17" cy="17" r="3" fill="currentColor" />
        </svg>
      );
  }
}

export function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = normalizeHex(color);

  return (
    <div className="color-picker">
      <span className="color-picker-label">Brush color</span>
      <div className="color-picker-main">
        <button
          type="button"
          className="color-swatch-btn"
          style={{ background: normalized }}
          onClick={() => inputRef.current?.click()}
          title="Pick a custom color"
          aria-label={`Brush color ${normalized}. Click to open color picker.`}
        />
        <input
          ref={inputRef}
          id={inputId}
          type="color"
          className="color-input-hidden"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
        />
        <label className="color-hex-field" htmlFor={`${inputId}-hex`}>
          <span className="sr-only">Hex color</span>
          <input
            id={`${inputId}-hex`}
            type="text"
            className="color-hex-input"
            value={normalized}
            spellCheck={false}
            maxLength={7}
            onChange={(e) => {
              const next = normalizeHexInput(e.target.value);
              if (next) onChange(next);
            }}
          />
        </label>
      </div>
      <div className="color-presets" role="listbox" aria-label="Color presets">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            role="option"
            aria-selected={preset.toLowerCase() === normalized.toLowerCase()}
            className={`color-preset${preset.toLowerCase() === normalized.toLowerCase() ? ' active' : ''}`}
            style={{ background: preset }}
            title={preset}
            aria-label={preset}
            onClick={() => onChange(preset)}
          />
        ))}
      </div>
    </div>
  );
}

export function EditorToolBar({
  tools,
  activeTool,
  onToolChange,
  color,
  onColorChange,
  editorZoom,
  onEditorZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tools: Tool[];
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (hex: string) => void;
  editorZoom: number;
  onEditorZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-tools">
        <span className="editor-toolbar-label">Tools</span>
        <div className="tool-group" role="toolbar" aria-label="Drawing tools">
          <button
            type="button"
            className="tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
          >
            <RedoIcon />
          </button>
          <span className="tool-divider" aria-hidden="true" />
          {tools.map((id) => {
            const meta = TOOL_META[id];
            return (
              <button
                key={id}
                type="button"
                className={`tool-btn${activeTool === id ? ' active' : ''}`}
                onClick={() => onToolChange(id)}
                title={meta.hint}
                aria-label={meta.label}
                aria-pressed={activeTool === id}
              >
                <ToolIcon tool={id} />
              </button>
            );
          })}
        </div>
      </div>

      <ColorPicker color={color} onChange={onColorChange} />

      <div className="editor-zoom-control">
        <label className="editor-toolbar-label" htmlFor="editor-zoom">
          Zoom {editorZoom}×
        </label>
        <input
          id="editor-zoom"
          type="range"
          min={4}
          max={12}
          value={editorZoom}
          onChange={(e) => onEditorZoomChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function normalizeHex(hex: string): string {
  const v = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '#4f7cff';
}

function normalizeHexInput(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  return null;
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.5 8c-2.65 0-5.05 1.16-6.7 3l-2.52-2.52-1.41 1.41L3.7 12l1.88 1.88 1.41-1.41-2.55-2.55C5.56 9.78 8.84 8.5 12.5 8c3.53 0 6.82 1.19 9.24 3.36l-1.51 1.51C18.02 11.58 15.36 10.5 12.5 10.5c-1.55 0-3 .45-4.22 1.22L11 15h8V7l-3.28 3.28C14.55 8.45 13.57 8 12.5 8z"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.4 10.6C16.55 8.99 14.07 8 11.5 8c-1.07 0-2.05.45-2.78 1.22L7 7H0v8h7l-1.72-1.72C7 11.45 8 11 9.05 11c2.67 0 5.15 1.16 6.7 3l2.52-2.52 1.41 1.41L20.3 12l-1.88-1.9-1.41 1.4z"
      />
    </svg>
  );
}
