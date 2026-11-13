'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EchoError,
  EchoResult,
  FillLevel,
  InventoryProposal,
  InventoryReceipt,
  ProposedItem,
  VisionApiResponse,
} from '@/types/echo';
import { InventoryService } from '@/lib/inventory/service';

export type ScanStatus = 'idle' | 'scanning' | 'review' | 'saving' | 'saved' | 'error';

export interface UseSupplyScan {
  status: ScanStatus;
  proposal: InventoryProposal | null;
  previewUrl: string | null;
  receipt: InventoryReceipt | null;
  error: EchoError | null;
  mock: boolean;
  scanPhoto(input: File | Blob | string): Promise<void>;
  updateItem(
    index: number,
    patch: Partial<Pick<ProposedItem, 'name' | 'category' | 'quantity' | 'unit' | 'unitVolumeMl' | 'fillLevel' | 'location'>>
  ): void;
  removeItem(index: number): void;
  confirm(): Promise<EchoResult<InventoryReceipt>>;
  reject(): void;
  reset(): void;
}

export interface UseSupplyScanOptions {
  onConfirmed?: (r: InventoryReceipt, p: InventoryProposal) => void;
  onRejected?: (p: InventoryProposal) => void;
  confirmProposal?: (p: InventoryProposal) => EchoResult<InventoryReceipt>;
}

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.82;
const FILL_LEVELS: readonly string[] = ['full', 'three_quarters', 'half', 'quarter', 'empty'];

function fail(code: EchoError['code'], message: string): { ok: false; error: EchoError } {
  return { ok: false, error: { code, message } };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(blob);
  });
}

