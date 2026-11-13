import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIKey, synthesizeSpeech, transcribeAudio } from '@/lib/ai/openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Push-to-talk FALLBACK pipeline (used only if Realtime is unavailable).
 *   POST multipart/form-data { audio: Blob }            → { success, transcription }
 *   POST application/json   { textToSpeak: string }     → audio/mpeg bytes
 * Without an API key: 503 { errorCode: 'no_api_key' } so the client can use browser TTS / typing.
 */
export async function POST(req: NextRequest) {
  if (!getOpenAIKey()) {
    return NextResponse.json(
      { success: false, errorCode: 'no_api_key', error: 'Voice provider not configured.' },
      { status: 503 }
    );
  }
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const audio = form.get('audio');
      if (!(audio instanceof Blob) || audio.size === 0) {
        return NextResponse.json({ success: false, errorCode: 'invalid_request', error: 'No audio received.' }, { status: 400 });
      }
      if (audio.size > 4_000_000) {
        return NextResponse.json({ success: false, errorCode: 'invalid_request', error: 'Recording too long.' }, { status: 413 });
      }
      const name = audio instanceof File && audio.name ? audio.name : 'speech.webm';
      const transcription = await transcribeAudio(audio, name);
      return NextResponse.json({ success: true, transcription });
    }

    const body = (await req.json()) as { textToSpeak?: string };
    if (!body.textToSpeak?.trim()) {
      return NextResponse.json({ success: false, errorCode: 'invalid_request', error: 'Nothing to speak.' }, { status: 400 });
    }
    const mp3 = await synthesizeSpeech(body.textToSpeak.trim());
    return new NextResponse(mp3, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[API /api/voice]', e);
    return NextResponse.json({ success: false, errorCode: 'provider_error', error: 'Voice service failed.' }, { status: 502 });
  }
}
