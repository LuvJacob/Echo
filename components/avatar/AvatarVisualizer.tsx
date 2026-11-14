'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AvatarStatus } from '@/types/echo';
import { HoloParticles } from './HoloParticles';
import { ThreeHoloAvatar } from './ThreeHoloAvatar';
import { cn } from '@/lib/utils';
import { Volume2, VolumeX, Sparkles, Activity } from 'lucide-react';

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
      secondary: '#0284c7',
      accent: '#38bdf8',
      glow: 'rgba(0, 229, 255, 0.45)',
      bgGlow: 'rgba(0, 229, 255, 0.12)',
      tag: 'SYSTEM IDLE // STANDBY',
      subtext: 'AWAITING VOCAL / SENSOR TRIGGER',
    },
    listening: {
      primary: '#10b981', // Emerald
      secondary: '#047857',
      accent: '#34d399',
      glow: 'rgba(16, 185, 129, 0.65)',
      bgGlow: 'rgba(16, 185, 129, 0.18)',
      tag: 'AUDIO SENSOR // LISTENING',
      subtext: 'CAPTURING SURVIVOR AUDIO STREAM',
    },
    thinking: {
      primary: '#c084fc', // Purple/Violet
      secondary: '#7e22ce',
      accent: '#e879f9',
      glow: 'rgba(192, 132, 252, 0.7)',
      bgGlow: 'rgba(192, 132, 252, 0.2)',
      tag: 'NEURAL CORE // PROCESSING',
      subtext: 'QUERYING TACTICAL MATRIX',
    },
    speaking: {
      primary: '#38bdf8', // Electric Sky Blue
      secondary: '#0284c7',
      accent: '#7dd3fc',
      glow: 'rgba(56, 189, 248, 0.9)',
      bgGlow: 'rgba(56, 189, 248, 0.25)',
      tag: 'VOCAL SYNTH // BROADCASTING',
      subtext: 'TRANSMITTING SURVIVAL GUIDANCE',
    },
    error: {
      primary: '#f43f5e', // Rose/Red
      secondary: '#be123c',
      accent: '#fb7185',
      glow: 'rgba(244, 63, 94, 0.8)',
      bgGlow: 'rgba(244, 63, 94, 0.2)',
      tag: 'CORE DIAGNOSTIC // ALERT',
      subtext: 'SUBSYSTEM ANOMALY DETECTED',
    },
  };

  const theme = stateThemes[status] || stateThemes.idle;
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';
  const isThinking = status === 'thinking';
  const effectiveAmp = isSpeaking ? Math.max(0.15, Math.min(1, amplitude)) : 0;

  // Mouth vertical opening calculation (in SVG coordinates)
  const jawDrop = effectiveAmp * 20;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden rounded-3xl w-full',
        className
      )}
    >
      {/* Background Volumetric Glow & Hologram Field */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none rounded-3xl"
        style={{
          background: `radial-gradient(circle at 50% 48%, ${theme.bgGlow} 0%, rgba(7, 11, 18, 0.6) 60%, transparent 80%)`,
        }}
      />

      {/* Floating Hologram Particle Field */}
      <HoloParticles status={status} primaryColor={theme.primary} />

      {/* Top HUD Controls: Audio Mute & State Badges */}
      <div className="w-full flex items-center justify-between z-20 px-2 sm:px-4 mb-1">
        <div className="flex items-center space-x-2">
          <span
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: theme.primary }}
          />
          <span
            className="font-mono text-xs sm:text-sm tracking-widest uppercase font-bold"
            style={{ color: theme.primary }}
          >
            {theme.tag}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleSpeech && (
            <button
              onClick={onToggleSpeech}
              className="flex items-center space-x-1.5 text-xs font-mono px-3 py-1 rounded-lg border border-echo-border bg-echo-surface/80 text-echo-muted hover:text-white hover:border-echo-cyan transition-colors backdrop-blur-md"
              title={speechEnabled ? 'Disable ECHO Voice' : 'Enable ECHO Voice'}
            >
              {speechEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-echo-cyan" />
                  <span className="text-echo-cyan font-semibold">VOICE ACTIVE</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-echo-muted" />
                  <span>MUTED</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Humanoid Hologram Centerpiece Rig (420px - 550px on desktop) */}
      {/* ========================================================================= */}
      <div className="relative w-72 h-72 sm:w-[440px] sm:h-[440px] md:w-[480px] md:h-[480px] lg:w-[520px] lg:h-[520px] flex items-center justify-center my-2">
        {/* Hologram Projector Base Emitter (Floor Grid & Volumetric Glow) */}
        <div
          className="absolute -bottom-6 sm:-bottom-8 w-64 sm:w-80 h-10 sm:h-12 rounded-[100%] blur-xl opacity-60"
          style={{ backgroundColor: theme.primary }}
        />

        {/* Ambient Pulsing Aura Behind Face */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.06 + effectiveAmp * 0.12, 1] : [1, 1.03, 1],
            opacity: isSpeaking ? [0.5, 0.85, 0.5] : [0.35, 0.55, 0.35],
          }}
          transition={{
            duration: isSpeaking ? 0.25 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-8 sm:inset-12 rounded-full blur-2xl pointer-events-none"
          style={{ backgroundColor: theme.primary }}
        />

        {/* Outer Orbital Gimbal Ring 1 (Degree Ticks + Rotation) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: isThinking ? 8 : isSpeaking ? 24 : 45,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-1 sm:inset-2 rounded-full border border-dashed pointer-events-none"
          style={{ borderColor: `${theme.primary}35` }}
        />

        {/* Outer Precision Ticks Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{
            duration: isThinking ? 12 : 60,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-4 sm:inset-6 rounded-full border border-dotted pointer-events-none"
          style={{ borderColor: `${theme.primary}25` }}
        >
          {/* Cardinal Orientation Pips */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
        </motion.div>

        {/* Middle Reactive Audio Wave Ring */}
        <motion.div
          animate={{
            scale: isSpeaking ? [1, 1.05 + effectiveAmp * 0.14, 1] : isListening ? [1, 1.04, 1] : 1,
            opacity: isSpeaking ? [0.4, 0.9, 0.4] : 0.35,
          }}
          transition={{
            duration: isSpeaking ? 0.2 : 1.8,
            repeat: Infinity,
          }}
          className="absolute inset-8 sm:inset-12 rounded-full border pointer-events-none"
          style={{
            borderColor: theme.primary,
            boxShadow: `0 0 ${16 + effectiveAmp * 24}px ${theme.glow}`,
          }}
        />

        {/* ===================================================================== */}
        {/* Genuine 3D Humanoid Holographic Avatar (Three.js WebGL Engine)        */}
        {/* ===================================================================== */}
        <div className="relative w-64 h-64 sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] lg:w-[470px] lg:h-[470px] z-10 flex items-center justify-center">
          <ThreeHoloAvatar
            status={status}
            amplitude={amplitude}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Subtext Status Caption */}
      <div className="text-center z-10 mt-0.5">
        <p className="text-xs sm:text-sm font-mono font-medium text-echo-muted tracking-wider">
          {theme.subtext}
        </p>
      </div>
    </div>
  );
}
