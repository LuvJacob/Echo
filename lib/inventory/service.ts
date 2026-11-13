import { InventoryItem, InventorySummary, InventoryUpdateAction } from '@/types/echo';
import { EchoStorage } from '@/lib/storage/localStorage';
import { generateId } from '@/lib/utils';

export class InventoryService {
  /**
   * Get all items in current inventory
   */
  static list(): InventoryItem[] {
    return EchoStorage.getInventory();
  }

  /**
   * Add or update an inventory item
   */
  static add(
    item: Omit<InventoryItem, 'id' | 'updatedAt'> & { id?: string }
  ): InventoryItem[] {
    const current = this.list();
    const existingIndex = current.findIndex(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Merge quantity
      current[existingIndex] = {
        ...current[existingIndex],
        quantity: current[existingIndex].quantity + item.quantity,
        updatedAt: Date.now(),
        source: item.source || current[existingIndex].source,
      };
    } else {
      const newItem: InventoryItem = {
        id: item.id || generateId('item'),
        name: item.name,
        category: item.category || 'other',
        quantity: item.quantity,
        unit: item.unit || 'units',
        source: item.source || 'manual',
        updatedAt: Date.now(),
        notes: item.notes,
        expiryDate: item.expiryDate,
      };
      current.push(newItem);
    }

    EchoStorage.saveInventory(current);
    return current;
  }

  /**
   * Execute an inventory action
   */
  static executeAction(action: InventoryUpdateAction): InventoryItem[] {
    const current = this.list();

    switch (action.operation) {
      case 'add':
        return this.add(action.item);

      case 'remove': {
        const targetIndex = current.findIndex(
          (i) =>
            i.id === action.item.id ||
            i.name.toLowerCase() === action.item.name?.toLowerCase()
        );
        if (targetIndex >= 0) {
          const newQty = current[targetIndex].quantity - (action.item.quantity || 1);
          if (newQty <= 0) {
            current.splice(targetIndex, 1);
          } else {
            current[targetIndex].quantity = newQty;
            current[targetIndex].updatedAt = Date.now();
          }
        }
        EchoStorage.saveInventory(current);
        return current;
      }

      case 'set': {
        const targetIndex = current.findIndex(
          (i) =>
            i.id === action.item.id ||
            i.name.toLowerCase() === action.item.name?.toLowerCase()
        );
        if (targetIndex >= 0) {
          current[targetIndex] = {
            ...current[targetIndex],
            ...action.item,
            id: current[targetIndex].id,
            updatedAt: Date.now(),
          };
        } else {
          return this.add(action.item);
        }
        EchoStorage.saveInventory(current);
        return current;
      }

      case 'clear':
        EchoStorage.saveInventory([]);
        return [];

      default:
        return current;
    }
  }

  /**
   * Calculate high-level summary metrics
   */
  static getSummary(): InventorySummary {
    const items = this.list();
    const waterItems = items.filter((i) => i.category === 'water');
    const foodItems = items.filter((i) => i.category === 'food');

    // Basic heuristic: sum water in liters/bottles
    const waterSupplyLiters = waterItems.reduce((acc, curr) => acc + curr.quantity * 0.5, 0);
    const foodSupplyDays = foodItems.reduce((acc, curr) => acc + curr.quantity * 0.33, 0);

    return {
      totalItems: items.reduce((acc, curr) => acc + curr.quantity, 0),
      waterSupplyLiters: Math.round(waterSupplyLiters * 10) / 10,
      foodSupplyDays: Math.round(foodSupplyDays * 10) / 10,
      lastUpdated: items.length > 0 ? Math.max(...items.map((i) => i.updatedAt)) : Date.now(),
    };
  }

  /**
   * Seed demo supplies for instant hackathon demonstration
   */
  static seedDemoSupplies(): InventoryItem[] {
    const demoItems: InventoryItem[] = [
      {
        id: generateId('item'),
        name: 'Purified Water Bottle (500ml)',
        category: 'water',
        quantity: 2,
        unit: 'bottles',
        source: 'system_seed',
        updatedAt: Date.now(),
      },
      {
        id: generateId('item'),
        name: 'MRE Ration Pack',
        category: 'food',
        quantity: 3,
        unit: 'packs',
        source: 'system_seed',
        updatedAt: Date.now(),
      },
      {
        id: generateId('item'),
        name: 'Emergency Medical Kit',
        category: 'medical',
        quantity: 1,
        unit: 'kits',
        source: 'system_seed',
        updatedAt: Date.now(),
      },
    ];
    EchoStorage.saveInventory(demoItems);
    return demoItems;
  }
}
