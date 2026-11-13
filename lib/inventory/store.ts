import type {
  EchoResult,
  InventoryItem,
  InventoryProposal,
  InventoryReceipt,
  InventoryUpdateAction,
  ProposedItem,
} from '@/types/echo';
import { computeTotals } from './totals';
import { generateId } from '@/lib/utils';

/**
 * Canonical inventory store.
 *
 * - One key holds items AND the ledger of applied proposal ids, so "write items" and
 *   "remember this proposal was applied" succeed or fail together (no double-apply after a
 *   partial write).
 * - Every write is read back and compared; a receipt is only produced after that succeeds.
 * - The storage backend is injected so tests can simulate quota / disabled storage.
 */

export const INVENTORY_KEY = 'echo_inventory_v2';
export const LEGACY_INVENTORY_KEY = 'echo_inventory_v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface AppliedEntry {
  appliedAt: number;
  itemIds: string[];
}

export interface InventoryState {
  version: 2;
  items: InventoryItem[];
  applied: Record<string, AppliedEntry>;
}

const EMPTY: InventoryState = { version: 2, items: [], applied: {} };

export class InventoryStore {
  constructor(private readonly storage: KeyValueStorage) {}

  read(): InventoryState {
    try {
      const raw = this.storage.getItem(INVENTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<InventoryState>;
        if (parsed && Array.isArray(parsed.items)) {
          return { version: 2, items: parsed.items, applied: parsed.applied ?? {} };
        }
      }
      // One-time migration from the scaffold's v1 array.
      const legacy = this.storage.getItem(LEGACY_INVENTORY_KEY);
      if (legacy) {
        const items = JSON.parse(legacy);
        if (Array.isArray(items)) return { version: 2, items, applied: {} };
      }
    } catch (e) {
      console.error('[InventoryStore] Corrupt inventory data; starting empty', e);
    }
    return structuredClone(EMPTY);
  }

  list(): InventoryItem[] {
    return this.read().items;
  }

  /** Write + read-back verification. Never throws; returns an EchoResult. */
  write(state: InventoryState): EchoResult<InventoryState> {
    const serialized = JSON.stringify(state);
    try {
      this.storage.setItem(INVENTORY_KEY, serialized);
      if (this.storage.getItem(INVENTORY_KEY) !== serialized) {
        throw new Error('Read-back verification mismatch');
      }
      return { ok: true, value: state };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error('[InventoryStore] Save failed', e);
      return {
        ok: false,
        error: {
          code: 'save_failed',
          message: `Inventory was NOT saved (${detail}). Nothing changed — try again or free up browser storage.`,
        },
      };
    }
  }

  /**
   * Apply a user-confirmed proposal exactly once.
   * Calling again with the same proposal id returns the original receipt with duplicate=true.
   */
  confirmProposal(proposal: InventoryProposal, now = Date.now()): EchoResult<InventoryReceipt> {
    const invalid = validateConfirmedItems(proposal.items);
    if (invalid) return { ok: false, error: { code: 'invalid_request', message: invalid } };

    const state = this.read();
    const prior = state.applied[proposal.id];
    if (prior) {
      return {
        ok: true,
        value: {
          proposalId: proposal.id,
          appliedAt: prior.appliedAt,
          itemIds: prior.itemIds,
          duplicate: true,
          totals: computeTotals(state.items),
        },
      };
    }

    const items = state.items.map((i) => ({ ...i }));
    const itemIds: string[] = [];
    for (const p of proposal.items) {
      itemIds.push(mergeInto(items, toInventoryItem(p, proposal.source, now), now));
    }

    const next: InventoryState = {
      version: 2,
      items,
      applied: { ...state.applied, [proposal.id]: { appliedAt: now, itemIds } },
    };
    const saved = this.write(next);
    if (!saved.ok) return saved;

    return {
      ok: true,
      value: { proposalId: proposal.id, appliedAt: now, itemIds, duplicate: false, totals: computeTotals(items) },
    };
  }

