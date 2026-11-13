import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge Tailwind classes safely with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp to military / sci-fi HUD display time (HH:MM:SS)
 */
export function formatHudTime(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  return date.toTimeString().split(' ')[0];
}

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix: string = 'echo'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}
