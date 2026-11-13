import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'cyan' | 'amber' | 'emerald' | 'none';
}

export function Card({ className, glow = 'none', children, ...props }: CardProps) {
  const glowStyles = {
    cyan: 'border-echo-cyan/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]',
    amber: 'border-echo-amber/40 shadow-[0_0_15px_rgba(255,179,0,0.15)]',
    emerald: 'border-echo-emerald/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    none: 'border-echo-border',
  };

  return (
    <div
      className={cn(
        'relative bg-echo-surface/80 backdrop-blur-md border rounded-xl p-4 transition-all duration-200',
        glowStyles[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-mono font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-95';
  
  const variants = {
    primary: 'bg-echo-cyan text-echo-bg hover:bg-echo-cyan/90 shadow-[0_0_12px_rgba(0,229,255,0.35)]',
    secondary: 'bg-echo-surface border border-echo-border text-echo-text hover:border-echo-cyan/60 hover:text-echo-cyan',
    danger: 'bg-echo-rose text-white hover:bg-echo-rose/90 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
    ghost: 'text-echo-muted hover:text-echo-text hover:bg-echo-surface/50',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  className,
  variant = 'cyan',
  children,
}: {
  className?: string;
  variant?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'muted';
  children: React.ReactNode;
}) {
  const variants = {
    cyan: 'bg-echo-cyan/15 text-echo-cyan border-echo-cyan/30',
    amber: 'bg-echo-amber/15 text-echo-amber border-echo-amber/30',
    emerald: 'bg-echo-emerald/15 text-echo-emerald border-echo-emerald/30',
    rose: 'bg-echo-rose/15 text-echo-rose border-echo-rose/30',
    muted: 'bg-echo-border/50 text-echo-muted border-echo-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