  /** Legacy/manual EchoAction path (used by the existing confirm modal and quantity buttons). */
  applyAction(action: InventoryUpdateAction, now = Date.now()): EchoResult<InventoryItem[]> {
    const state = this.read();
    if (action.proposalId && state.applied[action.proposalId]) {
      return { ok: true, value: state.items };
    }
    const items = state.items.map((i) => ({ ...i }));
    const ai = action.item;
    const findIdx = () =>
      items.findIndex(
        (i) => (ai.id && i.id === ai.id) || (!!ai.name && i.name.toLowerCase() === ai.name.toLowerCase())
      );
    const touched: string[] = [];

    switch (action.operation) {
      case 'add': {
        if (!(ai.quantity > 0)) {
          return { ok: false, error: { code: 'invalid_request', message: 'Quantity must be greater than zero.' } };
        }
        const item: InventoryItem = {
          ...ai,
          id: ai.id ?? generateId('item'),
          category: ai.category || 'other',
          unit: ai.unit || 'units',
          source: ai.source || 'manual',
          updatedAt: now,
        };
        touched.push(mergeInto(items, item, now, Boolean(ai.id)));
        break;
      }
      case 'remove': {
        const idx = findIdx();
        if (idx >= 0) {
          touched.push(items[idx].id);
          const q = items[idx].quantity - (ai.quantity || 1);
          if (q <= 0) items.splice(idx, 1);
          else items[idx] = { ...items[idx], quantity: q, updatedAt: now };
        }
        break;
      }
      case 'set': {
        const idx = findIdx();
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...ai, id: items[idx].id, updatedAt: now };
          touched.push(items[idx].id);
        } else {
          const item = { ...ai, id: ai.id ?? generateId('item'), updatedAt: now } as InventoryItem;
          items.push(item);
          touched.push(item.id);
        }
        break;
      }
      case 'clear':
        items.length = 0;
        break;
    }

    const applied = action.proposalId
      ? { ...state.applied, [action.proposalId]: { appliedAt: now, itemIds: touched } }
      : state.applied;
    const saved = this.write({ version: 2, items, applied });
    return saved.ok ? { ok: true, value: items } : saved;
  }

  replaceAll(items: InventoryItem[]): EchoResult<InventoryItem[]> {
    const state = this.read();
    const saved = this.write({ ...state, items });
    return saved.ok ? { ok: true, value: items } : saved;
  }
}

// ---------- helpers ----------

function mergeKey(i: Pick<InventoryItem, 'name' | 'unitVolumeMl' | 'fillLevel' | 'location' | 'waterSafety'>) {
  return [
    i.name.trim().toLowerCase(),
    i.unitVolumeMl ?? '',
    i.fillLevel ?? '',
    (i.location ?? '').trim().toLowerCase(),
    i.waterSafety ?? '',
  ].join('|');
}

/** Merge quantity into a matching line (same name, volume, fill, location) or append. Returns the line id. */
function mergeInto(items: InventoryItem[], item: InventoryItem, now: number, matchById = false): string {
  const idx = matchById
    ? items.findIndex((i) => i.id === item.id)
    : items.findIndex((i) => mergeKey(i) === mergeKey(item));
  if (idx >= 0) {
    const existing = items[idx];
    const observations = [...new Set([...(existing.observations ?? []), ...(item.observations ?? [])])];
    items[idx] = {
      ...existing,
      quantity: existing.quantity + item.quantity,
      updatedAt: now,
      source: item.source || existing.source,
      ...(observations.length ? { observations } : {}),
    };
    return existing.id;
  }
  items.push(item);
  return item.id;
}

function toInventoryItem(p: ProposedItem, source: InventoryItem['source'], now: number): InventoryItem {
  const item: InventoryItem = {
    id: generateId('item'),
    name: p.name.trim(),
    category: p.category,
    quantity: p.quantity,
    unit: p.unit || 'units',
    source,
    updatedAt: now,
  };
  if (p.unitVolumeMl != null) item.unitVolumeMl = p.unitVolumeMl;
  if (p.fillLevel != null) item.fillLevel = p.fillLevel;
  if (p.location != null && p.location.trim()) item.location = p.location.trim();
  if (p.observations.length) item.observations = [...p.observations];
  return item;
}

export function validateConfirmedItems(items: ProposedItem[]): string | null {
  if (!Array.isArray(items) || items.length === 0) return 'Proposal has no items to save.';
  for (const [n, p] of items.entries()) {
    const label = `Item ${n + 1}`;
    if (!p.name || !p.name.trim()) return `${label}: name is required.`;
    if (!Number.isFinite(p.quantity) || p.quantity <= 0) return `${label}: quantity must be greater than zero.`;
    if (p.unitVolumeMl != null && (!Number.isFinite(p.unitVolumeMl) || p.unitVolumeMl <= 0)) {
      return `${label}: capacity must be a positive number of mL, or left unknown.`;
    }
  }
  return null;
}
