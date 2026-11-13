import type { InventoryProposal, ProposedItem } from '@/types/echo';
import type { KeyValueStorage } from '@/lib/inventory/store';

export class MemStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

export function water(over: Partial<ProposedItem> = {}): ProposedItem {
  return {
    name: 'Water bottle', category: 'water', quantity: 3, unit: 'bottles',
    unitVolumeMl: 500, fillLevel: 'full', location: 'locker seven',
    observations: [], drinkability: 'undetermined', confidence: 0.9, ...over,
  };
}

export function proposal(id: string, items: ProposedItem[] = [water()]): InventoryProposal {
  return {
    id, source: 'vision_scan', operation: 'add', items, summary: 's',
    uncertaintyNotes: [], createdAt: 1, status: 'pending',
  };
}
