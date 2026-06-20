import { useState } from 'react';
import {
  normalizeFlipNoteAppConfig,
  type FlipNoteConfig,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { FlipNotePreview } from './FlipNotePreview';

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

function configFrom(project: Project): FlipNoteConfig {
  return normalizeFlipNoteAppConfig(project.appConfig);
}

const FLIP_NOTE_PREVIEW_SCALE = 8;

export function FlipNoteStudio({ project, onChange }: Props) {
  const config = configFrom(project);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const blocks = messagesToBlocks(config.messages, config.boardLines);
  const messageCount = blocks.length;

  const applyConfig = (next: FlipNoteConfig) => {
    onChange({ ...next });
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

  const updateTiming = (patch: Partial<Pick<FlipNoteConfig, 'holdMs' | 'flipMs'>>) => {
    applyConfig({ ...config, ...patch });
  };

  return (
    <div className="flip-note-studio">
      <section className="flip-note-preview-panel" aria-label="Animation preview">
        <div className="flip-note-preview-toolbar">
          <span className="field-label">Preview</span>
          <div className="flip-note-preview-controls">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setPreviewPlaying((p) => !p)}
            >
              {previewPlaying ? 'Pause' : 'Play'} animation
            </button>
          </div>
        </div>
        <div className="flip-note-preview-stage">
          <FlipNotePreview
            appConfig={project.appConfig}
            scale={FLIP_NOTE_PREVIEW_SCALE}
            playing={previewPlaying}
          />
        </div>
        <p className="muted flip-note-preview-hint">
          {previewPlaying
            ? 'Animation is running — edit messages anytime to update the preview.'
            : 'Paused — click Play to see messages refresh.'}
        </p>
      </section>

      <section className="flip-note-messages-panel">
        <div className="flip-note-messages-header">
          <h3 className="flip-note-section-title">Messages</h3>
          <button type="button" onClick={addMessage}>Add message</button>
        </div>
        <p className="muted flip-note-messages-hint">
          {messageCount} message{messageCount === 1 ? '' : 's'} · up to 8 characters per line
        </p>
        <div className="flip-note-message-list">
          {blocks.map((block, blockIndex) => (
            <article key={blockIndex} className="flip-note-message-block">
              <div className="flip-note-message-block-head">
                <span className="flip-note-message-block-label">Message {blockIndex + 1}</span>
                {blocks.length > 1 ? (
                  <button
                    type="button"
                    className="btn btn-error btn-xs"
                    onClick={() => removeMessage(blockIndex)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {block.map((line, lineIndex) => (
                <input
                  key={lineIndex}
                  className="flip-note-message-line"
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

      <section className="flip-note-timing-panel">
        <Field label="Display each message (seconds)" htmlFor="flip-note-hold-sec">
          <input
            id="flip-note-hold-sec"
            type="number"
            min={0.5}
            step={0.5}
            value={config.holdMs / 1000}
            onChange={(e) => updateTiming({ holdMs: Math.max(500, Number(e.target.value) * 1000) })}
          />
        </Field>
        <Field label="Refresh animation (seconds)" htmlFor="flip-note-flip-sec">
          <input
            id="flip-note-flip-sec"
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
