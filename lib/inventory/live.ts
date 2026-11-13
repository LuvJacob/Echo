import { CATEGORY_LABEL, type ItemCategory, type WaterSafety } from '@/types/echo';

/** Kinds the live scanner recognises. Anything else is ignored. */
export type LiveKind = 'water_bottle' | 'canned_food' | 'bandages' | 'first_aid_other';
export type WaterAppearance = 'clear' | 'cloudy_or_discolored' | 'not_applicable';

export interface LiveDetection {
  kind: LiveKind;
  /** Model's name; only used for first_aid_other (e.g. "Gauze pads"). */
  name: string;
  waterAppearance: WaterAppearance;
  confidence: number;
}

export interface LiveAddEvent {
  id: string;
  name: string;
  categoryLabel: string;
  waterSafety?: WaterSafety;
  at: number;
}

export interface LiveItemSpec {
  key: string; // dedupe key
  name: string;
  category: ItemCategory;
  unit: string;
}

export function specFor(d: LiveDetection): LiveItemSpec {
  switch (d.kind) {
    case 'water_bottle':
      return { key: 'water_bottle', name: 'Water bottle', category: 'water', unit: 'bottles' };
    case 'canned_food':
      return { key: 'canned_food', name: 'Canned food', category: 'food', unit: 'cans' };
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
  if (e.waterSafety === 'possible_contamination') return `${e.name} added. Possible contamination — don't drink it.`;
  if (e.categoryLabel === 'Water') return `${e.name} added.`;
  return `${e.name} added to ${e.categoryLabel.toLowerCase()}.`;
}

export function categoryLabel(c: ItemCategory): string {
  return CATEGORY_LABEL[c] ?? c;
}

function cleanName(s: string): string {
  const t = (s || '').replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 40);
  return t ? t[0].toUpperCase() + t.slice(1) : '';
}
