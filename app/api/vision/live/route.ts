import { NextRequest, NextResponse } from 'next/server';
import { MODELS, createResponse, getOpenAIKey, outputText } from '@/lib/ai/openai';
import { validateImageDataUrl } from '@/lib/ai/vision';
import type { LiveDetection, LiveKind, WaterAppearance, WaterSize } from '@/lib/inventory/live';

export const runtime = 'nodejs';
export const maxDuration = 20;

const KINDS: LiveKind[] = ['water_bottle', 'canned_food', 'bandages', 'first_aid_other'];
const APPEARANCES: WaterAppearance[] = ['clear', 'cloudy_or_discolored', 'not_applicable'];
const SIZES: WaterSize[] = ['small', 'standard', 'large', 'gallon_jug', 'not_applicable'];

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
        required: ['kind', 'name', 'water_appearance', 'water_size', 'label_ml', 'confidence'],
        properties: {
          kind: { type: 'string', enum: KINDS },
          name: { type: 'string', description: 'Short item name, e.g. "Gauze pads" (only matters for first_aid_other).' },
          water_appearance: { type: 'string', enum: APPEARANCES },
          water_size: { type: 'string', enum: SIZES },
          label_ml: { type: ['number', 'null'], description: 'Capacity printed on the label in mL, only if legible.' },
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
for everything else "not_applicable".
water_size (water only, else "not_applicable"): "small" = 8–12 oz mini bottle; "standard" = ordinary single-serve
bottle (16.9–20 oz, the usual "bottle of water"); "large" = 1–1.5 L bottle; "gallon_jug" = big jug with a handle.
label_ml: the capacity printed on the label in mL if you can read it (1 gallon = 3785), else null.
If nothing on the list is visible, return an empty items array.
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
    if (!SIZES.includes(o.water_size as WaterSize)) return null;
    if (o.label_ml !== null && typeof o.label_ml !== 'number') return null;
    out.push({
      kind: o.kind as LiveKind,
      name: o.name,
      waterAppearance: o.water_appearance as WaterAppearance,
      waterSize: o.water_size as WaterSize,
      labelMl: o.label_ml as number | null,
      confidence: Math.max(0, Math.min(1, o.confidence)),
    });
  }
  return out;
}
