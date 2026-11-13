'use client';

import React, { useEffect, useRef } from 'react';
import { AvatarStatus } from '@/types/echo';

interface HoloParticlesProps {
  status: AvatarStatus;
  primaryColor: string;
}

export function HoloParticles({ status, primaryColor }: HoloParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const count = status === 'thinking' ? 48 : status === 'speaking' ? 36 : 24;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    const size = 520;
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2 - 10;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 160;
      particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        radius: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * (status === 'thinking' ? 1.8 : 0.7),
        vy: (Math.random() - 0.5) * (status === 'thinking' ? 1.8 : 0.7),
        alpha: 0.2 + Math.random() * 0.7,
        pulseSpeed: 0.02 + Math.random() * 0.04,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed * 0.005) * 0.02;

        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 220 || dist < 40) {
          p.vx = -p.vx;
          p.vy = -p.vy;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = Math.max(0.08, Math.min(0.85, p.alpha));
        ctx.shadowBlur = 10;
        ctx.shadowColor = primaryColor;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [status, primaryColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
