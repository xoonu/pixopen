import { useEffect, useRef, useState } from 'react';
import {
  MAX_INSTAGRAM_ACCOUNTS,
  MAX_INSTAGRAM_BLOCKED,
  MAX_INSTAGRAM_FEED,
  normalizeInstagramFeedAppConfig,
  normalizeInstagramUsername,
  shuffleInstagramFeed,
  type InstagramAccountStatus,
  type InstagramFeedConfig,
  type InstagramFeedItem,
} from '@pixopen/core';
import { api } from '../lib/api';
import { Icon, icons } from './icons';

type Props = {
  appConfig: Record<string, unknown>;
  onChange: (next: InstagramFeedConfig) => void;
};

function moveItem(feed: InstagramFeedItem[], from: number, to: number): InstagramFeedItem[] {
  if (from === to || from < 0 || to < 0 || from >= feed.length || to >= feed.length) return feed;
  const next = [...feed];
  const [item] = next.splice(from, 1);
  if (!item) return feed;
  next.splice(to, 0, item);
  return next;
}

export function InstagramFeedAccounts({ appConfig, onChange }: Props) {
  const config = normalizeInstagramFeedAppConfig(appConfig);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [accountStatuses, setAccountStatuses] = useState<InstagramAccountStatus[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const autoRefreshTried = useRef(false);

  const apply = (patch: Partial<InstagramFeedConfig>) => {
    onChange({ ...config, ...patch });
  };

  const refreshFeed = async () => {
    if (config.accounts.length === 0) {
      setStatus('Add at least one Instagram username first');
      return;
    }
    setBusy(true);
    setStatus('Refreshing Instagram posts…');
    try {
      const result = await api.instagramFeed.refresh({ ...config });
      setAccountStatuses(result.accounts);
      if (result.error && result.feed.length === 0) {
        setStatus(result.error);
        return;
      }
      apply({ feed: result.feed });
      const ok = result.accounts.filter((a) => a.ok).length;
      const bad = result.accounts.filter((a) => !a.ok);
      setStatus(
        bad.length === 0
          ? `Loaded ${result.feed.length} images from ${ok} account${ok === 1 ? '' : 's'}`
          : `Loaded ${result.feed.length} images · ${bad.map((a) => `@${a.username}: ${a.error}`).join('; ')}`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not refresh Instagram feed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoRefreshTried.current) return;
    if (config.accounts.length === 0 || config.feed.length > 0) return;
    autoRefreshTried.current = true;
    void refreshFeed();
  }, []);

  const addAccount = () => {
    const username = normalizeInstagramUsername(draft);
    if (!username) {
      setStatus('Enter a valid Instagram username');
      return;
    }
    if (config.accounts.includes(username)) {
      setStatus(`@${username} is already included`);
      return;
    }
    if (config.accounts.length >= MAX_INSTAGRAM_ACCOUNTS) {
      setStatus(`Up to ${MAX_INSTAGRAM_ACCOUNTS} accounts`);
      return;
    }
    apply({ accounts: [...config.accounts, username] });
    setDraft('');
    setStatus(`Added @${username} — hit Refresh feed to pull photos`);
  };

  const removeAccount = (username: string) => {
    apply({
      accounts: config.accounts.filter((a) => a !== username),
      feed: config.feed.filter((item) => item.username !== username),
    });
    setAccountStatuses((prev) => prev.filter((a) => a.username !== username));
    setStatus(`Removed @${username}`);
  };

  const removeAt = (index: number) => {
    const item = config.feed[index];
    if (!item) return;
    const feed = config.feed.filter((_, i) => i !== index);
    const blockedIds = [...config.blockedIds.filter((id) => id !== item.id), item.id].slice(
      -MAX_INSTAGRAM_BLOCKED,
    );
    apply({ feed, blockedIds });
    setStatus('Removed from feed');
  };

  const shuffle = () => {
    if (config.feed.length < 2) return;
    apply({ feed: shuffleInstagramFeed(config.feed) });
    setStatus('Shuffled');
  };

  const onDrop = (to: number) => {
    if (dragIndex == null) return;
    apply({ feed: moveItem(config.feed, dragIndex, to) });
    setDragIndex(null);
  };

  return (
    <section className="instagram-feed-panel" aria-label="Instagram accounts and feed">
      <div className="instagram-feed-header">
        <div>
          <h3 className="instagram-feed-section-title">Accounts</h3>
          <p className="muted text-sm m-0">
            Add up to {MAX_INSTAGRAM_ACCOUNTS} public usernames. Static images only — videos are skipped.
          </p>
        </div>
        <div className="instagram-feed-actions">
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
            className="btn btn-sm btn-primary"
            disabled={busy || config.accounts.length === 0}
            onClick={() => void refreshFeed()}
          >
            Refresh feed
          </button>
        </div>
      </div>

      <div className="instagram-feed-url-row">
        <input
          className="input"
          type="text"
          placeholder="@username or profile URL"
          value={draft}
          disabled={busy || config.accounts.length >= MAX_INSTAGRAM_ACCOUNTS}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAccount();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy || !draft.trim() || config.accounts.length >= MAX_INSTAGRAM_ACCOUNTS}
          onClick={addAccount}
        >
          Add
        </button>
      </div>

      {config.accounts.length > 0 ? (
        <ul className="instagram-feed-account-list">
          {config.accounts.map((username) => {
            const st = accountStatuses.find((a) => a.username === username);
            return (
              <li key={username} className="instagram-feed-account-chip">
                <span>@{username}</span>
                {st ? (
                  <span className="muted text-xs">
                    {st.ok ? `${st.imageCount} imgs` : st.error}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  disabled={busy}
                  aria-label={`Remove @${username}`}
                  onClick={() => removeAccount(username)}
                >
                  <Icon icon={icons.delete} size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted text-sm m-0">Add one public Instagram username to get started.</p>
      )}

      {status ? <p className="muted text-xs m-0 instagram-feed-status">{status}</p> : null}

      <h3 className="instagram-feed-section-title">Image feed</h3>
      {config.feed.length === 0 && !busy ? (
        <p className="muted text-sm m-0">No images yet — add accounts and hit Refresh feed.</p>
      ) : (
        <ul className="instagram-feed-grid">
          {config.feed.map((item, index) => (
            <li
              key={item.id}
              className={`instagram-feed-card${dragIndex === index ? ' is-dragging' : ''}`}
              draggable={!busy}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
            >
              <img
                src={item.url}
                alt=""
                className="instagram-feed-thumb"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="instagram-feed-card-bar">
                <span className="instagram-feed-index">@{item.username}</span>
                <div className="instagram-feed-card-actions">
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
        {config.feed.length}/{MAX_INSTAGRAM_FEED} in feed
        {config.blockedIds.length > 0 ? ` · ${config.blockedIds.length} blocked` : ''}
        {' · '}accounts interleaved for variety · square photos preferred · face-aware crop
      </p>
    </section>
  );
}
