import { useEffect, useState } from 'react';
import {
  MAX_AI_MUSE_FEED,
  normalizeAiMuseAppConfig,
  type AiMuseConfig,
  type AiMuseFeedItem,
} from '@pixopen/core';
import { api, type AiMuseGeneratedItem, type GeminiStatus } from '../lib/api';
import { Field } from './ControlSection';

type Props = {
  appConfig: Record<string, unknown>;
  onChange: (next: AiMuseConfig) => void;
};

function toFeedItem(row: AiMuseGeneratedItem): AiMuseFeedItem {
  return {
    id: row.id,
    url: `/api/ai-muse/library/${encodeURIComponent(row.filename)}`,
    width: row.width || 1024,
    height: row.height || 1024,
  };
}

export function AiMuseGenerate({ appConfig, onChange }: Props) {
  const config = normalizeAiMuseAppConfig(appConfig);
  const [status, setStatus] = useState<GeminiStatus | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gemini-3.1-flash-image');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<AiMuseGeneratedItem[]>([]);

  const reloadSaved = () => {
    void api.aiMuse
      .generated()
      .then((res) => setSaved(res.items ?? []))
      .catch(() => setSaved([]));
  };

  useEffect(() => {
    let cancelled = false;
    void api.aiMuse
      .geminiStatus()
      .then((s) => {
        if (cancelled) return;
        setStatus(s);
        if (s.models[0]?.id) setModel(s.models[0].id);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    reloadSaved();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = (patch: Partial<AiMuseConfig>) => {
    onChange({ ...config, ...patch });
  };

  const saveKey = async () => {
    setBusy(true);
    setMessage('');
    try {
      const next = await api.aiMuse.saveGeminiKey(apiKeyDraft);
      setStatus(next);
      setApiKeyDraft('');
      setMessage('Gemini API key saved. Generations bill your Gemini credits.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save key');
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async () => {
    setBusy(true);
    setMessage('');
    try {
      const next = await api.aiMuse.clearGeminiKey();
      setStatus(next);
      setMessage('Cleared studio-stored key (env key still used if set).');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not clear key');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (config.feed.length >= MAX_AI_MUSE_FEED) {
      setMessage(`Feed is full (max ${MAX_AI_MUSE_FEED}). Remove some images first.`);
      return;
    }
    setBusy(true);
    setMessage('Generating with Nano Banana… this uses your Gemini credits.');
    try {
      const result = await api.aiMuse.generate({
        prompt,
        appConfig: { ...config },
        model,
      });
      const feed = [result.item, ...config.feed.filter((item) => item.id !== result.item.id)].slice(
        0,
        MAX_AI_MUSE_FEED,
      );
      apply({ feed });
      reloadSaved();
      setMessage(`Saved to library and added to feed · ${result.model}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  };

  const addSavedToFeed = (row: AiMuseGeneratedItem) => {
    if (config.feed.some((item) => item.id === row.id)) {
      setMessage('Already in the feed');
      return;
    }
    if (config.feed.length >= MAX_AI_MUSE_FEED) {
      setMessage(`Feed is full (max ${MAX_AI_MUSE_FEED})`);
      return;
    }
    apply({ feed: [toFeedItem(row), ...config.feed] });
    setMessage('Added saved image to feed');
  };

  return (
    <section className="ai-muse-generate-panel" aria-label="Nano Banana generate">
      <h3 className="ai-muse-section-title">Nano Banana (Gemini)</h3>
      <p className="muted text-sm m-0">
        Prompt with your Gemini API key. Every paid image is saved on disk under{' '}
        <code>packages/server/data/ai-muse/library</code> and listed below — even if you refresh the Civitai feed.
      </p>

      <div className="ai-muse-generate-key-row">
        <Field label="Gemini API key" htmlFor="ai-muse-gemini-key">
          <input
            id="ai-muse-gemini-key"
            className="input w-full"
            type="password"
            autoComplete="off"
            placeholder={
              status?.configured
                ? `Configured (${status.apiKeyPreview}) via ${status.source}`
                : 'Paste key from Google AI Studio'
            }
            value={apiKeyDraft}
            disabled={busy}
            onChange={(e) => setApiKeyDraft(e.target.value)}
          />
        </Field>
        <div className="ai-muse-generate-key-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy || !apiKeyDraft.trim()}
            onClick={() => void saveKey()}
          >
            Save key
          </button>
          {status?.source === 'studio' ? (
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void clearKey()}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <p className="muted text-xs m-0">
        Get a key at{' '}
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          aistudio.google.com/apikey
        </a>
        . Paid Tier 1 billing required for image models.
      </p>

      <Field label="Model" htmlFor="ai-muse-nano-model">
        <select
          id="ai-muse-nano-model"
          className="select w-full"
          value={model}
          disabled={busy}
          onChange={(e) => setModel(e.target.value)}
        >
          {(status?.models ?? [{ id: 'gemini-3.1-flash-image', label: 'Nano Banana 2' }]).map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Your prompt" htmlFor="ai-muse-nano-prompt">
        <textarea
          id="ai-muse-nano-prompt"
          className="textarea w-full"
          rows={3}
          placeholder="e.g. soft window light, linen shirt, looking at camera, cafe..."
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </Field>
      <p className="muted text-xs m-0">
        Look preferences (age, hair, ethnicity, setting) are mixed into the prompt automatically. SFW photoreal only.
      </p>

      <div className="ai-muse-feed-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !status?.configured}
          onClick={() => void generate()}
        >
          {busy ? 'Generating…' : 'Generate & save'}
        </button>
      </div>

      {message ? <p className="muted text-xs m-0 ai-muse-feed-status">{message}</p> : null}

      <div className="ai-muse-saved-block">
        <div className="ai-muse-feed-header">
          <h3 className="ai-muse-section-title">Saved generations</h3>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={reloadSaved}>
            Reload
          </button>
        </div>
        <p className="muted text-xs m-0">
          On disk permanently. Open folder:{' '}
          <code>packages/server/data/ai-muse/library</code>
        </p>
        {saved.length === 0 ? (
          <p className="muted text-sm m-0">No paid generations saved yet.</p>
        ) : (
          <ul className="ai-muse-feed-grid">
            {saved.map((row) => {
              const inFeed = config.feed.some((item) => item.id === row.id);
              const src = `/api/ai-muse/library/${encodeURIComponent(row.filename)}`;
              return (
                <li key={row.id} className="ai-muse-feed-card">
                  <a href={src} target="_blank" rel="noreferrer" title={row.prompt}>
                    <img src={src} alt="" className="ai-muse-feed-thumb" loading="lazy" />
                  </a>
                  <div className="ai-muse-feed-card-bar">
                    <span className="ai-muse-feed-index">
                      {new Date(row.createdAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy || inFeed}
                      onClick={() => addSavedToFeed(row)}
                    >
                      {inFeed ? 'In feed' : 'Add'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
