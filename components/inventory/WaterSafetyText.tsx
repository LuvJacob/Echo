import React from 'react';
import { WATER_SAFETY_LABEL, type WaterSafety } from '@/types/echo';

/** Contaminated water renders as big bold red "DO NOT DRINK"; other states use the normal label. */
export function WaterSafetyText({ safety }: { safety: WaterSafety }) {
  if (safety === 'possible_contamination') {
    return (
      <span className="inline-flex flex-col leading-tight">
        <span className="text-base sm:text-lg font-black uppercase tracking-wider text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.7)]">
          ⚠ DO NOT DRINK
        </span>
        <span className="text-[10px] font-bold uppercase text-red-400">Contaminated</span>
      </span>
    );
  }
  return <>{WATER_SAFETY_LABEL[safety]}</>;
}
