import { NextResponse } from 'next/server';
import { MODELS, ProviderError, createRealtimeClientSecret, getOpenAIKey } from '@/lib/ai/openai';
import { ECHO_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { REALTIME_TOOLS } from '@/lib/ai/tools';

export const runtime = 'nodejs';

/**
 * POST /api/realtime/session — mints a short-lived Realtime client secret.
 * The permanent OPENAI_API_KEY stays on the server; the browser only ever sees the ephemeral token.
 * Push-to-talk: server VAD is disabled; the client commits the audio buffer on release.
 */
export async function POST() {
  if (!getOpenAIKey()) {
    return NextResponse.json(
      { success: false, errorCode: 'no_api_key', error: 'Realtime voice is not configured on the server.' },
      { status: 503 }
    );
  }
  try {
    const secret = await createRealtimeClientSecret({
      type: 'realtime',
      model: MODELS.realtime,
      instructions: ECHO_SYSTEM_PROMPT,
      output_modalities: ['audio'],
      audio: {
        input: {
          turn_detection: null,
          transcription: { model: MODELS.transcribe, language: 'en' },
          noise_reduction: { type: 'near_field' },
        },
        output: { voice: MODELS.realtimeVoice },
      },
      tools: REALTIME_TOOLS,
      tool_choice: 'auto',
    });
    return NextResponse.json({ success: true, clientSecret: secret.value, expiresAt: secret.expires_at, model: MODELS.realtime });
  } catch (e) {
    console.error('[API /api/realtime/session]', e);
    const msg = e instanceof ProviderError ? e.message : 'Could not start a voice session.';
    return NextResponse.json({ success: false, errorCode: 'connection_failed', error: msg }, { status: 502 });
  }
}
