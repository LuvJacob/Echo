'use client';

import React from 'react';
import { InventoryItem, InventorySummary } from '@/types/echo';
import { Card, Badge, Button } from '@/components/ui';
import { Package, Droplets, Utensils, HeartPulse, Wrench, Shield, Plus } from 'lucide-react';

interface InventoryListProps {
  items: InventoryItem[];
  summary: InventorySummary;
  onAddItem?: () => void;
}

export function InventoryList({ items, summary, onAddItem }: InventoryListProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'water':
        return <Droplets className="w-4 h-4 text-echo-cyan" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-echo-amber" />;
      case 'medical':
        return <HeartPulse className="w-4 h-4 text-echo-rose" />;
      case 'tool':
        return <Wrench className="w-4 h-4 text-echo-emerald" />;
      default:
        return <Package className="w-4 h-4 text-echo-muted" />;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-3">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-echo-cyan" />
          <h2 className="text-sm font-mono font-semibold tracking-wider uppercase text-white">
            Survival Manifest
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="cyan">{summary.totalItems} Units</Badge>
          {onAddItem && (
            <Button size="sm" variant="ghost" onClick={onAddItem} className="p-1 h-7">
              <Plus className="w-4 h-4 text-echo-cyan" />
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-echo-bg/60 border border-echo-cyan/20 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] font-mono text-echo-muted uppercase">Water Reserves</span>
          <span className="text-base font-mono font-bold text-echo-cyan">
            {summary.waterSupplyLiters} L
          </span>
        </div>
        <div className="bg-echo-bg/60 border border-echo-amber/20 rounded-lg p-2 flex flex-col">
          <span className="text-[10px] font-mono text-echo-muted uppercase">Food Est.</span>
          <span className="text-base font-mono font-bold text-echo-amber">
            ~{summary.foodSupplyDays} Days
          </span>
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
        {items.length === 0 ? (
          <div className="text-center py-8 text-echo-muted text-xs font-mono">
            No supplies logged in manifest.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-echo-bg/40 border border-echo-border hover:border-echo-cyan/40 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded bg-echo-surface border border-echo-border">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <div className="text-xs font-mono font-medium text-echo-text">
                    {item.name}
                  </div>
                  <div className="text-[10px] font-mono text-echo-muted uppercase flex items-center space-x-1.5">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span className="text-echo-cyan/70">{item.source}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-mono font-bold text-echo-cyan">
                  {item.quantity} <span className="text-xs font-normal text-echo-muted">{item.unit}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
