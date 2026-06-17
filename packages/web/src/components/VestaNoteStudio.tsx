import { useState } from 'react';
import {
  normalizeVestaAppConfig,
  type Project,
  type VestaNoteConfig,
  type VestaNoteLetterColorMode,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { VestaNotePreview } from './VestaNotePreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

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

function configFrom(project: Project): VestaNoteConfig {
  return normalizeVestaAppConfig(project.appConfig);
}

export function VestaNoteStudio({ project, onChange }: Props) {
  const config = configFrom(project);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewScale, setPreviewScale] = useState(8);
  const blocks = messagesToBlocks(config.messages, config.boardLines);
  const messageCount = blocks.length;

  const applyConfig = (next: VestaNoteConfig) => {
    onChange({ ...next });
  };

  const setBoardLines = (boardLines: 1 | 2 | 3) => {
    const regrouped = blocksToMessages(blocks);
    const nextBlocks = messagesToBlocks(regrouped, boardLines);
    applyConfig({ ...config, boardLines, messages: blocksToMessages(nextBlocks) });
  };

  const updateBlockLine = (blockIndex: number, lineIndex: number, value: string) => {
    const nextBlocks = blocks.map((block, bi) =>
      bi === blockIndex
        ? block.map((line, li) => (li === lineIndex ? value : line))
        : block,
    );
    applyConfig({ ...config, messages: blocksToMessages(nextBlocks) });
  };

  const addMessage = () => {
    const nextBlocks = [...blocks, Array.from({ length: config.boardLines }, () => '')];
    applyConfig({ ...config, messages: blocksToMessages(nextBlocks) });
  };

  const removeMessage = (blockIndex: number) => {
    if (blocks.length <= 1) return;
    const nextBlocks = blocks.filter((_, i) => i !== blockIndex);
    applyConfig({ ...config, messages: blocksToMessages(nextBlocks) });
  };

  const updateTiming = (patch: Partial<Pick<VestaNoteConfig, 'holdMs' | 'flipMs'>>) => {
    applyConfig({ ...config, ...patch });
  };

  const updateColorMode = (letterColorMode: VestaNoteLetterColorMode) => {
    applyConfig({ ...config, letterColorMode });
  };

  return (
    <div className="vesta-studio">
      <header className="vesta-studio-header">
        <h2>Vesta Note</h2>
        <p className="muted">
          Split-flap letter board — add messages below. Each message shows {config.boardLines} line
          {config.boardLines === 1 ? '' : 's'} on the board, then flips to the next.
        </p>
      </header>

      <section className="vesta-preview-panel" aria-label="Animation preview">
        <div className="vesta-preview-toolbar">
          <span className="field-label">Preview</span>
          <div className="vesta-preview-controls">
            <button
              type="button"
              className="primary"
              onClick={() => setPreviewPlaying((p) => !p)}
            >
              {previewPlaying ? 'Pause' : 'Play'} animation
            </button>
            <label className="vesta-zoom-control">
              <span className="muted">Zoom</span>
              <input
                type="range"
                min={4}
                max={12}
                value={previewScale}
                onChange={(e) => setPreviewScale(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
        <div className="vesta-preview-stage">
          <VestaNotePreview
            appConfig={project.appConfig}
            scale={previewScale}
            playing={previewPlaying}
          />
        </div>
        <p className="muted vesta-preview-hint">
          {previewPlaying
            ? 'Animation is running — edit messages anytime to update the preview.'
            : 'Paused — click Play to see messages flip.'}
        </p>
      </section>

      <section className="vesta-appearance-panel">
        <h3 className="vesta-section-title">Board</h3>
        <div className="vesta-appearance-grid">
          <Field label="Lines on board" htmlFor="vesta-board-lines">
            <select
              id="vesta-board-lines"
              value={config.boardLines}
              onChange={(e) => setBoardLines(Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value={1}>1 line</option>
              <option value={2}>2 lines</option>
              <option value={3}>3 lines</option>
            </select>
          </Field>
          <Field label="Letter color" htmlFor="vesta-letter-color-mode">
            <select
              id="vesta-letter-color-mode"
              value={config.letterColorMode}
              onChange={(e) => updateColorMode(e.target.value as VestaNoteLetterColorMode)}
            >
              <option value="classic">Classic (cream)</option>
              <option value="monochrome">Black &amp; white</option>
              <option value="custom">Custom color</option>
            </select>
          </Field>
          {config.letterColorMode === 'custom' ? (
            <Field label="Pick color" htmlFor="vesta-letter-color">
              <div className="vesta-color-picker-row">
                <input
                  id="vesta-letter-color"
                  type="color"
                  value={config.letterColor}
                  onChange={(e) => applyConfig({ ...config, letterColor: e.target.value })}
                />
                <input
                  type="text"
                  value={config.letterColor}
                  spellCheck={false}
                  onChange={(e) => applyConfig({ ...config, letterColor: e.target.value })}
                />
              </div>
            </Field>
          ) : null}
        </div>
      </section>

      <section className="vesta-messages-panel">
        <div className="vesta-messages-header">
          <h3 className="vesta-section-title">Messages</h3>
          <button type="button" onClick={addMessage}>Add message</button>
        </div>
        <p className="muted vesta-messages-hint">
          {messageCount} message{messageCount === 1 ? '' : 's'} · up to 8 characters per line
        </p>
        <div className="vesta-message-list">
          {blocks.map((block, blockIndex) => (
            <article key={blockIndex} className="vesta-message-block">
              <div className="vesta-message-block-head">
                <span className="vesta-message-block-label">Message {blockIndex + 1}</span>
                {blocks.length > 1 ? (
                  <button
                    type="button"
                    className="danger vesta-message-remove"
                    onClick={() => removeMessage(blockIndex)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {block.map((line, lineIndex) => (
                <input
                  key={lineIndex}
                  className="vesta-message-line"
                  value={line}
                  placeholder={
                    config.boardLines === 1
                      ? 'HELLO'
                      : `Line ${lineIndex + 1}${lineIndex === 0 ? ' (e.g. HELLO)' : ''}`
                  }
                  maxLength={8}
                  onChange={(e) => updateBlockLine(blockIndex, lineIndex, e.target.value)}
                />
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="vesta-timing-panel">
        <Field label="Display each message (seconds)" htmlFor="vesta-hold-sec">
          <input
            id="vesta-hold-sec"
            type="number"
            min={0.5}
            step={0.5}
            value={config.holdMs / 1000}
            onChange={(e) => updateTiming({ holdMs: Math.max(500, Number(e.target.value) * 1000) })}
          />
        </Field>
        <Field label="Flip animation (seconds)" htmlFor="vesta-flip-sec">
          <input
            id="vesta-flip-sec"
            type="number"
            min={0.1}
            step={0.05}
            value={config.flipMs / 1000}
            onChange={(e) => updateTiming({ flipMs: Math.max(100, Number(e.target.value) * 1000) })}
          />
        </Field>
      </section>
    </div>
  );
}
