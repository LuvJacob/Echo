'use client';

import React from 'react';
import { InventorySummary } from '@/types/echo';
import { Card, Badge } from '@/components/ui';
import { Droplet, Utensils, HeartPulse, BatteryCharging, Zap } from 'lucide-react';

interface SurvivalGaugesProps {
  summary: InventorySummary;
  batteryLevel?: number;
}

export function SurvivalGauges({ summary, batteryLevel = 94 }: SurvivalGaugesProps) {
  // Survival thresholds calculation
  // Daily target: ~2.5L water/day for adult in moderate scenario
  const waterDays = Math.round((summary.waterSupplyLiters / 2.5) * 10) / 10;
  const waterPct = Math.min(100, Math.round((summary.waterSupplyLiters / 10) * 100)); // Cap at 10L baseline

  // Food target: ~3 days minimum safety threshold
  const foodPct = Math.min(100, Math.round((summary.foodSupplyDays / 7) * 100));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
      {/* 1. Water Reserves Gauge */}
      <Card glow="cyan" className="p-3 bg-echo-surface/90 border-echo-cyan/30 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-echo-cyan">
            <Droplet className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase">Hydration</span>
          </div>
          <Badge variant={summary.waterSupplyLiters < 1.5 ? 'rose' : 'cyan'}>
            {summary.waterSupplyLiters < 1.5 ? 'LOW' : 'NOMINAL'}
          </Badge>
        </div>

        <div className="my-1">
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            {summary.waterSupplyLiters} <span className="text-xs font-normal text-echo-muted">L</span>
          </div>
          <div className="text-[10px] font-mono text-echo-muted">
            ~{waterDays} days buffer
          </div>
        </div>

        {/* Meter Bar */}
        <div className="w-full bg-echo-bg h-1.5 rounded-full overflow-hidden mt-1 border border-echo-border">
          <div
            className="h-full bg-echo-cyan transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(0,229,255,0.6)]"
            style={{ width: `${Math.max(5, waterPct)}%` }}
          />
        </div>
      </Card>

      {/* 2. Food / Rations Gauge */}
      <Card glow="amber" className="p-3 bg-echo-surface/90 border-echo-amber/30 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-echo-amber">
            <Utensils className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase">Rations</span>
          </div>
          <Badge variant={summary.foodSupplyDays < 2 ? 'amber' : 'emerald'}>
            {summary.foodSupplyDays < 2 ? 'RATION' : 'SECURE'}
          </Badge>
        </div>

        <div className="my-1">
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            {summary.foodSupplyDays} <span className="text-xs font-normal text-echo-muted">Days</span>
          </div>
          <div className="text-[10px] font-mono text-echo-muted">
            Calorie buffer est.
          </div>
        </div>

        {/* Meter Bar */}
        <div className="w-full bg-echo-bg h-1.5 rounded-full overflow-hidden mt-1 border border-echo-border">
          <div
            className="h-full bg-echo-amber transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(255,179,0,0.6)]"
            style={{ width: `${Math.max(5, foodPct)}%` }}
          />
        </div>
      </Card>

      {/* 3. Medical Supplies Gauge */}
      <Card className="p-3 bg-echo-surface/90 border-echo-rose/30 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-echo-rose">
            <HeartPulse className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase">Med Vitals</span>
          </div>
          <Badge variant="emerald">READY</Badge>
        </div>

        <div className="my-1">
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            1 <span className="text-xs font-normal text-echo-muted">Trauma Kit</span>
          </div>
          <div className="text-[10px] font-mono text-echo-muted">
            Sterile seal intact
          </div>
        </div>

        {/* Meter Bar */}
        <div className="w-full bg-echo-bg h-1.5 rounded-full overflow-hidden mt-1 border border-echo-border">
          <div
            className="h-full bg-echo-rose transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"
            style={{ width: '85%' }}
          />
        </div>
      </Card>

      {/* 4. Power & Battery Grid */}
      <Card className="p-3 bg-echo-surface/90 border-echo-emerald/30 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center space-x-1.5 text-echo-emerald">
            <BatteryCharging className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase">Tactical PWR</span>
          </div>
          <Badge variant="emerald">94%</Badge>
        </div>

        <div className="my-1">
          <div className="text-lg font-mono font-bold text-white tracking-tight">
            28.4 <span className="text-xs font-normal text-echo-muted">Hrs</span>
          </div>
          <div className="text-[10px] font-mono text-echo-muted">
            Solar cell trickle +0.4A
          </div>
        </div>

        {/* Meter Bar */}
        <div className="w-full bg-echo-bg h-1.5 rounded-full overflow-hidden mt-1 border border-echo-border">
          <div
            className="h-full bg-echo-emerald transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"
            style={{ width: `${batteryLevel}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
