import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'spotify-credentials.json');
const TOKENS_FILE = path.join(DATA_DIR, 'spotify-tokens.json');

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = ['user-read-currently-playing', 'user-read-recently-played'].join(' ');

type StoredCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type StoredTokens = {
  refreshToken: string;
  accessToken?: string;
  expiresAt?: number;
};

type AccessCache = {
  accessToken: string;
  expiresAt: number;
};

let memoryCache: AccessCache | null = null;

function envClientId(): string {
  return process.env.SPOTIFY_CLIENT_ID?.trim() ?? '';
}

function envClientSecret(): string {
  return process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? '';
}

function envRefreshToken(): string {
  return process.env.SPOTIFY_REFRESH_TOKEN?.trim() ?? '';
}

/** Must match a Redirect URI in the Spotify app settings character-for-character. */
export function spotifyRedirectUri(): string {
  const port = Number(process.env.PORT ?? 3847);
  // Prefer 127.0.0.1 over localhost — Spotify treats them as different URIs.
  return process.env.SPOTIFY_REDIRECT_URI?.trim() || `http://127.0.0.1:${port}/callback`;
}

async function readStoredCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    const clientId = typeof parsed.clientId === 'string' ? parsed.clientId.trim() : '';
    const clientSecret = typeof parsed.clientSecret === 'string' ? parsed.clientSecret.trim() : '';
    const refreshToken = typeof parsed.refreshToken === 'string' ? parsed.refreshToken.trim() : '';
    if (clientId || clientSecret || refreshToken) {
      return { clientId, clientSecret, refreshToken };
    }
  } catch {
    // missing or invalid
  }
  return null;
}

async function writeStoredCredentials(credentials: StoredCredentials): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
}

async function readStoredTokens(): Promise<StoredTokens | null> {
  try {
    const raw = await readFile(TOKENS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoredTokens;
    if (typeof parsed.refreshToken === 'string' && parsed.refreshToken.trim()) {
      return {
        refreshToken: parsed.refreshToken.trim(),
        accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : undefined,
        expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined,
      };
    }
  } catch {
    // missing or invalid
  }
  return null;
}

async function writeStoredTokens(tokens: StoredTokens): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

async function resolveCredentials(): Promise<StoredCredentials> {
  const stored = await readStoredCredentials();
  return {
    clientId: stored?.clientId || envClientId(),
    clientSecret: stored?.clientSecret || envClientSecret(),
    refreshToken: stored?.refreshToken || envRefreshToken(),
  };
}

export async function spotifyAuthStatus(): Promise<{
  configured: boolean;
  hasRefreshToken: boolean;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  clientId: string;
  redirectUri: string;
  source: 'studio' | 'env' | 'mixed' | 'none';
}> {
  const file = await readStoredCredentials();
  const creds = await resolveCredentials();
  const tokens = await readStoredTokens();
  const refresh = tokens?.refreshToken || creds.refreshToken;

  const fileHas = Boolean(file?.clientId && file?.clientSecret && (file.refreshToken || tokens?.refreshToken));
  const envHas = Boolean(envClientId() && envClientSecret() && (envRefreshToken() || tokens?.refreshToken));
  let source: 'studio' | 'env' | 'mixed' | 'none' = 'none';
  if (fileHas && envHas) source = 'mixed';
  else if (fileHas || (file?.clientId && file?.clientSecret)) source = 'studio';
  else if (envHas || (envClientId() && envClientSecret())) source = 'env';

  return {
    configured: Boolean(creds.clientId && creds.clientSecret && refresh),
    hasRefreshToken: Boolean(refresh),
    clientIdSet: Boolean(creds.clientId),
    clientSecretSet: Boolean(creds.clientSecret),
    clientId: creds.clientId,
    redirectUri: spotifyRedirectUri(),
    source,
  };
}

/** Persist app credentials (refresh token optional — OAuth callback fills it in). */
export async function saveSpotifyAppCredentials(input: {
  clientId: string;
  clientSecret: string;
}): Promise<{ authorizeUrl: string; redirectUri: string }> {
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  if (!clientId) throw new Error('Client ID is required');
  if (!clientSecret) throw new Error('Client secret is required');

  const existing = await readStoredCredentials();
  const tokens = await readStoredTokens();
  await writeStoredCredentials({
    clientId,
    clientSecret,
    refreshToken: existing?.refreshToken || tokens?.refreshToken || '',
  });
  memoryCache = null;

  const redirectUri = spotifyRedirectUri();
  const authorizeUrl = `${AUTHORIZE_URL}?${new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    show_dialog: 'true',
  }).toString()}`;

  return { authorizeUrl, redirectUri };
}

export async function exchangeSpotifyAuthCode(code: string): Promise<void> {
  const creds = await resolveCredentials();
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error('Client ID and secret must be saved before connecting.');
  }

  const redirectUri = spotifyRedirectUri();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code.trim(),
    redirect_uri: redirectUri,
  });

  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify authorization failed (${res.status})${text ? `: ${text.slice(0, 220)}` : ''}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  if (!json.refresh_token?.trim()) {
    throw new Error('Spotify did not return a refresh token. Remove the app from your Spotify account access list and try again.');
  }

  const expiresAt = Date.now() + Math.max(60, json.expires_in) * 1000;
  const refreshToken = json.refresh_token.trim();
  memoryCache = { accessToken: json.access_token, expiresAt };
  await writeStoredTokens({
    refreshToken,
    accessToken: json.access_token,
    expiresAt,
  });
  await writeStoredCredentials({
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken,
  });
}

