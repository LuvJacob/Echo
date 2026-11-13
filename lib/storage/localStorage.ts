import { InventoryItem, SavedLocation, ChatMessage } from '@/types/echo';
import { InventoryStore, KeyValueStorage, INVENTORY_KEY } from '@/lib/inventory/store';

/** Browser localStorage, or an in-memory no-op store during SSR. */
export const browserStorage: KeyValueStorage = {
  getItem: (k) => (typeof window === 'undefined' ? null : window.localStorage.getItem(k)),
  setItem: (k, v) => {
    if (typeof window === 'undefined') throw new Error('Storage is unavailable during server render');
    window.localStorage.setItem(k, v);
  },
};

/** The single canonical inventory store used by the app. */
export const inventoryStore = new InventoryStore(browserStorage);

const STORAGE_KEYS = {
  INVENTORY: INVENTORY_KEY,
  LOCATIONS: 'echo_saved_locations_v1',
  CHAT_HISTORY: 'echo_chat_history_v1',
  SETTINGS: 'echo_system_settings_v1',
} as const;

export class EchoStorage {
  private static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  // --- Inventory Storage (delegates to the canonical InventoryStore) ---
  static getInventory(): InventoryItem[] {
    if (!this.isClient()) return [];
    return inventoryStore.list();
  }

  /** Throws if the write fails so callers can't silently lose data. */
  static saveInventory(items: InventoryItem[]): void {
    if (!this.isClient()) return;
    const r = inventoryStore.replaceAll(items);
    if (!r.ok) throw new Error(r.error.message);
  }

  // --- Location Storage ---
  static getLocations(): SavedLocation[] {
    if (!this.isClient()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[EchoStorage] Failed to read locations from localStorage', e);
      return [];
    }
  }

  static saveLocations(locations: SavedLocation[]): void {
    if (!this.isClient()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
    } catch (e) {
      console.error('[EchoStorage] Failed to write locations to localStorage', e);
    }
  }

  // --- Chat History Storage ---
  static getChatHistory(): ChatMessage[] {
    if (!this.isClient()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[EchoStorage] Failed to read chat history', e);
      return [];
    }
  }

  static saveChatHistory(history: ChatMessage[]): void {
    if (!this.isClient()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('[EchoStorage] Failed to write chat history', e);
    }
  }

  // --- Clear / Reset ---
  static clearAll(): void {
    if (!this.isClient()) return;
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('echo_inventory_v1');
  }
}
