import { useId, useRef } from 'react';
import { Icon, icons } from './icons';

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
  const icon = {
    pencil: icons.pencil,
    eraser: icons.eraser,
    fill: icons.fill,
    'live-area': icons.liveArea,
  }[tool];
  return <Icon icon={icon} size={20} />;
}

export function ColorPicker({
  color,
  onChange,
  compact = false,
}: {
  color: string;
  onChange: (hex: string) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = normalizeHex(color);

  if (compact) {
    return (
      <div className="color-picker color-picker-swatch-only">
        <button
          type="button"
          className="tool-btn color-swatch-tool"
          style={{ background: normalized }}
          onClick={() => inputRef.current?.click()}
          title="Brush color"
          aria-label={`Brush color ${normalized}. Click to choose a color.`}
        />
        <input
          ref={inputRef}
          id={inputId}
          type="color"
          className="color-input-hidden"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

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

/** Canvas zoom control — horizontal in the toolbar, or vertical beside the canvas. */
export function EditorCanvasZoom({
  editorZoom,
  onEditorZoomChange,
  orientation = 'horizontal',
  label = 'Zoom',
  className = '',
}: {
  editorZoom: number;
  onEditorZoomChange: (zoom: number) => void;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}) {
  return (
    <label
      className={`editor-canvas-zoom${orientation === 'vertical' ? ' editor-canvas-zoom-vertical' : ''}${className ? ` ${className}` : ''}`}
    >
      <span className="editor-canvas-zoom-label">{label}</span>
      <input
        type="range"
        min={4}
        max={12}
        value={editorZoom}
        onChange={(e) => onEditorZoomChange(Number(e.target.value))}
        aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
        aria-valuetext={`${editorZoom}×`}
      />
      <span className="editor-canvas-zoom-value">{editorZoom}×</span>
    </label>
  );
}

/** Tool strip beside or above the canvas. */
export function EditorCanvasBar({
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
  layout = 'row',
  showZoom = true,
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
  layout?: 'row' | 'column';
  showZoom?: boolean;
}) {
  const showColor = activeTool !== 'eraser' && activeTool !== 'live-area';

  return (
    <div
      className={`editor-canvas-bar${layout === 'column' ? ' editor-canvas-bar-column' : ''}`}
      role="toolbar"
      aria-label="Canvas tools"
      aria-orientation={layout === 'column' ? 'vertical' : 'horizontal'}
    >
      <div className="editor-canvas-bar-group" role="group" aria-label="History">
        <button
          type="button"
          className="tool-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
          aria-label="Undo"
        >
          <Icon icon={icons.undo} size={20} />
        </button>
        <button
          type="button"
          className="tool-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
          aria-label="Redo"
        >
          <Icon icon={icons.redo} size={20} />
        </button>
      </div>

      <span className="editor-canvas-bar-divider" aria-hidden="true" />

      <div className="editor-canvas-bar-group" role="group" aria-label="Drawing tools">
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

      {showColor ? (
        <>
          <span className="editor-canvas-bar-divider" aria-hidden="true" />
          <ColorPicker color={color} onChange={onColorChange} compact />
        </>
      ) : null}

      {showZoom ? (
        <>
          <span className="editor-canvas-bar-divider editor-canvas-bar-divider-end" aria-hidden="true" />
          <EditorCanvasZoom
            editorZoom={editorZoom}
            onEditorZoomChange={onEditorZoomChange}
          />
        </>
      ) : null}
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
