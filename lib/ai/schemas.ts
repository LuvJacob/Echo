import type { EchoResult, ItemCategory, ProposedItem } from '@/types/echo';
import { WATER_SIZE_ML, waterSafetyFor, type WaterAppearance, type WaterSize } from '@/lib/inventory/live';

export const ITEM_CATEGORIES: ItemCategory[] = [
  'water', 'food', 'medical', 'tool', 'weapon', 'fuel', 'shelter', 'comm', 'other',
];

/**
 * JSON Schema sent to the model (OpenAI Structured Outputs, strict mode).
 * Fill level, location and drinkability are deliberately NOT model outputs:
 * the user confirms those, and drinkability is always "undetermined".
 */
export const VISION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'items', 'uncertainty_notes'],
  properties: {
    summary: { type: 'string', description: 'One short sentence describing what is visible.' },
    items: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'category', 'quantity', 'unit', 'unit_volume_ml', 'water_appearance', 'water_size', 'observations', 'confidence'],
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: ITEM_CATEGORIES },
          quantity: { type: 'integer', description: 'Count of clearly visible units.' },
          unit: { type: 'string', description: 'e.g. bottles, cans, packs' },
          unit_volume_ml: {
            type: ['number', 'null'],
            description: 'Capacity of ONE unit in mL ONLY if a label is legible; otherwise null. Never guess.',
          },
          water_appearance: {
            type: 'string',
            enum: ['clear', 'cloudy_or_discolored', 'not_applicable'],
            description: 'Water only: any tint (esp. red/green/brown), cloudiness, particles → cloudy_or_discolored. Else not_applicable.',
          },
          water_size: {
            type: 'string',
            enum: ['small', 'standard', 'large', 'gallon_jug', 'not_applicable'],
            description: 'Water only: small 8–12 oz, standard 16.9–20 oz bottle, large 1–1.5 L, gallon_jug with handle.',
          },
          observations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Purely visual notes, e.g. "liquid has a green tint". No safety verdicts.',
          },
          confidence: { type: 'number', description: '0 to 1' },
        },
      },
    },
    uncertainty_notes: { type: 'array', items: { type: 'string' } },
  },
} as const;

export interface ParsedVision {
  summary: string;
  items: ProposedItem[];
  uncertaintyNotes: string[];
}

export const DRINKABILITY_NOTE =
  'Drinkability is undetermined: a photo cannot show whether water is safe. Treat or test before drinking.';

const SAFETY_VERDICT = /\b(safe|unsafe|potable|drinkable|contaminat\w*|toxic|poison\w*|pure|clean water)\b/i;

/**
 * Runtime validation of untrusted model output. Rejects anything that doesn't match
 * the schema instead of guessing. Never throws.
 */
export function parseVisionOutput(raw: unknown): EchoResult<ParsedVision> {
  const fail = (message: string): EchoResult<ParsedVision> => ({
    ok: false,
    error: { code: 'invalid_model_output', message: `Scan result was malformed: ${message}` },
  });

  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return fail('not valid JSON');
    }
  }
  if (!isObj(data)) return fail('expected an object');
  if (typeof data.summary !== 'string') return fail('summary must be a string');
  if (!Array.isArray(data.items)) return fail('items must be an array');
  if (data.items.length > 20) return fail('too many items');
  if (!isStringArray(data.uncertainty_notes)) return fail('uncertainty_notes must be a string array');

  const items: ProposedItem[] = [];
  const notes = [...data.uncertainty_notes];
  let hadWater = false;

  for (const [n, it] of data.items.entries()) {
    const at = `items[${n}]`;
    if (!isObj(it)) return fail(`${at} must be an object`);
    if (typeof it.name !== 'string' || !it.name.trim()) return fail(`${at}.name is required`);
    if (typeof it.category !== 'string' || !ITEM_CATEGORIES.includes(it.category as ItemCategory)) {
      return fail(`${at}.category is invalid`);
    }
    if (!Number.isInteger(it.quantity) || (it.quantity as number) < 1 || (it.quantity as number) > 999) {
      return fail(`${at}.quantity must be an integer from 1 to 999`);
    }
    if (typeof it.unit !== 'string') return fail(`${at}.unit must be a string`);
    const vol = it.unit_volume_ml;
    if (vol !== null && (typeof vol !== 'number' || !Number.isFinite(vol) || vol <= 0 || vol > 50000)) {
      return fail(`${at}.unit_volume_ml must be a positive number or null`);
    }
    if (!isStringArray(it.observations)) return fail(`${at}.observations must be a string array`);
    const APPEAR = ['clear', 'cloudy_or_discolored', 'not_applicable'];
    const SIZES = ['small', 'standard', 'large', 'gallon_jug', 'not_applicable'];
    const appearance = (it.water_appearance ?? 'not_applicable') as WaterAppearance;
    const size = (it.water_size ?? 'not_applicable') as WaterSize;
    if (!APPEAR.includes(appearance)) return fail(`${at}.water_appearance is invalid`);
    if (!SIZES.includes(size)) return fail(`${at}.water_size is invalid`);
    if (typeof it.confidence !== 'number' || it.confidence < 0 || it.confidence > 1) {
      return fail(`${at}.confidence must be between 0 and 1`);
    }

    // Keep observations visual; drop anything that reads like a safety verdict.
    const observations = it.observations.filter((o) => o.trim() && !SAFETY_VERDICT.test(o));
    if (observations.length !== it.observations.length) {
      notes.push('Some model remarks about safety were removed; ECHO only reports what is visible.');
    }
    if (it.category === 'water') hadWater = true;

    const isWater = it.category === 'water';
    // Team rule: assume capacity from the size chart when the label isn't legible; count as full.
    const assumedMl = isWater && vol == null ? WATER_SIZE_ML[size === 'not_applicable' ? 'standard' : size] : null;
    items.push({
      name: it.name.trim(),
      category: it.category as ItemCategory,
      quantity: it.quantity as number,
      unit: it.unit.trim() || 'units',
      unitVolumeMl: (vol as number | null) ?? assumedMl,
      fillLevel: isWater ? 'full' : null,
      location: null, // user confirms
      observations,
      drinkability: 'undetermined',
      ...(isWater ? { waterSafety: waterSafetyFor(appearance === 'not_applicable' ? 'clear' : appearance, false) } : {}),
      confidence: it.confidence,
    });
  }

  if (hadWater && !notes.includes(DRINKABILITY_NOTE)) notes.push(DRINKABILITY_NOTE);
  return { ok: true, value: { summary: data.summary, items, uncertaintyNotes: [...new Set(notes)] } };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}
