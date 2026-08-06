import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import {
  catalogEntryToFeedItem,
  normalizeAiMuseAppConfig,
  type AiMuseFeedItem,
} from '@pixopen/core';
import { libraryPublicUrl, resolveLibraryFilePath } from './library.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'gemini-credentials.json');
const GENERATED_DIR = path.join(DATA_DIR, 'ai-muse', 'library');
const MANIFEST_FILE = path.join(DATA_DIR, 'ai-muse', 'generated-manifest.json');

/** Nano Banana 2 — Gemini 3.1 Flash Image (fallback: legacy 2.5). */
export const NANO_BANANA_MODELS = [
  { id: 'gemini-3.1-flash-image', label: 'Nano Banana 2 (Flash Image)' },
  { id: 'gemini-3.1-flash-lite-image', label: 'Nano Banana 2 Lite' },
  { id: 'gemini-2.5-flash-image', label: 'Nano Banana (legacy)' },
] as const;

export type NanoBananaModelId = (typeof NANO_BANANA_MODELS)[number]['id'];

type StoredCredentials = {
  apiKey: string;
};

type GeneratedManifestEntry = {
  id: string;
  filename: string;
  prompt: string;
  model: string;
  createdAt: string;
  width: number;
  height: number;
};

export type GeminiStatus = {
  configured: boolean;
  apiKeySet: boolean;
  apiKeyPreview: string;
  source: 'studio' | 'env' | 'none';
  models: Array<{ id: string; label: string }>;
};

export type GenerateResult = {
  item: AiMuseFeedItem;
  prompt: string;
  model: string;
  savedPath: string;
};

function envApiKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ''
  );
}

async function readStoredCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await readFile(CREDENTIALS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    const apiKey = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '';
    if (apiKey) return { apiKey };
  } catch {
    // missing
  }
  return null;
}

export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('API key required');
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CREDENTIALS_FILE, JSON.stringify({ apiKey: trimmed }, null, 2));
}

export async function clearGeminiApiKey(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CREDENTIALS_FILE, JSON.stringify({ apiKey: '' }, null, 2));
}

async function resolveApiKey(): Promise<{ apiKey: string; source: GeminiStatus['source'] }> {
  const stored = await readStoredCredentials();
  if (stored?.apiKey) return { apiKey: stored.apiKey, source: 'studio' };
  const fromEnv = envApiKey();
  if (fromEnv) return { apiKey: fromEnv, source: 'env' };
  return { apiKey: '', source: 'none' };
}

function previewKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}

export async function geminiAuthStatus(): Promise<GeminiStatus> {
  const { apiKey, source } = await resolveApiKey();
  return {
    configured: Boolean(apiKey),
    apiKeySet: Boolean(apiKey),
    apiKeyPreview: previewKey(apiKey),
    source,
    models: NANO_BANANA_MODELS.map(({ id, label }) => ({ id, label })),
  };
}

async function readManifest(): Promise<GeneratedManifestEntry[]> {
  try {
    const raw = await readFile(MANIFEST_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as GeneratedManifestEntry[]) : [];
  } catch {
    return [];
  }
}

async function appendManifest(entry: GeneratedManifestEntry): Promise<void> {
  const prev = await readManifest();
  const next = [entry, ...prev.filter((row) => row.id !== entry.id)].slice(0, 500);
  await mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
  await writeFile(MANIFEST_FILE, JSON.stringify(next, null, 2));
}

/** Build a Pixoo-friendly prompt from look prefs + user text. */
export function buildNanoBananaPrompt(
  userPrompt: string,
  appConfig: Record<string, unknown> | undefined,
): string {
  const config = normalizeAiMuseAppConfig(appConfig);
  const bits: string[] = [
    'Photorealistic photograph of an attractive adult woman, 18 years or older.',
    'Natural skin texture, realistic lighting, sharp focus, DSLR quality.',
    'Square 1:1 composition, portrait framing from chest up or three-quarter view.',
    'No anime, no cartoon, no illustration, no text overlays, no watermark.',
    'SFW only — fully clothed, tasteful.',
  ];

  if (!(config.ageMin <= 18 && config.ageMax >= 65)) {
    bits.push(`Apparent age about ${config.ageMin}–${config.ageMax}.`);
  }
  if (config.ethnicities.length > 0) {
    bits.push(`Ethnicity cues: ${config.ethnicities.join(', ')}.`);
  }
  if (config.eyeColor !== 'any') bits.push(`${config.eyeColor} eyes.`);
  if (config.hairColor !== 'any') bits.push(`${config.hairColor} hair.`);
  if (config.hairLength !== 'any') bits.push(`${config.hairLength} hair.`);
  if (config.settings.length > 0) {
    bits.push(`Setting: ${config.settings.join(' / ')}.`);
  }

  const custom = userPrompt.trim();
  if (custom) bits.push(`Additional direction: ${custom}`);

  return bits.join(' ');
}

function extractImageFromGenerateContent(body: unknown): { mimeType: string; data: Buffer } | null {
  const candidates = (body as { candidates?: Array<{ content?: { parts?: unknown[] } }> })?.candidates;
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    const parts = candidate.content?.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const partRec = part as {
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
      };
      const data = partRec.inlineData?.data ?? partRec.inline_data?.data;
      if (!data) continue;
      const mimeType =
        partRec.inlineData?.mimeType || partRec.inline_data?.mime_type || 'image/png';
      return { mimeType, data: Buffer.from(data, 'base64') };
    }
  }
  return null;
}

