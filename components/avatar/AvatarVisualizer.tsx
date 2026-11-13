'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AvatarStatus } from '@/types/echo';
import { HoloParticles } from './HoloParticles';
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
        {/* Humanoid Hologram SVG (Head, Eyes, Nose, Reactive Jaw & Lips) */}
        {/* ===================================================================== */}
        <motion.svg
          viewBox="0 0 400 400"
          className="w-64 h-64 sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] lg:w-[470px] lg:h-[470px] z-10 drop-shadow-[0_0_24px_rgba(0,229,255,0.5)]"
          animate={{
            y: isThinking ? [0, -6, 0] : [0, -3, 0],
          }}
          transition={{
            duration: isThinking ? 1.5 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Hologram Scanlines Overlay Filter */}
          <defs>
            <linearGradient id="holoBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.primary} stopOpacity="0.8" />
              <stop offset="85%" stopColor={theme.primary} stopOpacity="0.25" />
              <stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="faceShade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(12, 19, 34, 0.92)" />
              <stop offset="100%" stopColor="rgba(8, 14, 26, 0.96)" />
            </linearGradient>

            <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor={theme.primary} />
              <stop offset="100%" stopColor={theme.secondary} />
            </radialGradient>
          </defs>

          {/* 1. Hologram Projection Cones (Lower Neck Matrix) */}
          <g opacity="0.6">
            <line x1="160" y1="340" x2="140" y2="390" stroke={theme.primary} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="200" y1="345" x2="200" y2="395" stroke={theme.primary} strokeWidth="1.5" strokeDasharray="4 2" />
            <line x1="240" y1="340" x2="260" y2="390" stroke={theme.primary} strokeWidth="1.5" strokeDasharray="4 2" />
            <ellipse cx="200" cy="385" rx="80" ry="12" fill="none" stroke={theme.primary} strokeWidth="1.5" opacity="0.4" />
          </g>

          {/* 2. Cybernetic Humanoid Head Silhouette & Contour */}
          {/* Outer Holographic Halo / Cranial Lattice */}
          <path
            d="M 125 150 C 120 70, 280 70, 275 150 C 275 220, 265 295, 200 335 C 135 295, 125 220, 125 150 Z"
            fill="url(#faceShade)"
            stroke={theme.primary}
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Stylized Humanoid Cheekbone & Jaw Contour Inlays */}
          <path
            d="M 140 160 C 145 225, 160 275, 200 305 C 240 275, 255 225, 260 160"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.2"
            opacity="0.45"
          />

          {/* Cranial Energy Arcs (Forehead / Temple Neural Traces) */}
          <path
            d="M 155 110 C 170 95, 230 95, 245 110"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.5"
            strokeDasharray="6 3"
            opacity="0.6"
          />
          <path
            d="M 165 85 C 180 78, 220 78, 235 85"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.2"
            opacity="0.4"
          />

          {/* Left Audio Receptor (Temple Node) */}
          <g>
            <circle cx="118" cy="180" r="7" fill="none" stroke={theme.primary} strokeWidth="1.5" />
            <circle cx="118" cy="180" r="3" fill={theme.primary} />
            {isListening && (
              <motion.circle
                cx="118"
                cy="180"
                r="14"
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.5"
                animate={{ r: [7, 20], opacity: [0.9, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </g>

          {/* Right Audio Receptor (Temple Node) */}
          <g>
            <circle cx="282" cy="180" r="7" fill="none" stroke={theme.primary} strokeWidth="1.5" />
            <circle cx="282" cy="180" r="3" fill={theme.primary} />
            {isListening && (
              <motion.circle
                cx="282"
                cy="180"
                r="14"
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.5"
                animate={{ r: [7, 20], opacity: [0.9, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </g>

          {/* 3. Expressive Humanoid Eyebrows */}
          {/* Left Eyebrow */}
          <motion.path
            d={
              isThinking
                ? "M 150 148 Q 170 144 186 150" // concentrated angle
                : isListening
                ? "M 150 140 Q 170 134 186 142" // alert raised arch
                : "M 150 144 Q 170 138 186 145" // calm natural arch
            }
            fill="none"
            stroke={theme.primary}
            strokeWidth="2.8"
            strokeLinecap="round"
            animate={{
              d: isThinking
                ? "M 150 148 Q 170 144 186 150"
                : isListening
                ? "M 150 140 Q 170 134 186 142"
                : "M 150 144 Q 170 138 186 145",
            }}
            transition={{ duration: 0.3 }}
          />

          {/* Right Eyebrow */}
          <motion.path
            d={
              isThinking
                ? "M 214 150 Q 230 144 250 148"
                : isListening
                ? "M 214 142 Q 230 134 250 140"
                : "M 214 145 Q 230 138 250 144"
            }
            fill="none"
            stroke={theme.primary}
            strokeWidth="2.8"
            strokeLinecap="round"
            animate={{
              d: isThinking
                ? "M 214 150 Q 230 144 250 148"
                : isListening
                ? "M 214 142 Q 230 134 250 140"
                : "M 214 145 Q 230 138 250 144",
            }}
            transition={{ duration: 0.3 }}
          />

          {/* 4. Expressive Cybernetic Humanoid Eyes */}
          {/* Left Eye Group */}
          <g>
            {/* Eye Outer Contour */}
            <path
              d="M 148 165 C 158 152, 178 152, 188 165 C 178 178, 158 178, 148 165 Z"
              fill="rgba(5, 10, 20, 0.85)"
              stroke={theme.primary}
              strokeWidth="1.8"
            />
            {/* Ocular Iris with Micro-Blink scaleY */}
            <motion.g
              animate={{
                scaleY: isThinking ? [1, 0.15, 1] : [1, 1, 0.08, 1],
              }}
              transition={{
                duration: isThinking ? 1.1 : 4.5,
                repeat: Infinity,
                times: isThinking ? [0, 0.5, 1] : [0, 0.88, 0.94, 1],
              }}
              style={{ transformOrigin: '168px 165px' }}
            >
              <circle cx="168" cy="165" r="7.5" fill="url(#irisGrad)" />
              <circle cx="168" cy="165" r="3" fill="#ffffff" />
              <circle cx="166" cy="163" r="1.5" fill="#ffffff" opacity="0.95" />
            </motion.g>
          </g>

          {/* Right Eye Group */}
          <g>
            {/* Eye Outer Contour */}
            <path
              d="M 212 165 C 222 152, 242 152, 252 165 C 242 178, 222 178, 212 165 Z"
              fill="rgba(5, 10, 20, 0.85)"
              stroke={theme.primary}
              strokeWidth="1.8"
            />
            {/* Ocular Iris with Micro-Blink scaleY */}
            <motion.g
              animate={{
                scaleY: isThinking ? [1, 0.15, 1] : [1, 1, 0.08, 1],
              }}
              transition={{
                duration: isThinking ? 1.1 : 4.5,
                repeat: Infinity,
                times: isThinking ? [0, 0.5, 1] : [0, 0.88, 0.94, 1],
              }}
              style={{ transformOrigin: '232px 165px' }}
            >
              <circle cx="232" cy="165" r="7.5" fill="url(#irisGrad)" />
              <circle cx="232" cy="165" r="3" fill="#ffffff" />
              <circle cx="230" cy="163" r="1.5" fill="#ffffff" opacity="0.95" />
            </motion.g>
          </g>

          {/* 5. Refined Humanoid Nose Contour & Bridge */}
          <path
            d="M 200 152 L 197 205 L 193 218 Q 200 223 207 218 L 203 205"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
          {/* Subtle Nostril Inlay */}
          <ellipse cx="196" cy="218" rx="2" ry="1.2" fill={theme.primary} opacity="0.6" />
          <ellipse cx="204" cy="218" rx="2" ry="1.2" fill={theme.primary} opacity="0.6" />

          {/* 6. Humanoid Mouth & Audio-Reactive Lips / Jaw */}
          {isSpeaking ? (
            <g>
              {/* Internal Vocal Resonance Glow Chamber */}
              <motion.ellipse
                cx="200"
                cy={258 + jawDrop * 0.4}
                rx={18 + effectiveAmp * 6}
                ry={4 + jawDrop * 0.7}
                fill={theme.glow}
                filter="blur(4px)"
              />

              {/* Dynamic Open Mouth Waveform Shape */}
              <motion.path
                d={`M 178 256 Q 189 ${252 - effectiveAmp * 4} 200 256 Q 211 ${252 - effectiveAmp * 4} 222 256 C 222 ${262 + jawDrop} 211 ${266 + jawDrop} 200 ${266 + jawDrop} C 189 ${266 + jawDrop} 178 ${262 + jawDrop} 178 256 Z`}
                fill="rgba(5, 12, 24, 0.95)"
                stroke={theme.primary}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />

              {/* Upper Lip Line */}
              <path
                d="M 178 256 Q 189 252 200 255 Q 211 252 222 256"
                fill="none"
                stroke={theme.accent}
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Internal Speech Frequency Bars */}
              {[-12, -6, 0, 6, 12].map((xOffset, i) => {
                const barHeight = Math.max(3, effectiveAmp * (14 + Math.sin(i * 1.8) * 8));
                return (
                  <motion.line
                    key={i}
                    x1={200 + xOffset}
                    y1={258 + jawDrop * 0.4 - barHeight / 2}
                    x2={200 + xOffset}
                    y2={258 + jawDrop * 0.4 + barHeight / 2}
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Lower Lip Line */}
              <motion.path
                d={`M 182 ${264 + jawDrop} Q 200 ${269 + jawDrop} 218 ${264 + jawDrop}`}
                fill="none"
                stroke={theme.primary}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ) : isListening ? (
            <g>
              {/* Listening Acoustic Line with gentle vibration */}
              <motion.path
                d="M 178 256 Q 189 253 200 255 Q 211 253 222 256"
                fill="none"
                stroke={theme.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{
                  d: [
                    "M 178 256 Q 189 253 200 255 Q 211 253 222 256",
                    "M 178 256 Q 189 250 200 255 Q 211 250 222 256",
                    "M 178 256 Q 189 253 200 255 Q 211 253 222 256",
                  ],
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <path
                d="M 184 262 Q 200 265 216 262"
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.8"
                opacity="0.75"
              />
            </g>
          ) : isThinking ? (
            <g>
              {/* Thinking Mouth Shape with Revolving Glyph */}
              <path
                d="M 180 256 Q 200 254 220 256"
                fill="none"
                stroke={theme.primary}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <motion.ellipse
                cx="200"
                cy="260"
                rx="8"
                ry="3"
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.5"
                strokeDasharray="3 2"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '200px 260px' }}
              />
            </g>
          ) : (
            // Idle Resting Humanoid Lips
            <g>
              {/* Upper Lip Contour */}
              <path
                d="M 178 256 Q 189 253 200 255 Q 211 253 222 256"
                fill="none"
                stroke={theme.primary}
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.9"
              />
              {/* Lower Lip Contour */}
              <path
                d="M 184 262 Q 200 266 216 262"
                fill="none"
                stroke={theme.primary}
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.75"
              />
            </g>
          )}

          {/* 7. Precision HUD Reticles & Coordinate Marks */}
          <line x1="200" y1="35" x2="200" y2="55" stroke={theme.primary} strokeWidth="1.2" opacity="0.6" />
          <line x1="200" y1="345" x2="200" y2="365" stroke={theme.primary} strokeWidth="1.2" opacity="0.6" />
          <line x1="45" y1="200" x2="65" y2="200" stroke={theme.primary} strokeWidth="1.2" opacity="0.6" />
          <line x1="335" y1="200" x2="355" y2="200" stroke={theme.primary} strokeWidth="1.2" opacity="0.6" />
        </motion.svg>
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
