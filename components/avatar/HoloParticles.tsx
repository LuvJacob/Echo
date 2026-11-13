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
    const count = status === 'thinking' ? 36 : status === 'speaking' ? 28 : 18;
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    const width = (canvas.width = 300);
    const height = (canvas.height = 300);
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 85;
      particles.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        radius: 1 + Math.random() * 2,
        vx: (Math.random() - 0.5) * (status === 'thinking' ? 1.5 : 0.6),
        vy: (Math.random() - 0.5) * (status === 'thinking' ? 1.5 : 0.6),
        alpha: 0.2 + Math.random() * 0.7,
        pulseSpeed: 0.02 + Math.random() * 0.04,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed * 0.005) * 0.02;

        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 130 || dist < 30) {
          p.vx = -p.vx;
          p.vy = -p.vy;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = Math.max(0.1, Math.min(0.9, p.alpha));
        ctx.shadowBlur = 8;
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
