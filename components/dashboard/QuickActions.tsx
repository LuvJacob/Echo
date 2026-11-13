'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { Droplet, Camera, MapPin, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onCheckWater: () => void;
  onScanSupplies: () => void;
  onSaveLocation: () => void;
  onAskTip: () => void;
  disabled?: boolean;
}

export function QuickActions({
  onCheckWater,
  onScanSupplies,
  onSaveLocation,
  onAskTip,
  disabled = false,
}: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <Button
        variant="secondary"
        size="sm"
        onClick={onCheckWater}
        disabled={disabled}
        className="w-full justify-start text-xs border-echo-cyan/30 text-echo-cyan hover:bg-echo-cyan/10"
      >
        <Droplet className="w-3.5 h-3.5 text-echo-cyan mr-1.5 shrink-0" />
        <span>Check Water</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onScanSupplies}
        disabled={disabled}
        className="w-full justify-start text-xs border-echo-amber/30 text-echo-amber hover:bg-echo-amber/10"
      >
        <Camera className="w-3.5 h-3.5 text-echo-amber mr-1.5 shrink-0" />
        <span>Scan Photo</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onSaveLocation}
        disabled={disabled}
        className="w-full justify-start text-xs border-echo-emerald/30 text-echo-emerald hover:bg-echo-emerald/10"
      >
        <MapPin className="w-3.5 h-3.5 text-echo-emerald mr-1.5 shrink-0" />
        <span>Save Cache</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={onAskTip}
        disabled={disabled}
        className="w-full justify-start text-xs border-echo-purple/30 text-echo-purple hover:bg-echo-purple/10"
      >
        <Sparkles className="w-3.5 h-3.5 text-echo-purple mr-1.5 shrink-0" />
        <span>Survival Tip</span>
      </Button>
    </div>
  );
}
