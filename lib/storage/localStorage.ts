import { InventoryItem, SavedLocation, ChatMessage } from '@/types/echo';

const STORAGE_KEYS = {
  INVENTORY: 'echo_inventory_v1',
  LOCATIONS: 'echo_saved_locations_v1',
  CHAT_HISTORY: 'echo_chat_history_v1',
  SETTINGS: 'echo_system_settings_v1',
} as const;

export class EchoStorage {
  private static isClient(): boolean {
    return typeof window !== 'undefined';
  }

  // --- Inventory Storage ---
  static getInventory(): InventoryItem[] {
    if (!this.isClient()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[EchoStorage] Failed to read inventory from localStorage', e);
      return [];
    }
  }

  static saveInventory(items: InventoryItem[]): void {
    if (!this.isClient()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    } catch (e) {
      console.error('[EchoStorage] Failed to write inventory to localStorage', e);
    }
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
  }
}
