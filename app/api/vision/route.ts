import { NextRequest, NextResponse } from 'next/server';
import { VisionApiRequest, VisionApiResponse, VisionResult } from '@/types/echo';

export async function POST(req: NextRequest) {
  try {
    const body: VisionApiRequest = await req.json();

    if (!body || !body.image) {
      return NextResponse.json<VisionApiResponse>(
        {
          success: false,
          error: 'Missing required field: image',
        },
        { status: 400 }
      );
    }

    // Scaffolding / Mock Vision Response
    // Person B will integrate OpenAI GPT-4o / Gemini Flash Vision API here
    const mockVisionResult: VisionResult = {
      detectedObjects: [
        {
          name: 'Purified Water Bottle (500ml)',
          category: 'water',
          quantity: 3,
          unit: 'bottles',
          confidence: 0.94,
          notes: 'Standard sealed plastic bottles. Fluid appears clear.',
          boundingBox: { x: 120, y: 80, width: 240, height: 380 },
        },
      ],
      rawDescription: 'Visual scan identified 3 standard water bottles on a flat surface.',
      uncertaintyNotes: [
        'Seal integrity assumed intact based on visual outline; verify physically.',
        'Fluids cannot be certified potable by optical scan alone.',
      ],
      safetyConcerns: [],
      suggestedAction: {
        type: 'inventory_update',
        operation: 'add',
        item: {
          name: 'Purified Water Bottle (500ml)',
          category: 'water',
          quantity: 3,
          unit: 'bottles',
          source: 'vision_scan',
        },
        reason: 'Vision scan candidate detection (3 bottles)',
        confidence: 0.94,
      },
      processedAt: Date.now(),
    };

    const response: VisionApiResponse = {
      success: true,
      result: mockVisionResult,
      proposedAction: mockVisionResult.suggestedAction,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /api/vision] Error:', error);
    return NextResponse.json<VisionApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
