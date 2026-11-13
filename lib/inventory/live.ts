import { CATEGORY_LABEL, type ItemCategory, type WaterSafety } from '@/types/echo';

/** Kinds the live scanner recognises. Anything else is ignored. */
export type LiveKind = 'water_bottle' | 'canned_food' | 'other_food' | 'bandages' | 'first_aid_other' | 'unknown_item';
export type WaterAppearance = 'clear' | 'cloudy_or_discolored' | 'not_applicable';
/** Size classes from the team's reference chart. */
export type WaterSize = 'small' | 'standard' | 'large' | 'gallon_jug' | 'not_applicable';

/** Assumed capacity per size class (a printed label, if legible, overrides this). */
export const WATER_SIZE_ML: Record<Exclude<WaterSize, 'not_applicable'>, number> = {
  small: 355, // 8–12 oz
  standard: 500, // 16.9 oz — "a bottle of water"
  large: 1000, // 1–1.5 L
  gallon_jug: 3785, // 1 US gallon
};

export interface LiveDetection {
  kind: LiveKind;
  /** Model's name; only used for first_aid_other (e.g. "Gauze pads"). */
  name: string;
  waterAppearance: WaterAppearance;
  /** Size class for water containers. */
  waterSize?: WaterSize;
  /** Capacity printed on the label in mL, if legible. */
  labelMl?: number | null;
  confidence: number;
}

export interface LiveAddEvent {
  id: string;
  name: string;
  categoryLabel: string;
  category?: ItemCategory;
  unitVolumeMl?: number;
  waterSafety?: WaterSafety;
  at: number;
}

export interface LiveItemSpec {
  key: string; // dedupe key
  name: string;
  category: ItemCategory;
  unit: string;
  unitVolumeMl?: number;
}

export function specFor(d: LiveDetection): LiveItemSpec {
  switch (d.kind) {
    case 'water_bottle': {
      const size = d.waterSize && d.waterSize !== 'not_applicable' ? d.waterSize : 'standard';
      const label = d.labelMl && d.labelMl > 0 && d.labelMl <= 20000 ? Math.round(d.labelMl) : null;
      const ml = label ?? WATER_SIZE_ML[size];
      const jug = size === 'gallon_jug' || ml >= 3000;
      return {
        key: `water:${ml}`,
        name: jug ? 'Gallon jug of water' : 'Water bottle',
        category: 'water',
        unit: jug ? 'jugs' : 'bottles',
        unitVolumeMl: ml,
      };
    }
    case 'canned_food':
      return { key: 'canned_food', name: 'Canned food', category: 'food', unit: 'cans' };
    case 'other_food': {
      const name = cleanName(d.name) || 'Food item';
      return { key: `food:${name.toLowerCase()}`, name, category: 'food', unit: 'items' };
    }
    case 'unknown_item':
      // Not saved automatically — ECHO asks the survivor what it is.
      return { key: 'unknown', name: 'Unknown item', category: 'other', unit: 'items' };
    case 'bandages':
      return { key: 'bandages', name: 'Bandages', category: 'medical', unit: 'boxes' };
    case 'first_aid_other': {
      const name = cleanName(d.name) || 'First-aid item';
      return { key: `first_aid:${name.toLowerCase()}`, name, category: 'medical', unit: 'units' };
    }
  }
}

/**
 * Simple drinking recommendation:
 * cloudy/discoloured → possible contamination; clear + user-confirmed factory-sealed → preferred;
 * otherwise → safety unknown.
 */
export function waterSafetyFor(appearance: WaterAppearance, sealedConfirmed: boolean): WaterSafety {
  if (appearance === 'cloudy_or_discolored') return 'possible_contamination';
  if (sealedConfirmed) return 'preferred';
  return 'safety_unknown';
}

/** Short line ECHO says out loud after a successful save. */
export function confirmationPhrase(e: LiveAddEvent): string {
  if (e.waterSafety === 'possible_contamination') return `${e.name} added. Contaminated — do not drink it.`;
  if (e.categoryLabel === 'Water') return `${e.name} added.`;
  return `${e.name} added to ${e.categoryLabel.toLowerCase()}.`;
}

export function categoryLabel(c: ItemCategory): string {
  return CATEGORY_LABEL[c] ?? c;
}

const GENERIC = new Set(['bag', 'can', 'cans', 'box', 'pack', 'bottle', 'bottles', 'jug', 'item', 'items', 'food', 'of', 'the', 'a', 'and', 'some', 'with', 'small', 'large']);

/** Same item named differently ("Bag of red kidney beans" vs "Red kidney beans")? */
export function similarItem(a: string, b: string): boolean {
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !GENERIC.has(w));
  const A = words(a);
  const B = new Set(words(b));
  if (!A.length || !B.size) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return A.some((w) => B.has(w) || B.has(w.replace(/s$/, '')) || B.has(w + 's'));
}

function cleanName(s: string): string {
  const t = (s || '').replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 40);
  return t ? t[0].toUpperCase() + t.slice(1) : '';
}