/** Manual paste path — validates the refresh token immediately. */
export async function saveSpotifyCredentials(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<Awaited<ReturnType<typeof spotifyAuthStatus>>> {
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  const refreshToken = input.refreshToken.trim();

  if (!clientId) throw new Error('Client ID is required');
  if (!clientSecret) throw new Error('Client secret is required');
  if (!refreshToken) throw new Error('Refresh token is required');

  await writeStoredCredentials({ clientId, clientSecret, refreshToken });
  await writeStoredTokens({ refreshToken });
  memoryCache = null;

  try {
    await getSpotifyAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('invalid_grant')) {
      throw new Error(
        'Invalid refresh token. Use “Connect with Spotify” instead — do not paste the short ?code= value from the browser URL.',
      );
    }
    throw err;
  }
  return spotifyAuthStatus();
}

export async function getSpotifyAccessToken(): Promise<string> {
  const creds = await resolveCredentials();
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error('Spotify is not configured. Enter Client ID and Client Secret, then Connect with Spotify.');
  }

  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now + 30_000) {
    return memoryCache.accessToken;
  }

  const stored = await readStoredTokens();
  if (stored?.accessToken && stored.expiresAt && stored.expiresAt > now + 30_000) {
    memoryCache = { accessToken: stored.accessToken, expiresAt: stored.expiresAt };
    return stored.accessToken;
  }

  const refreshToken = stored?.refreshToken || creds.refreshToken;
  if (!refreshToken) {
    throw new Error('Spotify is not connected yet. Click Connect with Spotify.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 400 && text.includes('invalid_grant')) {
      throw new Error(
        'Stored Spotify refresh token is invalid. Click Connect with Spotify again to re-authorize.',
      );
    }
    throw new Error(`Spotify token refresh failed (${res.status})${text ? `: ${text.slice(0, 180)}` : ''}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const expiresAt = Date.now() + Math.max(60, json.expires_in) * 1000;
  const nextRefresh = json.refresh_token?.trim() || refreshToken;

  memoryCache = { accessToken: json.access_token, expiresAt };
  await writeStoredTokens({
    refreshToken: nextRefresh,
    accessToken: json.access_token,
    expiresAt,
  });
  const fileCreds = await readStoredCredentials();
  if (fileCreds) {
    await writeStoredCredentials({ ...fileCreds, refreshToken: nextRefresh });
  }

  return json.access_token;
}
