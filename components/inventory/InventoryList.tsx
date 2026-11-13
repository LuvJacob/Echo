'use client';
import { WaterSafetyText } from '@/components/inventory/WaterSafetyText';

import React, { useState } from 'react';
import { InventoryItem, InventorySummary, ItemCategory, CATEGORY_LABEL, WATER_SAFETY_LABEL } from '@/types/echo';
import { Card, Badge, Button } from '@/components/ui';
import {
  Package,
  Droplets,
  Utensils,
  HeartPulse,
  Wrench,
  Camera,
  Plus,
  Search,
  RotateCcw,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface InventoryListProps {
  items: InventoryItem[];
  summary: InventorySummary;
  onAddItem?: () => void;
  onScanPhoto?: () => void;
  onQuantityChange?: (itemId: string, delta: number) => void;
  onResetSeed?: () => void;
  onClearAll?: () => void;
}

export function InventoryList({
  items,
  summary,
  onAddItem,
  onScanPhoto,
  onQuantityChange,
  onResetSeed,
  onClearAll,
}: InventoryListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const categories = [
    { id: 'all', label: 'ALL' },
    { id: 'water', label: 'WATER' },
    { id: 'food', label: 'RATIONS' },
    { id: 'medical', label: 'MEDICAL' },
    { id: 'tool', label: 'TOOLS' },
  ];

  return (
    <Card className="flex flex-col h-full bg-echo-surface/90 border-echo-border">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-3">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-echo-cyan" />
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
            Survival Supply Manifest
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="cyan">{summary.totalItems} Total Units</Badge>
          {onScanPhoto && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onScanPhoto}
              className="text-xs px-2.5 py-1 border-echo-amber/40 text-echo-amber hover:bg-echo-amber/10"
              title="Scan supplies with AI camera"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              <span>Scan Photo</span>
            </Button>
          )}
          {onAddItem && (
            <Button
              size="sm"
              variant="primary"
              onClick={onAddItem}
              className="text-xs px-2.5 py-1"
              title="Add item manually"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Category Filter Chips & Search Bar */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                selectedCategory === c.id
                  ? 'bg-echo-cyan text-echo-bg font-bold shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                  : 'bg-echo-bg/70 border border-echo-border text-echo-muted hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-echo-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manifest by asset name..."
            className="w-full bg-echo-bg/80 border border-echo-border rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-echo-muted focus:outline-none focus:border-echo-cyan"
          />
        </div>
      </div>

      {/* Item List Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-80 min-h-[220px]">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-echo-muted text-xs font-mono border border-dashed border-echo-border rounded-xl">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-echo-cyan" />
            <p>No supplies matching filter in current manifest.</p>
            {onResetSeed && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onResetSeed}
                className="mt-3 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Seed Demo Supplies
              </Button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-echo-bg/60 border border-echo-border hover:border-echo-cyan/40 rounded-xl p-3 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-echo-surface border border-echo-border shrink-0">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-white group-hover:text-echo-cyan transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[10px] font-mono text-echo-muted flex items-center space-x-2 mt-0.5">
                    <span className="uppercase font-semibold text-echo-text/70">{CATEGORY_LABEL[item.category] ?? item.category}</span>
                    <span>•</span>
                    <span className="text-echo-cyan/80">via {item.source}</span>
                    {item.notes && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[120px] text-echo-muted">{item.notes}</span>
                      </>
                    )}
                  </div>
                  {item.waterSafety && (
                    <span
                      className={`inline-block mt-1 px-1.5 py-0.5 rounded border text-[9px] font-mono ${
                        item.waterSafety === 'possible_contamination'
                          ? 'border-echo-rose/50 bg-echo-rose/10 text-echo-rose'
                          : item.waterSafety === 'safety_unknown'
                            ? 'border-echo-amber/50 bg-echo-amber/10 text-echo-amber'
                            : 'border-echo-emerald/50 bg-echo-emerald/10 text-echo-emerald'
                      }`}
                    >
                      <WaterSafetyText safety={item.waterSafety} />
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Counter & Quick Increment Controls */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-echo-cyan">
                    {item.quantity}{' '}
                    <span className="text-[10px] font-normal text-echo-muted">{item.unit}</span>
                  </div>
                </div>

                {onQuantityChange && (
                  <div className="flex flex-col space-y-0.5">
                    <button
                      onClick={() => onQuantityChange(item.id, 1)}
                      className="p-0.5 rounded hover:bg-echo-surface text-echo-muted hover:text-echo-cyan transition-colors"
                      title="Add 1"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onQuantityChange(item.id, -1)}
                      className="p-0.5 rounded hover:bg-echo-surface text-echo-muted hover:text-echo-rose transition-colors"
                      title="Deduct 1"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Utility Actions */}
      <div className="pt-3 border-t border-echo-border mt-3 flex items-center justify-between text-[11px] font-mono text-echo-muted">
        <span>Persistent Storage: LocalStorage Synced</span>
        <div className="flex items-center space-x-2">
          {onResetSeed && (
            <button
              onClick={onResetSeed}
              className="text-echo-cyan hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Seed</span>
            </button>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-echo-rose/80 hover:text-echo-rose hover:underline flex items-center gap-1 ml-2"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
