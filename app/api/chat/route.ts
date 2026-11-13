import { NextRequest, NextResponse } from 'next/server';
import type { ChatApiRequest, ChatApiResponse } from '@/types/echo';
import { generateChatResponse } from '@/lib/ai/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/chat — text turn (typed input, or the push-to-talk fallback pipeline).
 * `inventorySnapshot` must be read from the persisted store at send time; the model reads it
 * through the get_inventory tool and never mutates it.
 */
export async function POST(req: NextRequest) {
  let body: ChatApiRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ChatApiResponse>({ success: false, reply: '', error: 'Body must be JSON.' }, { status: 400 });
  }
  if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json<ChatApiResponse>(
      { success: false, reply: '', error: 'Missing required field: message' },
      { status: 400 }
    );
  }

  try {
    const r = await generateChatResponse({
      message: body.message.trim().slice(0, 2000),
      history: Array.isArray(body.history) ? body.history : [],
      inventory: Array.isArray(body.inventorySnapshot) ? body.inventorySnapshot : [],
    });
    return NextResponse.json<ChatApiResponse & { toolCalls: string[]; mock: boolean }>({
      success: true,
      reply: r.reply,
      speechText: r.speechText,
      avatarStatus: 'speaking',
      toolCalls: r.toolCalls,
      mock: r.mock,
    });
  } catch (e) {
    console.error('[API /api/chat]', e);
    return NextResponse.json<ChatApiResponse>(
      {
        success: false,
        reply: 'Neural link degraded. Unable to process command.',
        error: 'The AI provider did not respond. Try again.',
        avatarStatus: 'error',
      },
      { status: 502 }
    );
  }
}
