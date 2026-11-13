'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AvatarStatus } from '@/types/echo';
import { HoloParticles } from './HoloParticles';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX } from 'lucide-react';

interface AvatarVisualizerProps {
  status: AvatarStatus;
  amplitude?: number; // 0 to 1 for voice reactivity
  speechEnabled?: boolean;
  onToggleSpeech?: () => void;
  onStatusChange?: (status: AvatarStatus) => void;
  className?: string;
}

export function AvatarVisualizer({
  status,
  amplitude = 0,
  speechEnabled = true,
  onToggleSpeech,
  onStatusChange,
  className,
}: AvatarVisualizerProps) {
  // Theme configuration for each avatar state
  const stateThemes = {
    idle: {
      primary: '#00e5ff', // Cyan
      secondary: '#007799',
      glow: 'rgba(0, 229, 255, 0.4)',
      bgGlow: 'rgba(0, 229, 255, 0.08)',
      tag: 'SYSTEM IDLE // STANDBY',
      subtext: 'AWAITING VOCAL / SENSOR TRIGGER',
    },
    listening: {
      primary: '#10b981', // Emerald
      secondary: '#047857',
      glow: 'rgba(16, 185, 129, 0.6)',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      tag: 'AUDIO SENSOR // LISTENING',
      subtext: 'CAPTURING SURVIVOR VOICE INPUT',
    },
    thinking: {
      primary: '#c084fc', // Purple/Violet
      secondary: '#7e22ce',
      glow: 'rgba(192, 132, 252, 0.65)',
      bgGlow: 'rgba(192, 132, 252, 0.15)',
      tag: 'NEURAL CORE // PROCESSING',
      subtext: 'QUERYING TACTICAL KNOWLEDGE BASE',
    },
    speaking: {
      primary: '#38bdf8', // Electric Sky Blue
      secondary: '#0284c7',
      glow: 'rgba(56, 189, 248, 0.85)',
      bgGlow: 'rgba(56, 189, 248, 0.2)',
      tag: 'VOCAL SYNTH // BROADCASTING',
      subtext: 'TRANSMITTING SURVIVAL GUIDANCE',
    },
    error: {
      primary: '#f43f5e', // Rose/Red
      secondary: '#be123c',
      glow: 'rgba(244, 63, 94, 0.75)',
      bgGlow: 'rgba(244, 63, 94, 0.15)',
      tag: 'CORE DIAGNOSTIC // ALERT',
      subtext: 'SUBSYSTEM ANOMALY DETECTED',
    },
  };

  const theme = stateThemes[status] || stateThemes.idle;
  const isSpeaking = status === 'speaking';
  const effectiveAmp = isSpeaking ? Math.max(0.2, amplitude) : 0;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-4 sm:p-6 select-none overflow-hidden rounded-2xl w-full',
        className
      )}
    >
      {/* Background Volumetric Glow & Holo Beam */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${theme.bgGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Floating Hologram Particle Field */}
      <HoloParticles status={status} primaryColor={theme.primary} />

      {/* Top HUD Controls: Audio Mute & State Badges */}
      <div className="w-full flex items-center justify-between z-20 mb-2">
        <div className="flex items-center space-x-1.5">
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: theme.primary }}
          />
          <span
            className="font-mono text-[10px] tracking-widest uppercase font-bold"
            style={{ color: theme.primary }}
          >
            {theme.tag}
          </span>
        </div>

        {onToggleSpeech && (
          <button
            onClick={onToggleSpeech}
            className="flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded border border-echo-border bg-echo-surface/70 text-echo-muted hover:text-white hover:border-echo-cyan transition-colors"
            title={speechEnabled ? 'Disable ECHO Voice' : 'Enable ECHO Voice'}
          >
            {speechEnabled ? (
              <>
                <Volume2 className="w-3 h-3 text-echo-cyan" />
                <span className="text-echo-cyan">VOICE ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-echo-muted" />
                <span>MUTED</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Centerpiece Holographic Projector Rig */}
      <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center my-2">
        {/* Projector Base Ring */}
        <div
          className="absolute -bottom-4 w-40 h-8 rounded-[100%] blur-md opacity-50"
          style={{ backgroundColor: theme.primary }}
        />

        {/* Outer Orbit Reticle 1 (Clockwise) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: status === 'thinking' ? 4 : status === 'speaking' ? 12 : 24,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-0 rounded-full border border-dashed pointer-events-none"
          style={{ borderColor: `${theme.primary}35` }}
        />

        {/* Orbit Reticle 2 (Counter-Clockwise with Tick Marks) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: status === 'thinking' ? 6 : 28,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-3 rounded-full border border-dotted pointer-events-none"
          style={{ borderColor: `${theme.primary}25` }}
        >
          {/* Cyberpunk Crosshair Pips */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.primary }} />
        </motion.div>

        {/* Audio Reactive Pulse Ring (Expands when speaking/listening) */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.08 + effectiveAmp * 0.15, 1] : status === 'listening' ? [1, 1.04, 1] : 1,
            opacity: isSpeaking ? [0.4, 0.85, 0.4] : 0.3,
          }}
          transition={{
            duration: isSpeaking ? 0.3 : 1.5,
            repeat: Infinity,
          }}
          className="absolute inset-5 rounded-full border pointer-events-none"
          style={{
            borderColor: theme.primary,
            boxShadow: `0 0 ${15 + effectiveAmp * 20}px ${theme.glow}`,
          }}
        />

        {/* ========================================================= */}
        {/* Holographic AI Face SVG Canvas */}
        {/* ========================================================= */}
        <motion.svg
          viewBox="0 0 200 200"
          className="w-44 h-44 sm:w-52 sm:h-52 z-10 drop-shadow-[0_0_18px_rgba(0,229,255,0.45)]"
          animate={{
            y: status === 'thinking' ? [0, -4, 0] : [0, -2, 0],
          }}
          transition={{
            duration: status === 'thinking' ? 1.2 : 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Inner Hologram Hex Shield Grid */}
          <polygon
            points="100,18 174,58 174,142 100,182 26,142 26,58"
            fill="rgba(10, 16, 28, 0.85)"
            stroke={theme.primary}
            strokeWidth="1.75"
            strokeDasharray="6 3"
          />

          {/* Futuristic Face Plate Armor Lines */}
          <path
            d="M 50 65 L 80 50 L 120 50 L 150 65"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.2"
            opacity="0.6"
          />
          <path
            d="M 40 100 L 60 100 L 70 140 L 100 160 L 130 140 L 140 100 L 160 100"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.2"
            opacity="0.4"
          />

          {/* Left Cybernetic Eye */}
          <g>
            {/* Eye Socket Housing */}
            <circle cx="72" cy="85" r="14" fill="none" stroke={theme.primary} strokeWidth="1" opacity="0.5" />
            {/* Pupil / Ocular Lens */}
            <motion.circle
              cx="72"
              cy="85"
              r={status === 'thinking' ? 6 : 7}
              fill={theme.primary}
              animate={{
                scaleY: status === 'thinking' ? [1, 0.2, 1] : [1, 1, 0.1, 1],
                scaleX: isSpeaking ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: status === 'thinking' ? 0.9 : 4.5,
                repeat: Infinity,
                times: status === 'thinking' ? [0, 0.5, 1] : [0, 0.88, 0.94, 1],
              }}
            />
            {/* Optical Highlight */}
            <circle cx="70" cy="82" r="2.5" fill="#ffffff" opacity="0.9" />
          </g>

          {/* Right Cybernetic Eye */}
          <g>
            {/* Eye Socket Housing */}
            <circle cx="128" cy="85" r="14" fill="none" stroke={theme.primary} strokeWidth="1" opacity="0.5" />
            {/* Pupil / Ocular Lens */}
            <motion.circle
              cx="128"
              cy="85"
              r={status === 'thinking' ? 6 : 7}
              fill={theme.primary}
              animate={{
                scaleY: status === 'thinking' ? [1, 0.2, 1] : [1, 1, 0.1, 1],
                scaleX: isSpeaking ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: status === 'thinking' ? 0.9 : 4.5,
                repeat: Infinity,
                times: status === 'thinking' ? [0, 0.5, 1] : [0, 0.88, 0.94, 1],
              }}
            />
            {/* Optical Highlight */}
            <circle cx="126" cy="82" r="2.5" fill="#ffffff" opacity="0.9" />
          </g>

          {/* Sci-Fi Brow Optics (Angular telemetry plates) */}
          <motion.line
            x1="60"
            y1={status === 'error' ? '73' : '68'}
            x2="84"
            y2={status === 'error' ? '68' : '68'}
            stroke={theme.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <motion.line
            x1="116"
            y1={status === 'error' ? '68' : '68'}
            x2="140"
            y2={status === 'error' ? '73' : '68'}
            stroke={theme.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Nose Bridge Coordinate Glyph */}
          <line x1="100" y1="78" x2="100" y2="105" stroke={theme.primary} strokeWidth="1.2" opacity="0.5" />
          <circle cx="100" cy="92" r="1.5" fill={theme.primary} />

          {/* ========================================================= */}
          {/* Dynamic Audio-Reactive Mouth & Vocal Waveform */}
          {/* ========================================================= */}
          {isSpeaking ? (
            <g>
              {/* Central Dynamic Waveform Mouth */}
              <motion.path
                d={`M 64 132 Q 100 ${140 + effectiveAmp * 24} 136 132 Q 100 ${126 - effectiveAmp * 12} 64 132`}
                fill={`${theme.primary}30`}
                stroke={theme.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{
                  d: [
                    `M 64 132 Q 100 ${136 + effectiveAmp * 18} 136 132 Q 100 ${128 - effectiveAmp * 8} 64 132`,
                    `M 64 132 Q 100 ${144 + effectiveAmp * 28} 136 132 Q 100 ${124 - effectiveAmp * 14} 64 132`,
                    `M 64 132 Q 100 ${138 + effectiveAmp * 20} 136 132 Q 100 ${127 - effectiveAmp * 10} 64 132`,
                  ],
                }}
                transition={{ duration: 0.18, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Internal Voice Frequency Spectrum Equalizer Bars */}
              {[-24, -16, -8, 0, 8, 16, 24].map((offset, i) => {
                const barHeight = 4 + effectiveAmp * (14 + Math.sin(i * 1.5) * 8);
                return (
                  <motion.line
                    key={i}
                    x1={100 + offset}
                    y1={132 - barHeight / 2}
                    x2={100 + offset}
                    y2={132 + barHeight / 2}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                );
              })}
            </g>
          ) : status === 'listening' ? (
            <g>
              {/* Listening Dynamic Soundwave Bar */}
              <motion.path
                d="M 68 132 Q 100 132 132 132"
                fill="none"
                stroke={theme.primary}
                strokeWidth="3.5"
                strokeLinecap="round"
                animate={{
                  strokeWidth: [2, 5, 2],
                  d: [
                    "M 68 132 Q 100 126 132 132",
                    "M 68 132 Q 100 138 132 132",
                    "M 68 132 Q 100 126 132 132",
                  ],
                }}
                transition={{ duration: 0.6, repeat: Infinity }}
              />
            </g>
          ) : status === 'thinking' ? (
            <g>
              {/* Calculating Neural Ring Mouth */}
              <motion.ellipse
                cx="100"
                cy="132"
                rx="14"
                ry="4"
                fill="none"
                stroke={theme.primary}
                strokeWidth="2"
                strokeDasharray="4 2"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </g>
          ) : (
            // Idle Resting Mouth
            <path
              d="M 72 132 Q 100 138 128 132"
              fill="none"
              stroke={theme.primary}
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.85"
            />
          )}

          {/* HUD Crosshairs and Precision Coordinates */}
          <line x1="100" y1="30" x2="100" y2="42" stroke={theme.primary} strokeWidth="1" opacity="0.6" />
          <line x1="100" y1="158" x2="100" y2="170" stroke={theme.primary} strokeWidth="1" opacity="0.6" />
          <line x1="38" y1="100" x2="50" y2="100" stroke={theme.primary} strokeWidth="1" opacity="0.6" />
          <line x1="150" y1="100" x2="162" y2="100" stroke={theme.primary} strokeWidth="1" opacity="0.6" />
        </motion.svg>
      </div>

      {/* Subtext Status Caption */}
      <div className="text-center mt-1 z-10">
        <p className="text-[11px] font-mono font-medium text-echo-muted tracking-wider">
          {theme.subtext}
        </p>
      </div>
    </div>
  );
}