/** Downscale to max 1280px and re-encode as JPEG so the payload stays small. */
async function downscale(input: File | Blob | string): Promise<string> {
  const src = typeof input === 'string' ? input : await blobToDataUrl(input);
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is unavailable in this browser.');
  ctx.fillStyle = '#fff'; // flatten transparency for JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

function validateProposal(p: unknown): p is InventoryProposal {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return false;
  if (!Array.isArray(o.items)) return false;
  return o.items.every((it) => {
    if (!it || typeof it !== 'object') return false;
    const i = it as Record<string, unknown>;
    return (
      typeof i.name === 'string' &&
      typeof i.quantity === 'number' &&
      Number.isInteger(i.quantity) &&
      i.quantity > 0 &&
      (i.unitVolumeMl === null || typeof i.unitVolumeMl === 'number') &&
      (i.fillLevel === null || (typeof i.fillLevel === 'string' && FILL_LEVELS.includes(i.fillLevel))) &&
      (i.location === null || typeof i.location === 'string') &&
      i.drinkability === 'undetermined'
    );
  });
}

export function useSupplyScan(opts: UseSupplyScanOptions = {}): UseSupplyScan {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [proposal, setProposal] = useState<InventoryProposal | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<InventoryReceipt | null>(null);
  const [error, setError] = useState<EchoError | null>(null);
  const [mock, setMock] = useState(false);

  const requestId = useRef(0);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  // Live mirrors so confirm() is idempotent even when called twice in one tick.
  const statusRef = useRef<ScanStatus>('idle');
  const proposalRef = useRef<InventoryProposal | null>(null);
  const receiptRef = useRef<InventoryReceipt | null>(null);

  const setStatusBoth = (s: ScanStatus) => {
    statusRef.current = s;
    setStatus(s);
  };
  const setProposalBoth = (p: InventoryProposal | null) => {
    proposalRef.current = p;
    setProposal(p);
  };
  const setReceiptBoth = (r: InventoryReceipt | null) => {
    receiptRef.current = r;
    setReceipt(r);
  };

  const failScan = (e: EchoError) => {
    setError(e);
    setStatusBoth('error');
  };

  const scanPhoto = useCallback(async (input: File | Blob | string) => {
    const id = ++requestId.current;
    setError(null);
    setReceiptBoth(null);
    setProposalBoth(null);
    setMock(false);
    setStatusBoth('scanning');

    let image: string;
    try {
      image = await downscale(input);
    } catch (e) {
      if (id !== requestId.current) return;
      failScan({ code: 'invalid_request', message: e instanceof Error ? e.message : 'Could not read that image.' });
      return;
    }
    if (id !== requestId.current) return;
    setPreviewUrl(image);

    let res: Response;
    let data: VisionApiResponse | null = null;
    try {
      res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
      });
    } catch {
      if (id !== requestId.current) return;
      failScan({ code: 'connection_failed', message: 'Could not reach ECHO. Check your connection and try again.' });
      return;
    }
    try {
      data = (await res.json()) as VisionApiResponse;
    } catch {
      data = null;
    }
    if (id !== requestId.current) return;

    if (!res.ok || !data || data.success === false) {
      failScan({
        code: data?.errorCode ?? (res.ok ? 'invalid_model_output' : 'provider_error'),
        message: data?.error || `Scan failed (HTTP ${res.status}).`,
      });
      return;
    }
    if (!validateProposal(data.proposal)) {
      failScan({ code: 'invalid_model_output', message: 'The scan returned an unreadable result. Please try again.' });
      return;
    }
    setMock(data.mock === true);
    setProposalBoth(structuredCloneSafe(data.proposal));
    setStatusBoth('review');
  }, []);

  const updateItem = useCallback<UseSupplyScan['updateItem']>((index, patch) => {
    const cur = proposalRef.current;
    if (!cur || !cur.items[index]) return;
    if (statusRef.current === 'saving' || statusRef.current === 'saved') return;
    const items = cur.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    setProposalBoth({ ...cur, items });
  }, []);

  const removeItem = useCallback((index: number) => {
    const cur = proposalRef.current;
    if (!cur || !cur.items[index]) return;
    if (statusRef.current === 'saving' || statusRef.current === 'saved') return;
    setProposalBoth({ ...cur, items: cur.items.filter((_, i) => i !== index) });
  }, []);

  const confirm = useCallback(async (): Promise<EchoResult<InventoryReceipt>> => {
    const cur = proposalRef.current;
    if (!cur) return fail('proposal_not_found', 'There is no scan to save.');
    if ((statusRef.current === 'saving' || statusRef.current === 'saved') && receiptRef.current) {
      return { ok: true, value: receiptRef.current };
    }
    if (statusRef.current === 'saving') return fail('save_failed', 'Save already in progress.');

    if (cur.items.length === 0) return fail('invalid_request', 'Nothing to save: every item was removed.');
    for (const [n, it] of cur.items.entries()) {
      const label = `Item ${n + 1}`;
      if (!it.name || !it.name.trim()) return fail('invalid_request', `${label}: name is required.`);
      if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
        return fail('invalid_request', `${label}: quantity must be a whole number greater than zero.`);
      }
      if (it.unitVolumeMl != null && (!Number.isFinite(it.unitVolumeMl) || it.unitVolumeMl <= 0)) {
        return fail('invalid_request', `${label}: capacity must be a positive number of mL, or left unknown.`);
      }
    }

    setStatusBoth('saving');
    setError(null);
    const confirmFn = optsRef.current.confirmProposal;
    let result: EchoResult<InventoryReceipt>;
    try {
      result = confirmFn ? confirmFn(cur) : InventoryService.confirmProposal(cur);
      if (!confirmFn && result.ok && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('echo:inventory-changed'));
      }
    } catch (e) {
      result = fail('save_failed', e instanceof Error ? e.message : 'Could not save to inventory.');
    }

    if (result.ok) {
      setReceiptBoth(result.value);
      setStatusBoth('saved');
      const confirmed = { ...cur, status: 'confirmed' as const };
      setProposalBoth(confirmed);
      optsRef.current.onConfirmed?.(result.value, confirmed);
    } else {
      setError(result.error);
      setStatusBoth('error'); // proposal kept so the user can retry
    }
    return result;
  }, []);

  const reject = useCallback(() => {
    const cur = proposalRef.current;
    requestId.current++;
    setProposalBoth(null);
    setReceiptBoth(null);
    setPreviewUrl(null);
    setError(null);
    setMock(false);
    setStatusBoth('idle');
    if (cur) optsRef.current.onRejected?.({ ...cur, status: 'rejected' });
  }, []);

  const reset = useCallback(() => {
    requestId.current++;
    setProposalBoth(null);
    setReceiptBoth(null);
    setPreviewUrl(null);
    setError(null);
    setMock(false);
    setStatusBoth('idle');
  }, []);

  return { status, proposal, previewUrl, receipt, error, mock, scanPhoto, updateItem, removeItem, confirm, reject, reset };
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export type { FillLevel };
