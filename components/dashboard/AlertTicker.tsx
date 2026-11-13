'use client';

import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui';

export interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

export function AlertTicker() {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'alert-1',
      level: 'warning',
      title: '[SIMULATED] SOLAR RADIATION ELEVATED',
      message: 'UV/Ionization index +18% above baseline in Sector 4. Limit unshielded exposure.',
      timestamp: '02M AGO',
    },
    {
      id: 'alert-2',
      level: 'info',
      title: 'WATER PURIFICATION LOGGED',
      message: '2.5L reserve verified in Sanctuary Cache. Daily baseline requirement met.',
      timestamp: '14M AGO',
    },
  ]);

  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || alerts.length === 0) return null;

  const current = alerts[activeAlertIndex];

  const levelStyles = {
    critical: 'bg-echo-rose/15 border-echo-rose/40 text-echo-rose',
    warning: 'bg-echo-amber/15 border-echo-amber/40 text-echo-amber',
    info: 'bg-echo-cyan/15 border-echo-cyan/40 text-echo-cyan',
  };

  const badgeVariant = {
    critical: 'rose' as const,
    warning: 'amber' as const,
    info: 'cyan' as const,
  };

  return (
    <div
      className={`w-full border rounded-xl p-2.5 sm:px-4 mb-4 flex items-center justify-between text-xs font-mono transition-all duration-300 ${levelStyles[current.level]}`}
    >
      <div className="flex items-center space-x-2.5 overflow-hidden">
        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
        <Badge variant={badgeVariant[current.level]}>
          {current.title}
        </Badge>
        <span className="truncate text-echo-text/90 hidden sm:inline">
          {current.message}
        </span>
        <span className="text-[10px] text-echo-muted shrink-0">
          [{current.timestamp}]
        </span>
      </div>

      <div className="flex items-center space-x-2 shrink-0 ml-2">
        {alerts.length > 1 && (
          <button
            onClick={() => setActiveAlertIndex((prev) => (prev + 1) % alerts.length)}
            className="hover:text-white p-1 rounded hover:bg-echo-surface/40 flex items-center text-[10px]"
            title="Next Alert"
          >
            <span>NEXT</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="hover:text-white p-1 rounded hover:bg-echo-surface/40"
          title="Dismiss Alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
