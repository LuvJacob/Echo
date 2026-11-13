import { WATER_SAFETY_LABEL, type InventoryItem } from '@/types/echo';
import { computeTotals, formatLiters, itemLiters } from '@/lib/inventory/totals';

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
    unit_volume_ml: number | null;
    fill_level: string | null;
    location: string | null;
    liters: number | null;
    observations: string[];
    water_safety: string | null;
  }[];
  totals: {
    water_liters: number;
    water_liters_spoken: string;
    water_containers: number;
    water_containers_unknown_volume: number;
    total_items: number;
  };
  note: string;
}

export function runGetInventory(items: InventoryItem[], args: unknown): InventoryToolOutput {
  const category =
    typeof args === 'object' && args && 'category' in args && typeof (args as { category: unknown }).category === 'string'
      ? (args as { category: string }).category
      : null;
  const t = computeTotals(items);
  return {
    items: items
      .filter((i) => !category || i.category === category)
      .map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        unit_volume_ml: i.unitVolumeMl ?? null,
        fill_level: i.fillLevel ?? null,
        location: i.location ?? null,
        liters: itemLiters(i),
        observations: i.observations ?? [],
        water_safety: i.waterSafety ? WATER_SAFETY_LABEL[i.waterSafety] : null,
      })),
    totals: {
      water_liters: t.waterLiters,
      water_liters_spoken: formatLiters(t.waterLiters),
      water_containers: t.waterContainers,
      water_containers_unknown_volume: t.waterContainersUnknownVolume,
      total_items: t.totalItems,
    },
    note:
      'Totals are computed by the app from confirmed quantities, volumes and fill levels. Quote them exactly; do not recompute. ' +
      'Containers with unknown volume are not included in water_liters. Drinkability is never confirmed.',
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
