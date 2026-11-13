'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EchoError } from '@/types/echo';
import { InventoryService } from '@/lib/inventory/service';
import { INVENTORY_CHANGED_EVENT } from '@/hooks/useInventory';
import {
  similarItem,
  categoryLabel,
  specFor,
  waterSafetyFor,
  type LiveAddEvent,
  type LiveDetection,
} from '@/lib/inventory/live';
import { generateId } from '@/lib/utils';

export type { LiveAddEvent } from '@/lib/inventory/live';

export interface UseLiveScan {
  /** Human-readable status for the scanner: lock-on, countdown, "remove item" hints. */
  hint: string;
  /** Seconds left in the post-add countdown (0 when ready). */
  cooldown: number;
  running: boolean;
  analyzing: boolean;
  inView: string[];
  added: LiveAddEvent[];
  sealedConfirmed: boolean;
  setSealedConfirmed(v: boolean): void;
  error: EchoError | null;
  start(): void;
  stop(): void;
}

const FRAME_INTERVAL_MS = 1500;
const MIN_CONFIDENCE = 0.6;
/** Consecutive frames an item must be seen before it's added ("lock on"). */
const LOCK_FRAMES = 2;
/** Countdown after each add; nothing else is added meanwhile. */
const COOLDOWN_MS = 10000;

/**
 * Live camera scanning, one item at a time:
 *  1. lock on: the same item must appear in 2 consecutive frames,
 *  2. add it once, then a 10 s countdown,
 *  3. a SIMILAR item is only added again after the frame was empty (it moved away);
 *     a DIFFERENT item is added after the countdown.
 */
export function useLiveScan(opts: {
  grabFrame: () => string | null;
  onAdded?: (e: LiveAddEvent) => void;
  /** Something is held up but the AI can't tell what it is → ask the survivor. */
  onUnknown?: () => void;
}): UseLiveScan {
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [inView, setInView] = useState<string[]>([]);
  const [added, setAdded] = useState<LiveAddEvent[]>([]);
  const [sealedConfirmed, setSealedConfirmedState] = useState(false);
  const [error, setError] = useState<EchoError | null>(null);
  const [hint, setHint] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownUntil = useRef(0);
  const lastAddedName = useRef<string | null>(null);
  const clearedSinceAdd = useRef(true);
  const candidate = useRef<{ name: string; count: number } | null>(null);
  const unknownFrames = useRef(0);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const sealedRef = useRef(false);
  const runningRef = useRef(false);
  const inFlight = useRef(false);
  const sessionRef = useRef('');
  const seqRef = useRef(0);

  const setSealedConfirmed = useCallback((v: boolean) => {
    sealedRef.current = v;
    setSealedConfirmedState(v);
  }, []);

  const analyze = useCallback(async () => {
    if (!runningRef.current || inFlight.current) return;
    const frame = optsRef.current.grabFrame();
    if (!frame) return;
    inFlight.current = true;
    setAnalyzing(true);
    const session = sessionRef.current;
    try {
      const res = await fetch('/api/vision/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frame }),
      });
      const data = await res.json().catch(() => ({}));
      if (!runningRef.current || session !== sessionRef.current) return; // stopped meanwhile
      if (!res.ok || !data.success) {
        setError({ code: data.errorCode ?? 'provider_error', message: data.error ?? 'Live scan failed. Retrying…' });
        return;
      }
      setError(null);

      const detections = (data.items as LiveDetection[])
        .filter((d) => d.confidence >= MIN_CONFIDENCE)
        // Low-confidence water → ask instead of guessing.
        .map((d) => (d.kind === 'water_bottle' && d.confidence < 0.85 ? { ...d, kind: 'unknown_item' as const } : d));
      const seen = new Map<string, LiveDetection>();
      for (const d of detections) seen.set(specFor(d).key, d);
      setInView([...seen.values()].map((d) => specFor(d).name));

      const known = detections.filter((d) => d.kind !== 'unknown_item');

      // Nothing recognisable in view → the previous item has moved away.
      if (known.length === 0) {
        clearedSinceAdd.current = true;
        candidate.current = null;
        if (detections.some((d) => d.kind === 'unknown_item')) {
          if (++unknownFrames.current >= LOCK_FRAMES && Date.now() >= cooldownUntil.current) {
            unknownFrames.current = 0;
            optsRef.current.onUnknown?.();
          }
        } else {
          unknownFrames.current = 0;
        }
        if (Date.now() >= cooldownUntil.current) setHint('');
        return;
      }
      unknownFrames.current = 0;

      if (Date.now() < cooldownUntil.current) return; // countdown running

      // One item at a time: the most confident one.
      const d = known.reduce((a, b) => (b.confidence > a.confidence ? b : a));
      const spec = specFor(d);

      if (lastAddedName.current && similarItem(spec.name, lastAddedName.current) && !clearedSinceAdd.current) {
        setHint(`Remove the ${lastAddedName.current.toLowerCase()} to scan the next item`);
        return;
      }

      if (candidate.current && similarItem(candidate.current.name, spec.name)) candidate.current.count++;
      else candidate.current = { name: spec.name, count: 1 };

      if (candidate.current.count < LOCK_FRAMES) {
        setHint(`Locking on: ${spec.name}… hold still`);
        return;
      }
      candidate.current = null;

      const waterSafety = spec.category === 'water' ? waterSafetyFor(d.waterAppearance, sealedRef.current) : undefined;
      const r = InventoryService.applyActionSafe({
        type: 'inventory_update',
        operation: 'add',
        proposalId: `live_${session}_${++seqRef.current}`, // idempotent write
        item: {
          name: spec.name,
          category: spec.category,
          quantity: 1,
          unit: spec.unit,
          source: 'vision_scan',
          ...(waterSafety ? { waterSafety } : {}),
          // Assumed from the size chart; treated as full so it counts toward litres.
          ...(spec.unitVolumeMl ? { unitVolumeMl: spec.unitVolumeMl, fillLevel: 'full' as const } : {}),
        },
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      lastAddedName.current = spec.name;
      clearedSinceAdd.current = false;
      cooldownUntil.current = Date.now() + COOLDOWN_MS;
      window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
      const evt: LiveAddEvent = {
        id: generateId('live'),
        name: spec.name,
        category: spec.category,
        categoryLabel: categoryLabel(spec.category),
        unitVolumeMl: spec.unitVolumeMl,
        waterSafety,
        at: Date.now(),
      };
      setAdded((a) => [...a, evt]);
      optsRef.current.onAdded?.(evt); // only after a successful save
    } catch {
      if (runningRef.current) setError({ code: 'connection_failed', message: 'Network hiccup — retrying…' });
    } finally {
      inFlight.current = false;
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000));
      setCooldown(left);
      if (left > 0) setHint(`Added ✓  Next scan in ${left}…`);
    }, 250);
    return () => clearInterval(tick);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const first = setTimeout(analyze, 400); // let the camera warm up
    const iv = setInterval(analyze, FRAME_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [running, analyze]);

  const start = useCallback(() => {
    if (runningRef.current) return;
    sessionRef.current = generateId('ls');
    cooldownUntil.current = 0;
    lastAddedName.current = null;
    clearedSinceAdd.current = true;
    candidate.current = null;
    unknownFrames.current = 0;
    setHint('');
    setCooldown(0);
    setAdded([]);
    setInView([]);
    setError(null);
    runningRef.current = true;
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    setAnalyzing(false);
    setInView([]);
  }, []);

  useEffect(() => () => {
    runningRef.current = false;
  }, []);

  return { hint, cooldown, running, analyzing, inView, added, sealedConfirmed, setSealedConfirmed, error, start, stop };
}
