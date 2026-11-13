'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EchoError } from '@/types/echo';
import { InventoryService } from '@/lib/inventory/service';
import { INVENTORY_CHANGED_EVENT } from '@/hooks/useInventory';
import {
  categoryLabel,
  specFor,
  waterSafetyFor,
  type LiveAddEvent,
  type LiveDetection,
} from '@/lib/inventory/live';
import { generateId } from '@/lib/utils';

export type { LiveAddEvent } from '@/lib/inventory/live';

export interface UseLiveScan {
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
/** Frames an item must be missing before it can be counted again (so holding it up adds it once). */
const FRAMES_TO_FORGET = 2;

/**
 * Live camera scanning: analyses a frame every ~1.5 s and adds each recognised item ONCE per
 * appearance. Holding an item in view never re-adds it; take it out of frame and show another
 * one to add another.
 */
export function useLiveScan(opts: { grabFrame: () => string | null; onAdded?: (e: LiveAddEvent) => void }): UseLiveScan {
  const [running, setRunning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [inView, setInView] = useState<string[]>([]);
  const [added, setAdded] = useState<LiveAddEvent[]>([]);
  const [sealedConfirmed, setSealedConfirmedState] = useState(false);
  const [error, setError] = useState<EchoError | null>(null);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const sealedRef = useRef(false);
  const runningRef = useRef(false);
  const inFlight = useRef(false);
  const sessionRef = useRef('');
  const seqRef = useRef(0);
  /** dedupe key → consecutive frames missing */
  const present = useRef(new Map<string, number>());

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

      const detections = (data.items as LiveDetection[]).filter((d) => d.confidence >= MIN_CONFIDENCE);
      const seen = new Map<string, LiveDetection>();
      for (const d of detections) seen.set(specFor(d).key, d);
      setInView([...seen.values()].map((d) => specFor(d).name));

      // Forget items that left the frame.
      for (const [key, misses] of present.current) {
        if (seen.has(key)) present.current.set(key, 0);
        else if (misses + 1 >= FRAMES_TO_FORGET) present.current.delete(key);
        else present.current.set(key, misses + 1);
      }

      // Add newly appeared items exactly once.
      for (const [key, d] of seen) {
        if (present.current.has(key)) continue;
        present.current.set(key, 0);
        const spec = specFor(d);
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
          },
        });
        if (!r.ok) {
          present.current.delete(key); // allow retry on the next frame
          setError(r.error);
          continue;
        }
        window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
        const evt: LiveAddEvent = { id: generateId('live'), name: spec.name, categoryLabel: categoryLabel(spec.category), waterSafety, at: Date.now() };
        setAdded((a) => [...a, evt]);
        optsRef.current.onAdded?.(evt); // only after a successful save
      }
    } catch {
      if (runningRef.current) setError({ code: 'connection_failed', message: 'Network hiccup — retrying…' });
    } finally {
      inFlight.current = false;
      setAnalyzing(false);
    }
  }, []);

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
    present.current.clear();
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

  return { running, analyzing, inView, added, sealedConfirmed, setSealedConfirmed, error, start, stop };
}
