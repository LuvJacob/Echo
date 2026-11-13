import { NextRequest, NextResponse } from 'next/server';
import { MODELS, createResponse, getOpenAIKey, outputText } from '@/lib/ai/openai';
import { validateImageDataUrl } from '@/lib/ai/vision';
import type { LiveDetection, LiveKind, WaterAppearance } from '@/lib/inventory/live';

export const runtime = 'nodejs';
export const maxDuration = 20;

const KINDS: LiveKind[] = ['water_bottle', 'canned_food', 'bandages', 'first_aid_other'];
const APPEARANCES: WaterAppearance[] = ['clear', 'cloudy_or_discolored', 'not_applicable'];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'name', 'water_appearance', 'confidence'],
        properties: {
          kind: { type: 'string', enum: KINDS },
          name: { type: 'string', description: 'Short item name, e.g. "Gauze pads" (only matters for first_aid_other).' },
          water_appearance: { type: 'string', enum: APPEARANCES },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

const PROMPT = `
You watch a live camera frame for a survival-inventory app. Report ONLY items from this list that are clearly
visible and prominent (e.g. being held up to the camera):
- water_bottle: a bottle of water
- canned_food: a can of food
- bandages: a box or pack of adhesive bandages / Band-Aids
- first_aid_other: any other recognisable first-aid item (gauze, antiseptic, first-aid kit, medical tape...); give its short name
Report each kind at most once. Ignore people, hands, screens, furniture and anything not on the list.
water_appearance: for water_bottle, "cloudy_or_discolored" if the liquid looks cloudy, murky or tinted, else "clear";
for everything else "not_applicable". If nothing on the list is visible, return an empty items array.
`.trim();

/** POST /api/vision/live — one camera frame → recognised kinds. Never writes inventory. */
export async function POST(req: NextRequest) {
  let body: { image?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, errorCode: 'invalid_request', error: 'Body must be JSON.' }, { status: 400 });
  }
  const bad = validateImageDataUrl(body.image);
  if (bad) return NextResponse.json({ success: false, errorCode: 'invalid_request', error: bad }, { status: 400 });

  if (!getOpenAIKey()) {
    return NextResponse.json(
      { success: false, errorCode: 'no_api_key', error: 'Live scan needs the AI key on the server.' },
      { status: 503 }
    );
  }

  try {
    const resp = await createResponse({
      model: MODELS.vision,
      instructions: PROMPT,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'What supplies from the list are visible?' },
            { type: 'input_image', image_url: body.image, detail: 'low' },
          ],
        },
      ],
      text: { format: { type: 'json_schema', name: 'live_scan', strict: true, schema: SCHEMA } },
      max_output_tokens: 300,
    });
    const items = parseLive(outputText(resp));
    if (!items) {
      return NextResponse.json({ success: false, errorCode: 'invalid_model_output', error: 'Unreadable scan result.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, items });
  } catch (e) {
    console.error('[API /api/vision/live]', e);
    return NextResponse.json({ success: false, errorCode: 'provider_error', error: 'Live scan failed.' }, { status: 502 });
  }
}

/** Runtime validation of model output; returns null if malformed. */
function parseLive(raw: string): LiveDetection[] | null {
  let d: unknown;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!d || typeof d !== 'object' || !Array.isArray((d as { items?: unknown }).items)) return null;
  const out: LiveDetection[] = [];
  for (const it of (d as { items: unknown[] }).items) {
    if (!it || typeof it !== 'object') return null;
    const o = it as Record<string, unknown>;
    if (!KINDS.includes(o.kind as LiveKind)) return null;
    if (!APPEARANCES.includes(o.water_appearance as WaterAppearance)) return null;
    if (typeof o.name !== 'string' || typeof o.confidence !== 'number') return null;
    out.push({
      kind: o.kind as LiveKind,
      name: o.name,
      waterAppearance: o.water_appearance as WaterAppearance,
      confidence: Math.max(0, Math.min(1, o.confidence)),
    });
  }
  return out;
}
