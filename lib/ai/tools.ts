import { WATER_SAFETY_LABEL, type InventoryItem } from '@/types/echo';

/**
 * Tool definitions shared by the Realtime session (executed in the browser against the
 * persisted store) and the /api/chat fallback (executed on the server against the snapshot
 * the browser read from the store at request time). Same name, same output shape.
 */
export const GET_INVENTORY_TOOL = {
  type: 'function',
  name: 'get_inventory',
  description:
    'Read the survivor\'s persisted, user-confirmed inventory and pre-computed totals. ' +
    'Call this before answering ANY question about supplies, water, food or where things are stored.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      category: {
        type: ['string', 'null'],
        enum: ['water', 'food', 'medical', 'tool', 'weapon', 'fuel', 'shelter', 'comm', 'other', null],
        description: 'Optional filter. Totals always cover all water.',
      },
    },
    required: ['category'],
  },
} as const;

export const GET_WEATHER_TOOL = {
  type: 'function',
  name: 'get_weather',
  description:
    'Get LIVE current weather and today\'s forecast where the survivor is (real data, not part of the fictional scenario). ' +
    'Call this for any question about weather, temperature, rain, wind or whether conditions are safe to travel.',
  parameters: { type: 'object', additionalProperties: false, properties: {}, required: [] },
} as const;

export const SET_WATER_SEALED_TOOL = {
  type: 'function',
  name: 'set_water_sealed',
  description:
    'Record the survivor\'s spoken answer to "Is it unopened and factory-sealed?" for the water bottle the live scanner just added.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { sealed: { type: 'boolean', description: 'true if they said yes, it is unopened and factory-sealed' } },
    required: ['sealed'],
  },
} as const;

export const ADD_SCANNED_ITEM_TOOL = {
  type: 'function',
  name: 'add_scanned_item',
  description: 'After you asked "What is this item?" during a live scan, add the object the survivor named.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: { type: 'string', description: 'Short item name, e.g. "Bread"' },
      category: { type: 'string', enum: ['water', 'food', 'medical', 'tool', 'other'] },
    },
    required: ['name', 'category'],
  },
} as const;

export const SET_USER_NAME_TOOL = {
  type: 'function',
  name: 'set_user_name',
  description: 'Remember the survivor\'s first name when they tell you what to call them.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: { name: { type: 'string' } },
    required: ['name'],
  },
} as const;

/** Server-executable tools (/api/chat). */
export const ECHO_TOOLS = [GET_INVENTORY_TOOL, GET_WEATHER_TOOL];
/** Realtime voice session tools (executed in the browser). */
export const REALTIME_TOOLS = [GET_INVENTORY_TOOL, GET_WEATHER_TOOL, SET_WATER_SEALED_TOOL, ADD_SCANNED_ITEM_TOOL, SET_USER_NAME_TOOL];

export interface InventoryToolOutput {
  items: {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    location: string | null;
    observations: string[];
    water_safety: string | null;
  }[];
  totals: {
    /** e.g. "3 water bottles and 1 gallon jug of water" */
    water_spoken: string;
    water_containers: number;
    water_by_type: Record<string, number>;
    /** Containers flagged DO NOT DRINK (contaminated). */
    unsafe_water_containers: number;
    rations_items: number;
    medical_items: number;
    total_items: number;
  };
  note: string;
}

/** "3 water bottles and 1 gallon jug of water" — counts only, never litres. */
export function describeContainers(byType: Record<string, number>): string {
  const parts = Object.entries(byType)
    .filter(([, n]) => n > 0)
    .map(([name, n]) => {
      const lower = name.toLowerCase();
      if (n === 1) return `1 ${lower}`;
      // pluralise the head noun: "water bottle" → "water bottles", "gallon jug of water" → "gallon jugs of water"
      const plural = lower.includes(' of ') ? lower.replace(/^(\S+(?: \S+)*?)( of .*)$/, (_, head, rest) => head.replace(/(\w+)$/, '$1s') + rest) : lower.replace(/(\w+)$/, '$1s');
      return `${n} ${plural}`;
    });
  if (parts.length === 0) return 'no water containers';
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

export function runGetInventory(items: InventoryItem[], args: unknown): InventoryToolOutput {
  const category =
    typeof args === 'object' && args && 'category' in args && typeof (args as { category: unknown }).category === 'string'
      ? (args as { category: string }).category
      : null;
  const water = items.filter((i) => i.category === 'water');
  const byType: Record<string, number> = {};
  for (const w of water) byType[w.name] = (byType[w.name] ?? 0) + w.quantity;
  const count = (c: string) => items.filter((i) => i.category === c).reduce((n, i) => n + i.quantity, 0);
  return {
    items: items
      .filter((i) => !category || i.category === category)
      .map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        location: i.location ?? null,
        observations: i.observations ?? [],
        water_safety: i.waterSafety ? WATER_SAFETY_LABEL[i.waterSafety] : null,
      })),
    totals: {
      water_spoken: describeContainers(byType),
      water_containers: water.reduce((n, i) => n + i.quantity, 0),
      water_by_type: byType,
      unsafe_water_containers: water.filter((i) => i.waterSafety === 'possible_contamination').reduce((n, i) => n + i.quantity, 0),
      rations_items: count('food'),
      medical_items: count('medical'),
      total_items: items.reduce((n, i) => n + i.quantity, 0),
    },
    note:
      'Report water ONLY as a count of containers by type (use water_spoken). Never mention litres, millilitres or volume. ' +
      'If unsafe_water_containers > 0, say how many are flagged DO NOT DRINK. Counts are computed by the app; quote them exactly.',
  };
}

export function parseToolArgs(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
