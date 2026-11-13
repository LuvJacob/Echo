'use client';

import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, InventorySummary, InventoryUpdateAction } from '@/types/echo';
import { InventoryService } from '@/lib/inventory/service';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalItems: 0,
    waterSupplyLiters: 0,
    foodSupplyDays: 0,
    lastUpdated: Date.now(),
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    let current = InventoryService.list();
    if (current.length === 0) {
      // Seed default items on first launch if empty
      current = InventoryService.seedDemoSupplies();
    }
    setItems(current);
    setSummary(InventoryService.getSummary());
  }, []);

  useEffect(() => {
    refresh();
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'echo_inventory_v1') {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const addItem = useCallback(
    (item: Omit<InventoryItem, 'id' | 'updatedAt'> & { id?: string }) => {
      const updated = InventoryService.add(item);
      setItems(updated);
      setSummary(InventoryService.getSummary());
      return updated;
    },
    []
  );

  const applyAction = useCallback((action: InventoryUpdateAction) => {
    const updated = InventoryService.executeAction(action);
    setItems(updated);
    setSummary(InventoryService.getSummary());
    return updated;
  }, []);

  return {
    items,
    summary,
    isLoaded,
    refresh,
    addItem,
    applyAction,
  };
}
