import {
  normalizeFlipNoteAppConfig,
  type FlipNoteBackgroundMode,
  type FlipNoteConfig,
  type FlipNoteGradientOrigin,
  type FlipNoteTextAlign,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

function colorInputValue(hex: string): string {
  const normalized = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#f4e4bc';
}

function HexColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flip-note-color-picker-row">
        <input
          id={id}
          type="color"
          value={colorInputValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          value={value}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

function sanitizeLine(line: string): string {
  return line.toUpperCase().replace(/[^A-Z0-9 !?.,'-]/g, '').slice(0, 8);
}

function messagesToBlocks(messages: string[], boardLines: number): string[][] {
  if (messages.length === 0) {
    return [Array.from({ length: boardLines }, () => '')];
  }
  const blocks: string[][] = [];
  for (let i = 0; i < messages.length; i += boardLines) {
    blocks.push(Array.from({ length: boardLines }, (_, row) => messages[i + row] ?? ''));
  }
  return blocks;
}

function blocksToMessages(blocks: string[][]): string[] {
  return blocks.flatMap((block) => block.map((line) => sanitizeLine(line)));
}

/** Board appearance controls — lives in the Flip Note studio sidebar. */
export function FlipNoteBoardPanel({ project, onChange }: Props) {
  const config = normalizeFlipNoteAppConfig(project.appConfig);
  const blocks = messagesToBlocks(config.messages, config.boardLines);

  const applyConfig = (next: FlipNoteConfig) => {
    onChange({ ...next });
  };

  const setBoardLines = (boardLines: 1 | 2 | 3) => {
    const regrouped = blocksToMessages(blocks);
    const nextBlocks = messagesToBlocks(regrouped, boardLines);
    applyConfig({ ...config, boardLines, messages: blocksToMessages(nextBlocks) });
  };

  return (
    <section className="flip-note-sidebar-board" aria-label="Board settings">
      <h3 className="flip-note-section-title">Board</h3>
      <div className="flip-note-sidebar-board-fields">
        <Field label="Lines on board" htmlFor="flip-note-board-lines">
          <select
            id="flip-note-board-lines"
            className="select w-full"
            value={config.boardLines}
            onChange={(e) => setBoardLines(Number(e.target.value) as 1 | 2 | 3)}
          >
            <option value={1}>1 line</option>
            <option value={2}>2 lines</option>
            <option value={3}>3 lines</option>
          </select>
        </Field>
        <Field label="Text alignment" htmlFor="flip-note-text-align">
          <select
            id="flip-note-text-align"
            className="select w-full"
            value={config.textAlign}
            onChange={(e) => applyConfig({ ...config, textAlign: e.target.value as FlipNoteTextAlign })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Field>
        <HexColorField
          id="flip-note-text-color"
          label="Text color"
          value={config.textColor}
          onChange={(textColor) => applyConfig({ ...config, textColor })}
        />
        <Field label="Background" htmlFor="flip-note-background-mode">
          <select
            id="flip-note-background-mode"
            className="select w-full"
            value={config.backgroundMode}
            onChange={(e) =>
              applyConfig({ ...config, backgroundMode: e.target.value as FlipNoteBackgroundMode })
            }
          >
            <option value="solid">Solid color</option>
            <option value="gradient">Gradient</option>
          </select>
        </Field>
        {config.backgroundMode === 'solid' ? (
          <HexColorField
            id="flip-note-background-color"
            label="Background color"
            value={config.backgroundColor}
            onChange={(backgroundColor) => applyConfig({ ...config, backgroundColor })}
          />
        ) : (
          <>
            <HexColorField
              id="flip-note-gradient-start"
              label="Gradient start"
              value={config.backgroundColor}
              onChange={(backgroundColor) => applyConfig({ ...config, backgroundColor })}
            />
            <HexColorField
              id="flip-note-gradient-end"
              label="Gradient end"
              value={config.backgroundGradientEnd}
              onChange={(backgroundGradientEnd) => applyConfig({ ...config, backgroundGradientEnd })}
            />
            <Field label="Gradient angle" htmlFor="flip-note-gradient-angle">
              <NumberSlider
                id="flip-note-gradient-angle"
                min={0}
                max={359}
                value={config.backgroundGradientAngle}
                formatValue={(v) => `${v}°`}
                aria-valuetext={`${config.backgroundGradientAngle} degrees`}
                onChange={(backgroundGradientAngle) =>
                  applyConfig({ ...config, backgroundGradientAngle })
                }
              />
            </Field>
            <Field label="Gradient origin" htmlFor="flip-note-gradient-origin">
              <select
                id="flip-note-gradient-origin"
                className="select w-full"
                value={config.backgroundGradientOrigin}
                onChange={(e) =>
                  applyConfig({
                    ...config,
                    backgroundGradientOrigin: e.target.value as FlipNoteGradientOrigin,
                  })
                }
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </Field>
          </>
        )}
      </div>
    </section>
  );
}
