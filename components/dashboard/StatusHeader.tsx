'use client';

import React, { useState, useEffect } from 'react';
import { formatHudTime } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { Shield, Radio, BatteryMedium, Cpu } from 'lucide-react';

export function StatusHeader() {
  const [hudTime, setHudTime] = useState<string>('00:00:00');

  useEffect(() => {
    setHudTime(formatHudTime());
    const interval = setInterval(() => {
      setHudTime(formatHudTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between border-b border-echo-border pb-4 mb-6 gap-3">
      {/* Brand & Call-sign */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-echo-cyan/10 border border-echo-cyan/40 flex items-center justify-center text-echo-cyan shadow-[0_0_12px_rgba(0,229,255,0.2)]">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold font-mono tracking-wider text-white">ECHO</h1>
            <Badge variant="cyan">v0.1.0-ALPHA</Badge>
          </div>
          <p className="text-xs text-echo-muted font-mono">TACTICAL SURVIVAL COMPANION // ESCAPE-FROM-EARTH</p>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="flex items-center space-x-4 text-xs font-mono text-echo-muted bg-echo-surface/60 border border-echo-border px-3 py-1.5 rounded-lg">
        <div className="flex items-center space-x-1.5 text-echo-emerald">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>LINK: NOMINAL</span>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 text-echo-cyan">
          <Cpu className="w-3.5 h-3.5" />
          <span>AI CORE: ONLINE</span>
        </div>
        <div className="flex items-center space-x-1.5 text-echo-amber">
          <BatteryMedium className="w-3.5 h-3.5" />
          <span>PWR: 94%</span>
        </div>
        <div className="text-echo-text font-semibold pl-2 border-l border-echo-border">
          {hudTime}
        </div>
      </div>
    </header>
  );
}
