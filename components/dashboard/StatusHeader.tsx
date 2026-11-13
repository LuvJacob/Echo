'use client';

import React, { useState, useEffect } from 'react';
import { formatHudTime } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { Shield, Radio, BatteryMedium, Cpu, Activity, AlertOctagon } from 'lucide-react';

export function StatusHeader() {
  const [hudTime, setHudTime] = useState<string>('00:00:00');
  const [sessionUptime, setSessionUptime] = useState<number>(0);

  useEffect(() => {
    setHudTime(formatHudTime());
    const interval = setInterval(() => {
      setHudTime(formatHudTime());
      setSessionUptime((u) => u + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `T+${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <header className="flex flex-wrap items-center justify-between border-b border-echo-border pb-3.5 mb-4 gap-3 bg-echo-surface/40 backdrop-blur-md px-4 py-3 rounded-2xl border">
      {/* Brand & Call-sign */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-echo-cyan/15 border border-echo-cyan/50 flex items-center justify-center text-echo-cyan shadow-[0_0_15px_rgba(0,229,255,0.3)]">
          <Shield className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold font-mono tracking-widest text-white">ECHO</h1>
            <Badge variant="cyan">MISSION AI</Badge>
          </div>
          <p className="text-[10px] text-echo-muted font-mono tracking-wider">
            ORBITAL ESCAPE COMPANION // SEC-09
          </p>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-echo-surface border border-echo-emerald/30 text-echo-emerald">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-[11px] font-bold">LINK: 98%</span>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-echo-surface border border-echo-cyan/30 text-echo-cyan">
          <Cpu className="w-3.5 h-3.5" />
          <span className="text-[11px]">NEURAL: ACTIVE</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-echo-surface border border-echo-amber/30 text-echo-amber">
          <Activity className="w-3.5 h-3.5" />
          <span className="text-[11px]">{formatUptime(sessionUptime)}</span>
        </div>

        <div className="text-white font-mono font-bold px-3 py-1 bg-echo-bg/80 border border-echo-border rounded-lg text-xs">
          {hudTime} <span className="text-[10px] text-echo-muted font-normal">UTC</span>
        </div>
      </div>
    </header>
  );
}
