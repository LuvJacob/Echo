'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { SavedLocation, HazardReport } from '@/types/echo';
import { MemoryService } from '@/lib/memory';
import {
  Navigation,
  MapPin,
  AlertTriangle,
  Radio,
  Plus,
  Compass,
  ShieldCheck,
  Target,
} from 'lucide-react';

export function LocationTracker() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let locs = MemoryService.getLocations();
    if (locs.length === 0) {
      locs = [
        {
          id: 'base_sanctuary',
          label: 'Primary Sanctuary Bunker',
          notes: 'Reinforced bunker with water filtration system.',
          latitude: 37.7749,
          longitude: -122.4194,
          createdAt: Date.now() - 86400000,
          category: 'shelter',
        },
        {
          id: 'water_cache_alpha',
          label: 'Cache Alpha (Purified Water)',
          notes: 'Hidden in abandoned utility tunnel.',
          latitude: 37.7812,
          longitude: -122.4112,
          createdAt: Date.now() - 43200000,
          category: 'water_source',
        },
      ];
      locs.forEach((l) => MemoryService.saveLocation(l));
    }
    setLocations(locs);
    setHazards(MemoryService.getDemoHazards());
  }, []);

  // Radar canvas sweep animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    const width = (canvas.width = 280);
    const height = (canvas.height = 280);
    const centerX = width / 2;
    const centerY = height / 2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Radar Concentric Rings
      [40, 75, 110].forEach((r) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.setLineDash([2, 4]);
      ctx.moveTo(centerX, 20);
      ctx.lineTo(centerX, height - 20);
      ctx.moveTo(20, centerY);
      ctx.lineTo(width - 20, centerY);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.stroke();
      ctx.setLineDash([]);

      // Rotating Radar Sweep Beam
      angle += 0.03;
      const gradient = ctx.createConicGradient(angle, centerX, centerY);
      gradient.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
      gradient.addColorStop(0.15, 'rgba(0, 229, 255, 0.02)');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, 115, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Survivor Center Blip
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00e5ff';
      ctx.fill();

      // Waypoint Blips on Radar
      // Blip 1: Bunker (Shelter - Emerald)
      ctx.beginPath();
      ctx.arc(centerX - 35, centerY - 25, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#10b981';
      ctx.fill();

      // Blip 2: Water Cache (Cyan)
      ctx.beginPath();
      ctx.arc(centerX + 50, centerY - 45, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00e5ff';
      ctx.fill();

      // Blip 3: Radiation Hazard (Rose)
      ctx.beginPath();
      ctx.arc(centerX + 30, centerY + 60, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f43f5e';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = '9px monospace';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('Simulated radiation', centerX - 10, centerY + 76);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleSaveCurrentPosition = () => {
    const num = locations.length + 1;
    const updated = MemoryService.saveLocation({
      label: `Tactical Cache Delta #${num}`,
      notes: 'GPS bookmark logged during reconnaissance patrol.',
      latitude: 37.7749 + (Math.random() - 0.5) * 0.04,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.04,
      category: 'supply_cache',
    });
    setLocations([...updated]);
  };

  return (
    <Card className="flex flex-col h-full bg-echo-surface/90 border-echo-border">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-3">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-echo-emerald" />
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
            Geo-Tactical Tactical Radar
          </h2>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-echo-emerald animate-ping" />
          <Badge variant="emerald">GPS LOCKED (37.77° N)</Badge>
        </div>
      </div>

      {/* Radar Canvas Sweep Viewport */}
      <div className="relative flex flex-col items-center justify-center p-2 mb-3 bg-echo-bg/80 border border-echo-cyan/30 rounded-xl overflow-hidden">
        {/* Radar Canvas */}
        <canvas ref={canvasRef} className="w-56 h-56" />

        {/* Radar Range Legend */}
        <div className="absolute top-2 left-2 text-[9px] font-mono text-echo-muted">
          RANGE: 5.0 KM
        </div>
        <div className="absolute top-2 right-2 text-[9px] font-mono text-echo-emerald">
          SURVIVOR: NOMINAL
        </div>
        <div className="absolute bottom-2 left-2 flex items-center space-x-3 text-[9px] font-mono">
          <span className="flex items-center gap-1 text-echo-emerald">
            <span className="w-1.5 h-1.5 rounded-full bg-echo-emerald" /> Base
          </span>
          <span className="flex items-center gap-1 text-echo-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-echo-cyan" /> Cache
          </span>
          <span className="flex items-center gap-1 text-echo-rose">
            <span className="w-1.5 h-1.5 rounded-full bg-echo-rose" /> Threat
          </span>
        </div>
      </div>

      {/* Waypoints & Threat List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56 min-h-[160px]">
        {/* Saved Coordinates */}
        {locations.map((loc) => (
          <div
            key={loc.id}
            onClick={() => setSelectedWaypoint(loc.id)}
            className={`p-2.5 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
              selectedWaypoint === loc.id
                ? 'border-echo-cyan bg-echo-cyan/15 text-white'
                : 'border-echo-border bg-echo-bg/60 text-echo-text hover:border-echo-cyan/40'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center space-x-1.5 font-bold text-white">
                <MapPin className="w-3.5 h-3.5 text-echo-emerald shrink-0" />
                <span>{loc.label}</span>
              </div>
              <Badge variant="cyan">{loc.category || 'WAYPOINT'}</Badge>
            </div>
            <div className="text-[10px] text-echo-muted flex items-center justify-between mt-1">
              <span>{loc.notes}</span>
              <span className="text-echo-cyan font-semibold">
                {loc.latitude.toFixed(4)}°, {loc.longitude.toFixed(4)}°
              </span>
            </div>
          </div>
        ))}

        {/* Hazards */}
        {hazards.map((h) => (
          <div
            key={h.id}
            className="p-2.5 rounded-xl border border-echo-rose/40 bg-echo-rose/10 text-xs font-mono text-echo-rose"
          >
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-echo-rose shrink-0" />
                <span>{h.title}</span>
              </div>
              <Badge variant="rose">SIMULATED THREAT</Badge>
            </div>
            <div className="text-[10px] text-echo-muted mt-0.5">
              {h.details}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-echo-border mt-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSaveCurrentPosition}
          className="w-full text-xs border-echo-emerald/40 text-echo-emerald hover:bg-echo-emerald/10"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Bookmark Current Tactical Coordinates
        </Button>
      </div>
    </Card>
  );
}
