'use client';
import { WaterSafetyText } from '@/components/inventory/WaterSafetyText';

import React, { useEffect, useRef, useState } from 'react';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { Card, Button, Badge } from '@/components/ui';
import type { UseSupplyScan } from '@/hooks/useSupplyScan';
import { useLiveScan, type LiveAddEvent } from '@/hooks/useLiveScan';
import { WATER_SAFETY_LABEL, type FillLevel } from '@/types/echo';
import {
  Camera,
  Upload,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Scan,
  Droplet,
  Eye,
  Radio,
} from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  scan: UseSupplyScan;
  onLiveAdded?: (e: LiveAddEvent) => void;
  /** [Person B] True while ECHO's mic is open (e.g. waiting for a spoken yes/no). */
  voiceListening?: boolean;
  /** [Person B] ECHO's latest spoken line, shown as a caption inside the scanner. */
  voiceCaption?: string;
  /** [Person B] Live scan saw something it can't identify → page asks the survivor by voice. */
  onLiveUnknown?: () => void;
}

const FILL_OPTIONS: { value: FillLevel | ''; label: string }[] = [
  { value: '', label: 'Unknown' },
  { value: 'full', label: 'Full' },
  { value: 'three_quarters', label: '¾' },
  { value: 'half', label: '½' },
  { value: 'quarter', label: '¼' },
  { value: 'empty', label: 'Empty' },
];

const inputCls =
  'w-full bg-echo-bg border border-echo-border rounded-md px-2 py-1.5 text-base sm:text-xs font-mono text-white focus:outline-none focus:border-echo-cyan';
const labelCls = 'block text-[10px] font-mono text-echo-muted uppercase mb-1';

