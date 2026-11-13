/**
 * SERVER-ONLY OpenAI helpers (plain fetch, no SDK). Never import this from a client component:
 * it reads OPENAI_API_KEY. All model names are env-overridable.
 */

export const MODELS = {
  realtime: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
  realtimeVoice: process.env.OPENAI_REALTIME_VOICE || 'marin',
  chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
  vision: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
  transcribe: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe',
  tts: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
  ttsVoice: process.env.OPENAI_TTS_VOICE || 'marin', // same voice as the realtime session
};

const BASE = 'https://api.openai.com/v1';

export class ProviderError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function getOpenAIKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k ? k : null;
}

async function call(path: string, init: RequestInit, timeoutMs = 30000): Promise<Response> {
  const key = getOpenAIKey();
  if (!key) throw new ProviderError('OPENAI_API_KEY is not configured', 503);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = text.slice(0, 300);
    try {
      msg = JSON.parse(text)?.error?.message ?? msg;
    } catch {}
    throw new ProviderError(`OpenAI ${path} ${res.status}: ${msg}`, res.status);
  }
  return res;
}

// ---- Responses API ----

export interface ResponseOutputItem {
  type: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: { type: string; text?: string }[];
  [k: string]: unknown;
}
export interface ResponsesResult {
  id: string;
  output: ResponseOutputItem[];
}

export async function createResponse(body: Record<string, unknown>): Promise<ResponsesResult> {
  const res = await call('/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store: false, ...body }),
  });
  return res.json();
}

export function outputText(r: ResponsesResult): string {
  return r.output
    .filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('');
}

// ---- Audio ----

export async function transcribeAudio(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', file, filename);
  form.append('model', MODELS.transcribe);
  const res = await call('/audio/transcriptions', { method: 'POST', body: form });
  const json = (await res.json()) as { text?: string };
  return (json.text ?? '').trim();
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const res = await call('/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELS.tts,
      voice: MODELS.ttsVoice,
      input: text.slice(0, 4000),
      response_format: 'mp3',
      instructions: 'Calm, precise, protective AI companion. Slightly synthetic. Brisk pace.',
    }),
  });
  return res.arrayBuffer();
}

// ---- Realtime (ephemeral client secret; the permanent key never leaves the server) ----

export async function createRealtimeClientSecret(session: Record<string, unknown>) {
  const res = await call('/realtime/client_secrets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_after: { anchor: 'created_at', seconds: 600 }, session }),
  });
  return (await res.json()) as { value: string; expires_at: number };
}
