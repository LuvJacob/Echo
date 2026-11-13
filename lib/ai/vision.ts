import type {
  EchoResult,
  InventoryProposal,
  InventoryUpdateAction,
  ItemSource,
  VisionResult,
} from '@/types/echo';
import { generateId } from '@/lib/utils';
import { VISION_PROMPT } from './prompts';
import { VISION_JSON_SCHEMA, parseVisionOutput, type ParsedVision } from './schemas';
import { MODELS, createResponse, getOpenAIKey, outputText } from './openai';

const DATA_URL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export const MAX_IMAGE_BYTES = 4_000_000; // stays under Vercel's 4.5 MB request cap

export function validateImageDataUrl(image: unknown): string | null {
  if (typeof image !== 'string' || !image) return 'Missing image.';
  if (!DATA_URL.test(image)) return 'Image must be a base64 data URL (png, jpeg, webp or gif).';
  if (image.length * 0.75 > MAX_IMAGE_BYTES) return 'Image is too large; downscale to under 4 MB.';
  return null;
}

/** Labelled offline fixture, used ONLY when no API key is configured. Goes through the same validator. */
export const MOCK_VISION_OUTPUT = {
  summary: '[offline fixture] Three sealed plastic water bottles on a flat surface.',
  items: [
    {
      name: 'Water bottle',
      category: 'water',
      quantity: 3,
      unit: 'bottles',
      unit_volume_ml: 500,
      observations: ['Label reads 500 mL', 'Caps appear sealed'],
      confidence: 0.9,
    },
  ],
  uncertainty_notes: ['Offline fixture: no image model was called.'],
};

export async function analyzeSupplyImage(
  image: string,
  opts: { testModelOutput?: unknown } = {}
): Promise<EchoResult<ParsedVision> & { mock: boolean }> {
  if (opts.testModelOutput !== undefined) return { ...parseVisionOutput(opts.testModelOutput), mock: true };
  if (!getOpenAIKey()) return { ...parseVisionOutput(MOCK_VISION_OUTPUT), mock: true };

  const resp = await createResponse({
    model: MODELS.vision,
    instructions: VISION_PROMPT,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Identify the survival supplies in this photo.' },
          { type: 'input_image', image_url: image, detail: 'auto' },
        ],
      },
    ],
    text: { format: { type: 'json_schema', name: 'supply_scan', strict: true, schema: VISION_JSON_SCHEMA } },
    max_output_tokens: 800,
  });
  return { ...parseVisionOutput(outputText(resp)), mock: false };
}

export function buildProposal(parsed: ParsedVision, source: ItemSource = 'vision_scan', now = Date.now()): InventoryProposal {
  return {
    id: generateId('prop'),
    source,
    operation: 'add',
    items: parsed.items,
    summary: parsed.summary,
    uncertaintyNotes: parsed.uncertaintyNotes,
    createdAt: now,
    status: 'pending',
  };
}

/** Back-compat shape for the scaffold's PhotoUploadModal (result + suggestedAction). */
export function toLegacyVisionResult(p: InventoryProposal): VisionResult {
  const first = p.items[0];
  const suggestedAction: InventoryUpdateAction | undefined = first && {
    type: 'inventory_update',
    operation: 'add',
    proposalId: p.id,
    item: {
      name: first.name,
      category: first.category,
      quantity: first.quantity,
      unit: first.unit,
      source: p.source,
      ...(first.unitVolumeMl != null ? { unitVolumeMl: first.unitVolumeMl } : {}),
      ...(first.observations.length ? { observations: first.observations } : {}),
    },
    reason: p.summary,
    confidence: first.confidence,
  };
  return {
    detectedObjects: p.items.map((i) => ({
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      confidence: i.confidence,
      notes: i.observations.join('; ') || undefined,
    })),
    rawDescription: p.summary,
    uncertaintyNotes: p.uncertaintyNotes,
    safetyConcerns: p.items.flatMap((i) => i.observations.filter((o) => /tint|colou?r|cloud|green|brown|yellow|particle|broken|leak/i.test(o))),
    suggestedAction,
    processedAt: p.createdAt,
  };
}
