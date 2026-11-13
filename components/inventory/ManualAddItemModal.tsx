'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { ItemCategory, InventoryItem } from '@/types/echo';
import { Plus, X, Package } from 'lucide-react';

interface ManualAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => void;
}

export function ManualAddItemModal({ isOpen, onClose, onAdd }: ManualAddItemModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('water');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('bottles');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      category,
      quantity: Number(quantity) || 1,
      unit: unit.trim() || 'units',
      source: 'manual',
      notes: notes.trim() || undefined,
    });

    // Reset & close
    setName('');
    setQuantity(1);
    setNotes('');
    onClose();
  };

  const categories: ItemCategory[] = ['water', 'food', 'medical', 'tool', 'fuel', 'other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <Card glow="cyan" className="max-w-md w-full bg-echo-surface border-echo-cyan/60 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-4">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-echo-cyan" />
            <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
              Log Survival Asset
            </h3>
          </div>
          <button onClick={onClose} className="text-echo-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-echo-muted uppercase mb-1">
              Asset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Purified Water Bottle, Protein Bar..."
              className="w-full bg-echo-bg border border-echo-border focus:border-echo-cyan rounded-lg p-2.5 text-xs font-mono text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-echo-muted uppercase mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full bg-echo-bg border border-echo-border focus:border-echo-cyan rounded-lg p-2.5 text-xs font-mono text-white capitalize"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-echo-muted uppercase mb-1">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 bg-echo-bg border border-echo-border focus:border-echo-cyan rounded-lg p-2.5 text-xs font-mono text-white text-center"
                />
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="unit (e.g. cans)"
                  className="flex-1 bg-echo-bg border border-echo-border focus:border-echo-cyan rounded-lg p-2.5 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-echo-muted uppercase mb-1">
              Tactical Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stored in North Bunker Locker"
              className="w-full bg-echo-bg border border-echo-border focus:border-echo-cyan rounded-lg p-2.5 text-xs font-mono text-white"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-echo-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              <Plus className="w-4 h-4 mr-1" />
              Commit to Manifest
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
