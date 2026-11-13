import type { FillLevel, InventoryItem, InventoryTotals } from '@/types/echo';

export const FILL_FRACTION: Record<FillLevel, number> = {
  full: 1,
  three_quarters: 0.75,
  half: 0.5,
  quarter: 0.25,
  empty: 0,
};

/** Litres held by one inventory line, or null if volume/fill level is not confirmed. */
export function itemLiters(item: InventoryItem): number | null {
  if (item.unitVolumeMl == null || item.fillLevel == null) return null;
  return (item.quantity * item.unitVolumeMl * FILL_FRACTION[item.fillLevel]) / 1000;
}

/**
 * Deterministic totals computed in TypeScript — the model never does this arithmetic.
 * Only confirmed quantity × confirmed unit volume × confirmed fill level counts toward litres.
 */
export function computeTotals(items: InventoryItem[]): InventoryTotals {
  let waterMl = 0;
  let waterContainers = 0;
  let unknown = 0;
  let totalItems = 0;

  for (const item of items) {
    totalItems += item.quantity;
    if (item.category !== 'water') continue;
    waterContainers += item.quantity;
    const liters = itemLiters(item);
    if (liters == null) unknown += item.quantity;
    else waterMl += liters * 1000;
  }

  return {
    waterLiters: Math.round(waterMl) / 1000,
    waterContainers,
    waterContainersUnknownVolume: unknown,
    totalItems,
  };
}

/** "1.5 L" / "500 mL" — used by mock replies and tool output so wording is consistent. */
export function formatLiters(liters: number): string {
  if (liters > 0 && liters < 1) return `${Math.round(liters * 1000)} mL`;
  return `${Number(liters.toFixed(2))} L`;
}
