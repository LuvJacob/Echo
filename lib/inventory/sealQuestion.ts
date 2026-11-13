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
