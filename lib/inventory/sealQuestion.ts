import { inventoryStore } from '@/lib/storage/localStorage';
import { WATER_SAFETY_LABEL, type WaterSafety } from '@/types/echo';
import type { LiveAddEvent } from './live';

/**
 * The live scanner asks "Is it unopened and factory-sealed?" after adding a clear water bottle.
 * The survivor answers by voice; ECHO calls the set_water_sealed tool, which lands here.
 */
let pending: LiveAddEvent | null = null;

export function setPendingSealQuestion(e: LiveAddEvent) {
  pending = e;
}

export function answerSealQuestion(args: unknown): Record<string, unknown> {
  const sealed = typeof args === 'object' && args !== null && (args as { sealed?: unknown }).sealed === true;
  const p = pending;
  if (!p) return { ok: false, message: 'There is no recently scanned water bottle waiting for an answer.' };
  pending = null;
  const next: WaterSafety = sealed ? 'preferred' : 'safety_unknown';
  if (!sealed) return { ok: true, item: p.name, water_safety: WATER_SAFETY_LABEL[next], note: 'Left as safety unknown.' };

  const r = inventoryStore.reclassifyOne(
    (i) => i.category === 'water' && i.name === p.name && (i.unitVolumeMl ?? null) === (p.unitVolumeMl ?? null) && i.waterSafety === 'safety_unknown',
    { waterSafety: next }
  );
  if (!r.ok) return { ok: false, message: r.error.message };
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('echo:inventory-changed'));
  return { ok: true, item: p.name, water_safety: WATER_SAFETY_LABEL[next] };
}

// ---------- "What is this item?" (live scan couldn't identify it) ----------

let unknownPending = false;
let unknownAskedAt = 0;

/** Returns false if a question is already open (so we don't ask repeatedly). */
export function setPendingUnknownQuestion(): boolean {
  if (unknownPending && Date.now() - unknownAskedAt < 20000) return false;
  unknownPending = true;
  unknownAskedAt = Date.now();
  return true;
}

const CATS = ['water', 'food', 'medical', 'tool', 'other'] as const;

type Resolver = (name: string, category: (typeof CATS)[number]) => void;
let resolver: Resolver | null = null;
/** Photo review: route the spoken answer into the open proposal instead of saving directly. */
export function setUnknownResolver(fn: Resolver | null) {
  resolver = fn;
}

/** Tool: add_scanned_item — the survivor said what the unknown object is. */
export function answerUnknownItem(args: unknown): Record<string, unknown> {
  const a = (args ?? {}) as { name?: unknown; category?: unknown };
  const name = typeof a.name === 'string' ? a.name.trim().slice(0, 40) : '';
  const category = CATS.includes(a.category as (typeof CATS)[number]) ? (a.category as (typeof CATS)[number]) : 'other';
  unknownPending = false;
  if (!name) return { ok: false, message: 'No item name was given.' };
  const nice = name[0].toUpperCase() + name.slice(1);
  if (resolver) {
    const r = resolver;
    resolver = null;
    r(nice, category);
    return { ok: true, updated_in_review: nice, note: 'Filled into the photo review. The survivor still taps Confirm & Save.' };
  }
  const r = inventoryStore.applyAction({
    type: 'inventory_update',
    operation: 'add',
    item: { name: nice, category, quantity: 1, unit: 'items', source: 'voice_prompt' },
  });
  if (!r.ok) return { ok: false, message: r.error.message };
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('echo:inventory-changed'));
  const label = category === 'food' ? 'rations' : category === 'medical' ? 'medical supplies' : category;
  return { ok: true, added: nice, category: label };
}
