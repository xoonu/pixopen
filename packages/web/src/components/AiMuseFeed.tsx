import { useEffect, useRef, useState } from 'react';
import {
  isAiMuseFeedUrl,
  MAX_AI_MUSE_BLOCKED,
  MAX_AI_MUSE_FEED,
  normalizeAiMuseAppConfig,
  shuffleAiMuseFeed,
  type AiMuseConfig,
  type AiMuseFeedItem,
} from '@pixopen/core';
import { api } from '../lib/api';
import { Icon, icons } from './icons';

type Props = {
  appConfig: Record<string, unknown>;
  onChange: (next: AiMuseConfig) => void;
};

function moveItem(feed: AiMuseFeedItem[], from: number, to: number): AiMuseFeedItem[] {
  if (from === to || from < 0 || to < 0 || from >= feed.length || to >= feed.length) return feed;
  const next = [...feed];
  const [item] = next.splice(from, 1);
  if (!item) return feed;
  next.splice(to, 0, item);
  return next;
}

function hashUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i += 1) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return `url:${h.toString(16)}`;
}

export function AiMuseFeed({ appConfig, onChange }: Props) {
  const config = normalizeAiMuseAppConfig(appConfig);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const autoFillTried = useRef(false);

  const apply = (patch: Partial<AiMuseConfig>) => {
    onChange({ ...config, ...patch });
  };

  const fillFeed = async (mode: 'append' | 'replace') => {
    setBusy(true);
    setStatus(mode === 'replace' ? 'Refreshing feed…' : 'Finding images…');
    try {
      // Never drop paid / local library images when refreshing Civitai picks.
      const keepLocal = config.feed.filter(
        (item) =>
          item.id.startsWith('nano-') ||
          item.id.startsWith('library:') ||
          item.url.startsWith('/api/ai-muse/library/'),
      );
      const baseConfig =
        mode === 'replace'
          ? { ...config, feed: keepLocal }
          : config;
      const result = await api.aiMuse.candidates({ ...baseConfig });
      if (result.error && result.items.length === 0) {
        setStatus(result.error);
        return;
      }
      const nextFeed =
        mode === 'replace'
          ? [...keepLocal, ...result.items].slice(0, MAX_AI_MUSE_FEED)
          : [...config.feed, ...result.items].slice(0, MAX_AI_MUSE_FEED);
      apply({ feed: nextFeed });
      setStatus(
        mode === 'replace'
          ? `Loaded ${nextFeed.length} images (${keepLocal.length} kept from library)`
          : `Added ${result.items.length} · ${nextFeed.length} in feed`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load candidates');
    } finally {
      setBusy(false);
    }
  };

  // Auto-fill once when the feed is empty so settings isn't a blank slate.
  useEffect(() => {
    if (autoFillTried.current || config.feed.length > 0) return;
    autoFillTried.current = true;
    void fillFeed('replace');
  }, []);

  const removeAt = (index: number) => {
    const item = config.feed[index];
    if (!item) return;
    const feed = config.feed.filter((_, i) => i !== index);
    const blockedIds = [...config.blockedIds.filter((id) => id !== item.id), item.id].slice(
      -MAX_AI_MUSE_BLOCKED,
    );
    apply({ feed, blockedIds });
    setStatus('Removed from feed');
  };

  const shuffle = () => {
    if (config.feed.length < 2) return;
    apply({ feed: shuffleAiMuseFeed(config.feed) });
    setStatus('Shuffled');
  };

  const onDrop = (to: number) => {
    if (dragIndex == null) return;
    apply({ feed: moveItem(config.feed, dragIndex, to) });
    setDragIndex(null);
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!isAiMuseFeedUrl(url)) {
      setStatus('Paste an https:// image URL');
      return;
    }
    if (config.feed.length >= MAX_AI_MUSE_FEED) {
      setStatus(`Feed is full (max ${MAX_AI_MUSE_FEED})`);
      return;
    }
    if (config.feed.some((item) => item.url === url)) {
      setStatus('That URL is already in the feed');
      return;
    }
    const id = hashUrl(url);
    apply({
      feed: [...config.feed, { id, url, width: 1024, height: 1024 }],
    });
    setUrlDraft('');
    setStatus('Added URL to feed');
  };

  return (
    <section className="ai-muse-feed-panel" aria-label="Image feed">
      <div className="ai-muse-feed-header">
        <div>
          <h3 className="ai-muse-section-title">Image feed</h3>
          <p className="muted text-sm m-0">
            Photoreal women only. If the playlist looks wrong, hit Refresh feed to rebuild it.
          </p>
        </div>
        <div className="ai-muse-feed-actions">
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || config.feed.length < 2}
            onClick={shuffle}
          >
            Shuffle
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || config.feed.length >= MAX_AI_MUSE_FEED}
            onClick={() => void fillFeed('append')}
          >
            Find more
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={() => void fillFeed('replace')}
          >
            Refresh feed
          </button>
        </div>
      </div>

      <div className="ai-muse-url-row">
        <input
          className="input"
          type="url"
          placeholder="Paste https:// image URL…"
          value={urlDraft}
          disabled={busy}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <button type="button" className="btn btn-sm" disabled={busy || !urlDraft.trim()} onClick={addUrl}>
          Add URL
        </button>
      </div>

      {status ? <p className="muted text-xs m-0 ai-muse-feed-status">{status}</p> : null}

      {config.feed.length === 0 && !busy ? (
        <p className="muted text-sm m-0">No images yet — hit Refresh feed to pull a new set.</p>
      ) : (
        <ul className="ai-muse-feed-grid">
          {config.feed.map((item, index) => (
            <li
              key={item.id}
              className={`ai-muse-feed-card${dragIndex === index ? ' is-dragging' : ''}`}
              draggable={!busy}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
            >
              <img
                src={item.url}
                alt=""
                className="ai-muse-feed-thumb"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="ai-muse-feed-card-bar">
                <span className="ai-muse-feed-index">{index + 1}</span>
                <div className="ai-muse-feed-card-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    disabled={busy || index === 0}
                    aria-label="Move earlier"
                    onClick={() => apply({ feed: moveItem(config.feed, index, index - 1) })}
                  >
                    <Icon icon={icons.arrowLeft} size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    disabled={busy || index >= config.feed.length - 1}
                    aria-label="Move later"
                    onClick={() => apply({ feed: moveItem(config.feed, index, index + 1) })}
                  >
                    <Icon icon={icons.arrowRight} size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    disabled={busy}
                    aria-label="Remove from feed"
                    onClick={() => removeAt(index)}
                  >
                    <Icon icon={icons.delete} size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="muted text-xs m-0">
        {config.feed.length}/{MAX_AI_MUSE_FEED} in feed
        {config.blockedIds.length > 0 ? ` · ${config.blockedIds.length} blocked` : ''}
        {' · '}drag cards or use arrows to reorder
      </p>
    </section>
  );
}
