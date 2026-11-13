import { NextRequest, NextResponse } from 'next/server';
import { VoiceApiRequest, VoiceApiResponse } from '@/types/echo';

export async function POST(req: NextRequest) {
  try {
    const body: VoiceApiRequest = await req.json();

    // Scaffolding / Mock Voice Response
    // Person B will integrate Whisper / OpenAI Realtime / ElevenLabs / Gemini Audio
    const response: VoiceApiResponse = {
      success: true,
      transcription: body.audioData ? 'Status report on water inventory' : undefined,
      speechDurationMs: body.textToSpeak ? Math.max(1000, body.textToSpeak.length * 60) : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /api/voice] Error:', error);
    return NextResponse.json<VoiceApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
