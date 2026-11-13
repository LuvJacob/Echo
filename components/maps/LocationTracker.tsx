'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { SavedLocation, HazardReport } from '@/types/echo';
import { MemoryService } from '@/lib/memory';
import { MapPin, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';

export function LocationTracker() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);

  useEffect(() => {
    setLocations(MemoryService.getLocations());
    setHazards(MemoryService.getDemoHazards());
  }, []);

  const handleSaveCurrentPosition = () => {
    const updated = MemoryService.saveLocation({
      label: `Sector Delta Cache #${locations.length + 1}`,
      notes: 'Logged via tactical GPS beacon',
      latitude: 37.7749 + (Math.random() - 0.5) * 0.05,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.05,
      category: 'supply_cache',
    });
    setLocations([...updated]);
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-3">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-echo-emerald" />
          <h2 className="text-sm font-mono font-semibold tracking-wider uppercase text-white">
            Geo-Tactical Beacon
          </h2>
        </div>
        <Badge variant="emerald">GPS LOCKED</Badge>
      </div>

      <div className="space-y-2 mb-3">
        <div className="bg-echo-bg/60 border border-echo-border rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-echo-emerald" />
            <div>
              <div className="text-xs font-mono font-bold text-white">Primary Sanctuary Base</div>
              <div className="text-[10px] font-mono text-echo-muted">37.7749° N, 122.4194° W</div>
            </div>
          </div>
          <Badge variant="cyan">BASE</Badge>
        </div>

        {hazards.map((h) => (
          <div
            key={h.id}
            className="bg-echo-rose/10 border border-echo-rose/30 rounded-lg p-2.5 flex items-start space-x-2 text-xs font-mono"
          >
            <AlertTriangle className="w-4 h-4 text-echo-rose shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-echo-rose">{h.title}</div>
              <div className="text-[10px] text-echo-muted">{h.details}</div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleSaveCurrentPosition}
        className="mt-auto border-echo-emerald/40 text-echo-emerald hover:bg-echo-emerald/10 text-xs"
      >
        <MapPin className="w-3.5 h-3.5 mr-1.5" />
        Bookmark Current Coordinates
      </Button>
    </Card>
  );
}
