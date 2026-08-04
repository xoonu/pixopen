import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Field } from './ControlSection';

type Status = {
  configured: boolean;
  hasRefreshToken: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  clientId: string;
  redirectUri: string;
  source: 'studio' | 'env' | 'mixed' | 'none';
};

type Props = {
  onConnected?: () => void;
  compact?: boolean;
};

const FALLBACK_REDIRECT = 'http://127.0.0.1:3847/callback';

export function SpotifyCredentialsForm({ onConnected, compact = false }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  const redirectUri = status?.redirectUri || FALLBACK_REDIRECT;

  useEffect(() => {
    let cancelled = false;

    const applyStatus = (s: Status, notifyConnected: boolean) => {
      if (cancelled) return;
      setStatus(s);
      if (s.clientId) setClientId(s.clientId);
      if (notifyConnected && s.configured) onConnectedRef.current?.();
    };

    void api.spotify
      .status()
      .then((s) => applyStatus(s, false))
      .catch(() => {
        if (!cancelled) setStatus(null);
      });

    const params = new URLSearchParams(window.location.search);
    const spotify = params.get('spotify');
    if (spotify === 'connected') {
      setMessage('Connected to Spotify.');
      void api.spotify.status().then((s) => applyStatus(s, true));
      window.history.replaceState({}, '', window.location.pathname || '/');
    } else if (spotify === 'error') {
      setMessage(params.get('message') || 'Spotify authorization failed');
      window.history.replaceState({}, '', window.location.pathname || '/');
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage(`Copy this Redirect URI into Spotify settings: ${redirectUri}`);
    }
  };

  const connect = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { authorizeUrl } = await api.spotify.startAuth({
        clientId,
        clientSecret,
      });
      window.location.assign(authorizeUrl);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not start Spotify login');
      setBusy(false);
    }
  };

  const idPrefix = compact ? 'side' : 'main';

  return (
    <div className={`spotify-credentials-form${compact ? ' is-compact' : ''}`}>
      {!compact ? <h3 className="spotify-now-playing-section-title">Connect Spotify</h3> : null}
      <ol className="spotify-setup-steps muted m-0 text-sm">
        <li>
          Create an app at{' '}
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
            developer.spotify.com/dashboard
          </a>
          .
        </li>
        <li>
          Open <strong>Settings</strong> → <strong>Redirect URIs</strong> → add this exact URI (not localhost):
          <div className="spotify-redirect-row">
            <code className="spotify-redirect-uri">{redirectUri}</code>
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => void copyRedirectUri()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          Then click <strong>Save</strong> in the Spotify dashboard.
        </li>
        <li>Paste Client ID + Client secret below, then <strong>Connect with Spotify</strong>.</li>
      </ol>
      <div className="spotify-now-playing-sidebar-fields">
        <Field label="Client ID" htmlFor={`spotify-client-id-${idPrefix}`}>
          <input
            id={`spotify-client-id-${idPrefix}`}
            type="text"
            className="input w-full font-mono"
            value={clientId}
            placeholder="Client ID"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setClientId(e.target.value)}
          />
        </Field>
        <Field label="Client secret" htmlFor={`spotify-client-secret-${idPrefix}`}>
          <input
            id={`spotify-client-secret-${idPrefix}`}
            type="password"
            className="input w-full font-mono"
            value={clientSecret}
            placeholder={status?.clientSecretSet ? 'Saved — paste to replace' : 'Client secret'}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setClientSecret(e.target.value)}
          />
        </Field>
        <button
          type="button"
          className="btn btn-primary btn-sm w-full"
          disabled={busy || !clientId.trim() || !clientSecret.trim()}
          onClick={() => void connect()}
        >
          {busy ? 'Opening Spotify…' : 'Connect with Spotify'}
        </button>
        {message ? (
          <p className={`m-0 text-xs ${message.startsWith('Connected') ? 'muted' : 'status-error'}`}>{message}</p>
        ) : null}
        {status?.configured ? (
          <p className="muted m-0 text-xs">Connected on this machine.</p>
        ) : null}
      </div>
    </div>
  );
}