export function PhotoUploadModal({ isOpen, onClose, scan, onLiveAdded, voiceListening, voiceCaption, onLiveUnknown }: PhotoUploadModalProps) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedLiters, setSavedLiters] = useState<number | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const camera = useCameraCapture();
  const [liveMode, setLiveMode] = useState(false);
  const live = useLiveScan({
    grabFrame: () => camera.grabFrame(640),
    onAdded: (e) => onLiveAdded?.(e),
    onUnknown: () => onLiveUnknown?.(),
  });
  const liveStart = live.start;
  const liveStop = live.stop;

  // Turn the webcam off whenever the modal closes.
  useEffect(() => {
    if (!isOpen) {
      liveStop();
      camera.stop();
      setLiveMode(false);
    }
  }, [isOpen, camera.stop, liveStop]);

  // Start analysing once the camera is up in live mode.
  useEffect(() => {
    if (liveMode && camera.active && !live.running) liveStart();
  }, [liveMode, camera.active, live.running, liveStart]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const { status, proposal, previewUrl, error, mock } = scan;
  const isScanning = status === 'scanning';
  const showReview =
    !!proposal && (status === 'review' || status === 'error' || status === 'saving');
  const showSavedBanner = savedLiters !== null;
  const showErrorNoProposal = status === 'error' && !proposal;
  const showPicker = !isScanning && !showReview && !showSavedBanner && !showErrorNoProposal && !camera.active && !liveMode;
  const showLive = liveMode && !isScanning && !showReview;
  const showCamera = camera.active && !liveMode && !isScanning && !showReview;

  const openCamera = async () => {
    const ok = await camera.start();
    // No usable camera API (e.g. phone over plain http) → native camera/file picker.
    if (!ok && !navigator.mediaDevices?.getUserMedia) cameraRef.current?.click();
  };

  const openLive = async () => {
    setLiveMode(true);
    const ok = await camera.start();
    if (!ok) setLiveMode(false);
  };

  const finishLive = () => {
    live.stop();
    camera.stop();
    setLiveMode(false);
    onClose();
  };

  const snap = () => {
    const url = camera.capture();
    if (url) {
      setConfirmError(null);
      void scan.scanPhoto(url);
    }
  };
  const isSaving = status === 'saving';

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      setConfirmError(null);
      void scan.scanPhoto(file);
    }
  };

  const handleClose = () => {
    live.stop();
    setLiveMode(false);
    camera.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    setSavedLiters(null);
    setConfirmError(null);
    if (proposal && status !== 'saved') scan.reject();
    else scan.reset();
    onClose();
  };

  const handleReject = () => {
    setConfirmError(null);
    scan.reject();
    onClose();
  };

  const handleConfirm = async () => {
    setConfirmError(null);
    const r = await scan.confirm();
    if (r.ok) {
      setSavedLiters(r.value.totals.waterLiters);
      timerRef.current = setTimeout(() => {
        setSavedLiters(null);
        scan.reset();
        onClose();
      }, 1200);
    } else {
      setConfirmError(r.error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <Card
        glow="cyan"
        className="max-w-xl w-full max-h-[90vh] overflow-y-auto bg-echo-surface border-echo-cyan/60 p-4 sm:p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-echo-cyan" />
            <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
              Optical Supply Scanner
            </h3>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="text-echo-muted hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={cameraRef}
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          type="file"
          ref={uploadRef}
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        {/* Picker */}
        {showPicker && (
          <div className="border border-echo-cyan/40 rounded-xl p-4 sm:p-6 mb-3 flex flex-col items-center justify-center bg-echo-bg/80 relative overflow-hidden min-h-[220px]">
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-echo-cyan" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-echo-cyan" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-echo-cyan" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-echo-cyan" />
            <div className="space-y-4 text-center z-10 w-full">
              <div className="space-y-1">
                <Camera className="w-10 h-10 text-echo-cyan/70 mx-auto animate-pulse" />
                <p className="text-xs font-mono text-white font-bold">Viewfinder Ready</p>
                <p className="text-[10px] font-mono text-echo-muted">
                  Photograph your water, food, or medical supplies
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={openLive}
                  disabled={camera.starting}
                  className="text-xs font-bold"
                >
                  <Radio className="w-4 h-4 mr-1.5" />
                  Live scan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={openCamera}
                  disabled={camera.starting}
                  className="text-xs font-bold"
                >
                  {camera.starting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Camera className="w-4 h-4 mr-1.5" />}
                  Take photo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => uploadRef.current?.click()}
                  className="text-xs font-bold"
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload image
                </Button>
              </div>
            </div>
          </div>
        )}

        {camera.error && showPicker && (
          <div className="mb-3 rounded-lg border border-echo-amber/50 bg-echo-amber/10 p-2.5 text-[11px] font-mono text-echo-amber">
            {camera.error.message}
          </div>
        )}

        {/* Live camera viewfinder */}
        {showCamera && (
          <div className="mb-3 rounded-xl border border-echo-cyan/40 bg-black relative overflow-hidden">
            <video ref={camera.videoRef} playsInline muted autoPlay className="w-full max-h-[55vh] object-contain" />
            <div className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-echo-cyan" />
            <div className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-echo-cyan" />
            <div className="pointer-events-none absolute bottom-14 left-2 w-5 h-5 border-b-2 border-l-2 border-echo-cyan" />
            <div className="pointer-events-none absolute bottom-14 right-2 w-5 h-5 border-b-2 border-r-2 border-echo-cyan" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-black/60 p-2">
              <Button type="button" variant="ghost" size="sm" onClick={camera.stop}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="md" onClick={snap} className="px-6 font-bold">
                <Camera className="w-4 h-4 mr-1.5" />
                Capture &amp; Scan
              </Button>
            </div>
          </div>
        )}

        {/* Live scan */}
        {showLive && (
          <div className="mb-3 space-y-2">
            <div className="rounded-xl border border-echo-cyan/40 bg-black relative overflow-hidden">
              <video ref={camera.videoRef} playsInline muted autoPlay className="w-full max-h-[40vh] object-contain" />
              <div className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-echo-cyan" />
              <div className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-echo-cyan" />
              <div className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-echo-cyan" />
              <div className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-echo-cyan" />
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-echo-cyan animate-pulse">
              {live.analyzing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{live.hint || 'LIVE — hold an item up to the camera'}</span>
            </div>
            {voiceCaption && (
              <div className="rounded-lg border border-echo-cyan/40 bg-echo-cyan/10 p-2 text-[11px] font-mono text-echo-cyan">
                ECHO: {voiceCaption}
              </div>
            )}
            {voiceListening && (
              <div className="flex items-center gap-2 rounded-lg border border-echo-emerald/60 bg-echo-emerald/15 p-2 text-xs font-mono font-bold text-echo-emerald animate-pulse">
                🎙 Listening for your answer… just say “yes” or “no”
              </div>
            )}
            {live.inView.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {live.inView.map((n, i) => (
                  <span key={`${n}-${i}`} className="px-2 py-0.5 rounded border border-echo-cyan/40 bg-echo-cyan/10 text-[10px] font-mono text-echo-cyan">
                    {n}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px] font-mono text-echo-muted">
              ECHO will ask out loud if a clear bottle is factory-sealed — hold the mic and answer yes or no.
            </p>
            {live.error && (
              <div className="bg-echo-rose/15 border border-echo-rose/50 p-2.5 rounded-lg text-xs font-mono text-echo-rose">
                {live.error.message}
              </div>
            )}
            {live.added.length > 0 && (
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {[...live.added].reverse().map((a) => (
                  <li key={a.id} className="text-[11px] font-mono text-white flex flex-wrap items-center gap-1.5">
                    <span>✓ {a.name} → {a.categoryLabel}</span>
                    {a.waterSafety && (
                      <span
                        className={`px-1.5 py-0.5 rounded border text-[9px] ${
                          a.waterSafety === 'possible_contamination'
                            ? 'border-echo-rose/50 bg-echo-rose/10 text-echo-rose'
                            : a.waterSafety === 'safety_unknown'
                              ? 'border-echo-amber/50 bg-echo-amber/10 text-echo-amber'
                              : 'border-echo-emerald/50 bg-echo-emerald/10 text-echo-emerald'
                        }`}
                      >
                        <WaterSafetyText safety={a.waterSafety} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <Button type="button" variant="primary" size="md" onClick={finishLive} className="px-6 font-bold">
                <Check className="w-4 h-4 mr-1.5" />
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Scanning */}
        {isScanning && (
          <div className="border border-echo-cyan/40 rounded-xl p-4 sm:p-6 mb-3 flex flex-col items-center justify-center bg-echo-bg/80 relative overflow-hidden min-h-[220px]">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Scan preview"
                className="absolute inset-0 w-full h-full object-contain opacity-30"
              />
            )}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-echo-cyan" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-echo-cyan" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-echo-cyan" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-echo-cyan" />
            <div className="absolute inset-x-0 h-1 bg-echo-cyan shadow-[0_0_15px_#00e5ff] animate-bounce top-0 pointer-events-none" />
            <div className="py-8 flex flex-col items-center space-y-3 z-10">
              <Loader2 className="w-10 h-10 text-echo-cyan animate-spin" />
              <span className="text-xs font-mono text-echo-cyan font-bold tracking-widest animate-pulse">
                ANALYZING PHOTO...
              </span>
              <span className="text-[10px] font-mono text-echo-muted">
                Identifying supplies in frame
              </span>
            </div>
          </div>
        )}

        {/* Error with no proposal */}
        {showErrorNoProposal && (
          <div className="space-y-3 mb-3">
            <div className="bg-echo-rose/15 border border-echo-rose/50 p-3 rounded-lg text-xs font-mono text-echo-rose">
              {error?.message ?? 'Scan failed. Please try again.'}
            </div>
            <Button variant="primary" size="md" onClick={() => scan.reset()} className="w-full text-xs font-bold">
              Try another photo
            </Button>
          </div>
        )}

        {/* Saved banner */}
        {showSavedBanner && (
          <div className="bg-echo-emerald/15 border border-echo-emerald/50 p-4 rounded-lg text-xs font-mono text-echo-emerald font-bold flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>SAVED TO INVENTORY ✓ — water total {savedLiters} L</span>
          </div>
        )}

        {/* Review form */}
        {showReview && proposal && !showSavedBanner && (
          <div className="space-y-3">
            {mock && (
              <Badge variant="amber">OFFLINE DEMO FIXTURE — no AI model called</Badge>
            )}

            {proposal.summary && (
              <div className="text-xs font-mono text-echo-muted flex items-start gap-1.5">
                <Scan className="w-4 h-4 text-echo-cyan shrink-0 mt-0.5" />
                <span>{proposal.summary}</span>
              </div>
            )}

            {proposal.items.length === 0 && (
              <div className="text-xs font-mono text-echo-muted text-center py-4 border border-dashed border-echo-border rounded-lg">
                No items left. Reject to start over.
              </div>
            )}

            {proposal.items.map((item, i) => {
              const isWater = item.category === 'water';
              const unknownWater = isWater && (item.unitVolumeMl == null || item.fillLevel == null);
              return (
                <div
                  key={i}
                  className="bg-echo-bg/80 p-3 rounded-lg border border-echo-cyan/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="cyan">{item.category}</Badge>
                      <span className="text-[10px] font-mono text-echo-muted">
                        confidence {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => scan.removeItem(i)}
                      disabled={isSaving}
                      aria-label={`Remove ${item.name}`}
                      className="text-echo-muted hover:text-echo-rose p-1 disabled:opacity-40"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className={labelCls}>Name</label>
                      <input
                        type="text"
                        value={item.name}
                        disabled={isSaving}
                        onChange={(e) => scan.updateItem(i, { name: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={item.quantity > 0 ? item.quantity : ''}
                        disabled={isSaving}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          scan.updateItem(i, { quantity: Number.isNaN(n) ? 0 : n });
                        }}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Location (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. locker seven"
                      value={item.location ?? ''}
                      disabled={isSaving}
                      onChange={(e) => scan.updateItem(i, { location: e.target.value === '' ? null : e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  {isWater && item.waterSafety && (
                    <div
                      className={`flex items-center gap-1.5 rounded-lg border p-2 text-[11px] font-mono font-bold ${
                        item.waterSafety === 'possible_contamination'
                          ? 'border-echo-rose/60 bg-echo-rose/15 text-echo-rose'
                          : item.waterSafety === 'preferred'
                            ? 'border-echo-emerald/60 bg-echo-emerald/15 text-echo-emerald'
                            : 'border-echo-amber/60 bg-echo-amber/10 text-echo-amber'
                      }`}
                    >
                      <Droplet className="w-3.5 h-3.5 shrink-0" />
                      <WaterSafetyText safety={item.waterSafety} />
                    </div>
                  )}

                  {item.observations.length > 0 && (
                    <div className="bg-echo-amber/10 border border-echo-amber/30 p-2 rounded-lg text-[10px] font-mono text-echo-amber space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>VISUAL OBSERVATION</span>
                      </div>
                      {item.observations.map((o, k) => (
                        <div key={k}>• {o}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}


            {confirmError && (
              <div className="bg-echo-rose/15 border border-echo-rose/50 p-2.5 rounded-lg text-xs font-mono text-echo-rose">
                {confirmError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={handleReject} disabled={isSaving}>
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={isSaving}
                className="px-5 font-bold"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1.5" />
                )}
                Confirm &amp; Save
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