function extractImageFromInteractions(body: unknown): { mimeType: string; data: Buffer } | null {
  const outputs = (body as { outputs?: unknown[]; output?: unknown[] })?.outputs
    ?? (body as { output?: unknown[] })?.output;
  if (Array.isArray(outputs)) {
    for (const item of outputs) {
      if (!item || typeof item !== 'object') continue;
      const row = item as { type?: string; data?: string; mime_type?: string; mimeType?: string };
      if ((row.type === 'image' || row.data) && row.data) {
        return {
          mimeType: row.mimeType || row.mime_type || 'image/png',
          data: Buffer.from(row.data, 'base64'),
        };
      }
    }
  }
  const outputImage = (body as { output_image?: { data?: string; mime_type?: string } }).output_image;
  if (outputImage?.data) {
    return {
      mimeType: outputImage.mime_type || 'image/png',
      data: Buffer.from(outputImage.data, 'base64'),
    };
  }
  return null;
}

function formatGeminiHttpError(status: number, bodyText: string): string {
  const lower = bodyText.toLowerCase();
  const freeTierZero =
    status === 429 &&
    (lower.includes('free_tier') || lower.includes('"limit": 0') || lower.includes('"limit":0'));

  if (freeTierZero) {
    return [
      'Gemini image quota is 0 on this API key’s project — usually Free tier has no Nano Banana entitlement,',
      'not that you “used up” credits. Enable billing / Paid Tier 1 for the same Google Cloud project as the key,',
      'then create a fresh API key if needed: https://aistudio.google.com/apikey',
      'Billing: https://aistudio.google.com/billing · Limits: https://ai.dev/rate-limit',
    ].join(' ');
  }

  if (status === 429) {
    return [
      'Gemini rate/quota limit hit for this model.',
      'Check plan + usage: https://ai.dev/rate-limit',
      'If the error mentions free_tier / limit 0, enable Paid Tier 1 billing on the key’s project.',
      bodyText.slice(0, 180),
    ].join(' ');
  }

  return `Nano Banana failed (${status}): ${bodyText.slice(0, 240)}`;
}

async function callNanoBanana(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Buffer> {
  // Prefer generateContent (widely supported); fall back to Interactions API.
  const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const genRes = await fetch(genUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (genRes.ok) {
    const body = await genRes.json();
    const image = extractImageFromGenerateContent(body);
    if (image) return image.data;
    const blockReason = (body as { promptFeedback?: { blockReason?: string } })?.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini blocked the prompt (${blockReason})`
        : 'Gemini returned no image — try a clearer portrait prompt',
    );
  }

  // Fallback: Interactions API (Nano Banana docs path).
  if (genRes.status === 404 || genRes.status === 400) {
    const interRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        input: [{ type: 'text', text: prompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!interRes.ok) {
      const text = await interRes.text();
      throw new Error(formatGeminiHttpError(interRes.status, text));
    }
    const body = await interRes.json();
    const image = extractImageFromInteractions(body);
    if (image) return image.data;
    throw new Error('Nano Banana interaction returned no image');
  }

  const errText = await genRes.text();
  throw new Error(formatGeminiHttpError(genRes.status, errText));
}

function resolveModel(raw: unknown): string {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (NANO_BANANA_MODELS.some((m) => m.id === id)) return id;
  return 'gemini-3.1-flash-image';
}

/**
 * Generate with Nano Banana, persist under the local library (your credits),
 * and return a feed item pointing at the saved file.
 */
export async function generateNanoBananaImage(opts: {
  userPrompt: string;
  appConfig?: Record<string, unknown>;
  model?: string;
}): Promise<GenerateResult> {
  const { apiKey } = await resolveApiKey();
  if (!apiKey) {
    throw new Error('Add a Gemini API key first (AI Studio → API key). Billing uses your Gemini credits.');
  }

  const model = resolveModel(opts.model);
  const prompt = buildNanoBananaPrompt(opts.userPrompt, opts.appConfig);
  const raw = await callNanoBanana(apiKey, model, prompt);

  await mkdir(GENERATED_DIR, { recursive: true });
  const id = `nano-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  const filename = `${id}.png`;
  const filePath = path.join(GENERATED_DIR, filename);

  // Normalize to PNG square-friendly asset; keep high res for library, Pixoo crops later.
  const png = await sharp(raw)
    .rotate()
    .resize(1024, 1024, { fit: 'cover', position: 'attention' })
    .png()
    .toBuffer();
  await writeFile(filePath, png);

  // Sidecar prompt so you can see what you paid for later.
  await writeFile(
    path.join(GENERATED_DIR, `${id}.json`),
    JSON.stringify({ id, prompt, model, createdAt: new Date().toISOString() }, null, 2),
  );

  const meta = await sharp(png).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 1024;
  const url = libraryPublicUrl(filename);

  await appendManifest({
    id,
    filename,
    prompt,
    model,
    createdAt: new Date().toISOString(),
    width,
    height,
  });

  // Sanity: path resolves for the art pipeline.
  if (!resolveLibraryFilePath(filename)) {
    throw new Error('Generated file failed path validation');
  }

  const item = catalogEntryToFeedItem({
    id,
    url,
    width,
    height,
    nsfwLevel: 'None',
    settings: [],
    tags: ['library', 'realism-cue', 'source:nano-banana', 'generated'],
    ingestedAt: new Date().toISOString(),
  });

  return {
    item,
    prompt,
    model,
    savedPath: filePath,
  };
}

export async function listGeneratedImages(): Promise<GeneratedManifestEntry[]> {
  return readManifest();
}
