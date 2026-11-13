'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  EchoError,
  EchoResult,
  InventoryItem,
  InventoryProposal,
  InventoryReceipt,
  InventorySummary,
  InventoryTotals,
  InventoryUpdateAction,
} from '@/types/echo';
import { InventoryService } from '@/lib/inventory/service';
import { computeTotals } from '@/lib/inventory/totals';
import { INVENTORY_KEY } from '@/lib/inventory/store';

export const INVENTORY_CHANGED_EVENT = 'echo:inventory-changed';

function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
}

const EMPTY_SUMMARY: InventorySummary = { totalItems: 0, waterSupplyLiters: 0, foodSupplyDays: 0, lastUpdated: 0 };
const EMPTY_TOTALS: InventoryTotals = { waterLiters: 0, waterContainers: 0, waterContainersUnknownVolume: 0, totalItems: 0 };

export function useInventory() {
  // Initial state is empty; localStorage is read only in effects (hydration safe).
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>(EMPTY_SUMMARY);
  const [totals, setTotals] = useState<InventoryTotals>(EMPTY_TOTALS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<EchoError | null>(null);

  const refresh = useCallback(() => {
    const current = InventoryService.list();
    setItems(current);
    setSummary(InventoryService.getSummary());
    setTotals(computeTotals(current));
  }, []);

  useEffect(() => {
    refresh();
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === INVENTORY_KEY || e.key === null) refresh();
    };
    const handleLocal = () => refresh();
    window.addEventListener('storage', handleStorage);
    window.addEventListener(INVENTORY_CHANGED_EVENT, handleLocal);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(INVENTORY_CHANGED_EVENT, handleLocal);
    };
  }, [refresh]);

  const clearError = useCallback(() => setError(null), []);

  const applyAction = useCallback(
    (action: InventoryUpdateAction): InventoryItem[] => {
      const r = InventoryService.applyActionSafe(action);
      if (!r.ok) {
        setError(r.error);
        return InventoryService.list();
      }
      setError(null);
      refresh();
      notifyChanged();
      return r.value;
    },
    [refresh]
  );

  const addItem = useCallback(
    (item: Omit<InventoryItem, 'id' | 'updatedAt'> & { id?: string }): InventoryItem[] =>
      applyAction({ type: 'inventory_update', operation: 'add', item }),
    [applyAction]
  );

  const confirmProposal = useCallback(
    (proposal: InventoryProposal): EchoResult<InventoryReceipt> => {
      const r = InventoryService.confirmProposal(proposal);
      if (r.ok) {
        setError(null);
        refresh();
        notifyChanged();
      } else {
        setError(r.error);
      }
      return r;
    },
    [refresh]
  );

  return {
    items,
    summary,
    totals,
    isLoaded,
    error,
    clearError,
    refresh,
    addItem,
    applyAction,
    confirmProposal,
  };
}
