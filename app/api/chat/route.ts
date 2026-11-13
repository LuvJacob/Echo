import { NextRequest, NextResponse } from 'next/server';
import { ChatApiRequest, ChatApiResponse } from '@/types/echo';
import { generateChatResponse } from '@/lib/ai/client';

export async function POST(req: NextRequest) {
  try {
    const body: ChatApiRequest = await req.json();

    if (!body || !body.message) {
      return NextResponse.json<ChatApiResponse>(
        {
          success: false,
          reply: '',
          error: 'Missing required field: message',
        },
        { status: 400 }
      );
    }

    const aiResult = await generateChatResponse({
      message: body.message,
      history: body.history,
      inventory: body.inventorySnapshot,
    });

    const response: ChatApiResponse = {
      success: true,
      reply: aiResult.reply,
      speechText: aiResult.speechText,
      avatarStatus: 'speaking',
      proposedAction: aiResult.proposedAction,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /api/chat] Error:', error);
    return NextResponse.json<ChatApiResponse>(
      {
        success: false,
        reply: 'Neural link degraded. Unable to process command.',
        error: error instanceof Error ? error.message : 'Internal Server Error',
        avatarStatus: 'error',
      },
      { status: 500 }
    );
  }
}
