import {
  EchoResult,
  InventoryItem,
  InventoryProposal,
  InventoryReceipt,
  InventorySummary,
  InventoryTotals,
  InventoryUpdateAction,
} from '@/types/echo';
import { inventoryStore } from '@/lib/storage/localStorage';
import { generateId } from '@/lib/utils';
import { computeTotals } from './totals';

/**
 * Thin facade over the canonical InventoryStore.
 * Legacy methods (list/add/executeAction/getSummary/seedDemoSupplies) keep their old
 * signatures for the UI; they THROW on save failure instead of failing silently.
 * New code should use confirmProposal / applyActionSafe, which return EchoResult.
 */
export class InventoryService {
  static list(): InventoryItem[] {
    return inventoryStore.list();
  }

  static totals(): InventoryTotals {
    return computeTotals(this.list());
  }

  /** Persist a user-confirmed proposal exactly once. Receipt only after verified write. */
  static confirmProposal(proposal: InventoryProposal): EchoResult<InventoryReceipt> {
    return inventoryStore.confirmProposal(proposal);
  }

  static applyActionSafe(action: InventoryUpdateAction): EchoResult<InventoryItem[]> {
    return inventoryStore.applyAction(action);
  }

  // ---- legacy API (throws on failure) ----

  static add(item: Omit<InventoryItem, 'id' | 'updatedAt'> & { id?: string }): InventoryItem[] {
    return unwrap(inventoryStore.applyAction({ type: 'inventory_update', operation: 'add', item }));
  }

  static executeAction(action: InventoryUpdateAction): InventoryItem[] {
    return unwrap(inventoryStore.applyAction(action));
  }

  static getSummary(): InventorySummary {
    const items = this.list();
    const t = computeTotals(items);
    const foodSupplyDays = items
      .filter((i) => i.category === 'food')
      .reduce((acc, i) => acc + i.quantity * 0.33, 0); // illustrative: ~3 packs/day
    return {
      totalItems: t.totalItems,
      waterSupplyLiters: t.waterLiters,
      foodSupplyDays: Math.round(foodSupplyDays * 10) / 10,
      lastUpdated: items.length > 0 ? Math.max(...items.map((i) => i.updatedAt)) : Date.now(),
    };
  }

  /** Demo seed — no water, so the scan → confirm → "1.5 L" demo starts clean. */
  static seedDemoSupplies(): InventoryItem[] {
    const now = Date.now();
    const demoItems: InventoryItem[] = [
      { id: generateId('item'), name: 'MRE Ration Pack', category: 'food', quantity: 3, unit: 'packs', source: 'system_seed', updatedAt: now },
      { id: generateId('item'), name: 'Emergency Medical Kit', category: 'medical', quantity: 1, unit: 'kits', source: 'system_seed', updatedAt: now },
    ];
    return unwrap(inventoryStore.replaceAll(demoItems));
  }
}

function unwrap<T>(r: EchoResult<T>): T {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}
