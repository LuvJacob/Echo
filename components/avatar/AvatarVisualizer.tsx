'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AvatarStatus } from '@/types/echo';
import { cn } from '@/lib/utils';

interface AvatarVisualizerProps {
  status: AvatarStatus;
  amplitude?: number; // 0 to 1 for voice reactivity
  onClick?: () => void;
  className?: string;
}

export function AvatarVisualizer({
  status,
  amplitude = 0,
  onClick,
  className,
}: AvatarVisualizerProps) {
  // Status color mappings
  const statusColors = {
    idle: {
      primary: '#00e5ff',
      glow: 'rgba(0, 229, 255, 0.4)',
      label: 'SYSTEM IDLE // STANDBY',
    },
    listening: {
      primary: '#10b981',
      glow: 'rgba(16, 185, 129, 0.6)',
      label: 'AUDIO SENSOR // LISTENING',
    },
    thinking: {
      primary: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.6)',
      label: 'NEURAL CORE // PROCESSING',
    },
    speaking: {
      primary: '#00e5ff',
      glow: 'rgba(0, 229, 255, 0.8)',
      label: 'VOCAL SYNTH // BROADCASTING',
    },
    error: {
      primary: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.7)',
      label: 'DIAGNOSTIC // WARNING',
    },
  };

  const current = statusColors[status] || statusColors.idle;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center p-6 select-none cursor-pointer group',
        className
      )}
    >
      {/* Outer Hologram Ring */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
        {/* Ambient Glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-500 opacity-40 group-hover:opacity-60"
          style={{ backgroundColor: current.primary }}
        />

        {/* Orbit Ring 1 (Clockwise) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: status === 'thinking' ? 4 : 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 border border-dashed rounded-full"
          style={{ borderColor: `${current.primary}40` }}
        />

        {/* Orbit Ring 2 (Counter-Clockwise) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: status === 'thinking' ? 6 : 30, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 border border-dotted rounded-full"
          style={{ borderColor: `${current.primary}30` }}
        />

        {/* Holographic Avatar Core SVG */}
        <motion.svg
          viewBox="0 0 200 200"
          className="w-40 h-40 sm:w-48 sm:h-48 z-10 drop-shadow-[0_0_15px_rgba(0,229,255,0.4)]"
          animate={{
            scale: status === 'speaking' ? [1, 1.05 + amplitude * 0.1, 1] : 1,
          }}
          transition={{ duration: 0.4, repeat: status === 'speaking' ? Infinity : 0 }}
        >
          {/* Hexagon Shield */}
          <polygon
            points="100,20 170,60 170,140 100,180 30,140 30,60"
            fill="rgba(12, 19, 34, 0.85)"
            stroke={current.primary}
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* Hologram Face Grid */}
          {/* Left Eye */}
          <motion.circle
            cx="75"
            cy="85"
            r="8"
            fill={current.primary}
            animate={{
              scaleY: status === 'thinking' ? [1, 0.1, 1] : [1, 1, 0.1, 1],
            }}
            transition={{ duration: status === 'thinking' ? 0.8 : 4, repeat: Infinity }}
          />

          {/* Right Eye */}
          <motion.circle
            cx="125"
            cy="85"
            r="8"
            fill={current.primary}
            animate={{
              scaleY: status === 'thinking' ? [1, 0.1, 1] : [1, 1, 0.1, 1],
            }}
            transition={{ duration: status === 'thinking' ? 0.8 : 4, repeat: Infinity }}
          />

          {/* Sci-Fi Brow Accents */}
          <line x1="65" y1="70" x2="88" y2="70" stroke={current.primary} strokeWidth="2" />
          <line x1="112" y1="70" x2="135" y2="70" stroke={current.primary} strokeWidth="2" />

          {/* Reactive Mouth Waveform */}
          {status === 'speaking' ? (
            <motion.path
              d="M 65 130 Q 100 155 135 130"
              fill="none"
              stroke={current.primary}
              strokeWidth="4"
              strokeLinecap="round"
              animate={{
                d: [
                  "M 65 130 Q 100 120 135 130",
                  "M 65 130 Q 100 160 135 130",
                  "M 65 130 Q 100 135 135 130",
                ],
              }}
              transition={{ duration: 0.25, repeat: Infinity }}
            />
          ) : status === 'listening' ? (
            <motion.path
              d="M 70 130 Q 100 130 130 130"
              fill="none"
              stroke={current.primary}
              strokeWidth="3"
              strokeLinecap="round"
              animate={{ strokeWidth: [2, 5, 2] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ) : (
            <path
              d="M 75 130 Q 100 138 125 130"
              fill="none"
              stroke={current.primary}
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Cybernetic HUD Crosshairs */}
          <line x1="100" y1="35" x2="100" y2="45" stroke={current.primary} strokeWidth="1" />
          <line x1="100" y1="155" x2="100" y2="165" stroke={current.primary} strokeWidth="1" />
          <line x1="45" y1="100" x2="55" y2="100" stroke={current.primary} strokeWidth="1" />
          <line x1="145" y1="100" x2="155" y2="100" stroke={current.primary} strokeWidth="1" />
        </motion.svg>
      </div>

      {/* Holographic Status Indicator */}
      <div className="mt-4 flex items-center space-x-2">
        <span
          className="w-2 h-2 rounded-full animate-ping"
          style={{ backgroundColor: current.primary }}
        />
        <span
          className="font-mono text-xs tracking-widest uppercase font-semibold"
          style={{ color: current.primary }}
        >
          {current.label}
        </span>
      </div>
    </div>
  );
}
