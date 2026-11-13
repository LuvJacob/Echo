import { EchoStorage } from '@/lib/storage/localStorage';
import { SavedLocation, HazardReport } from '@/types/echo';
import { generateId } from '@/lib/utils';

export class MemoryService {
  /**
   * Save a tactical coordinate or base location
   */
  static saveLocation(
    location: Omit<SavedLocation, 'id' | 'createdAt'> & { id?: string }
  ): SavedLocation[] {
    const current = EchoStorage.getLocations();
    const newLocation: SavedLocation = {
      id: location.id || generateId('loc'),
      label: location.label,
      notes: location.notes,
      latitude: location.latitude,
      longitude: location.longitude,
      createdAt: Date.now(),
      category: location.category || 'supply_cache',
    };
    current.push(newLocation);
    EchoStorage.saveLocations(current);
    return current;
  }

  /**
   * Retrieve all saved locations
   */
  static getLocations(): SavedLocation[] {
    return EchoStorage.getLocations();
  }

  /**
   * Seed demo locations / hazards for testing
   */
  static getDemoHazards(): HazardReport[] {
    return [
      {
        id: 'hazard_demo_1',
        title: 'Elevated Radiation Sector 4',
        type: 'radiation',
        latitude: 37.7749,
        longitude: -122.4194,
        reportedAt: Date.now() - 3600000,
        verificationStatus: 'demo_only',
        isDemo: true,
        severity: 'moderate',
        details: 'Simulated hazard for HackPerimeter demo only. Not an active threat.',
      },
    ];
  }
}
