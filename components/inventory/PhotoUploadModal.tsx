'use client';

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

function generatePresetImageDataUrl(preset: 'water' | 'mre' | 'medical' | 'discolored'): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0a101d';
  ctx.fillRect(0, 0, 640, 480);

  // Tactical Grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 0; x < 640; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 480);
    ctx.stroke();
  }
  for (let y = 0; y < 480; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(640, y);
    ctx.stroke();
  }

  // Draw preset items
  if (preset === 'water') {
    [100, 260, 420].forEach((x) => {
      // Bottle Body
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(x, 140, 110, 240, [15, 15, 10, 10]);
      ctx.fill();
      // Cap
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + 35, 100, 40, 40);
      // Label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 15, 200, 80, 80);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('WATER', x + 25, 230);
      ctx.fillText('500 mL', x + 22, 255);
    });
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('SUPPLY SCAN FIXTURE: 3x WATER BOTTLES 500ML', 70, 50);
  } else if (preset === 'mre') {
    [120, 340].forEach((x) => {
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(x, 140, 170, 240, 12);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('MRE RATION PACK', x + 20, 220);
      ctx.fillText('1,200 KCAL', x + 35, 250);
      ctx.fillText('SEALED', x + 50, 280);
    });
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('SUPPLY SCAN FIXTURE: 2x MRE RATION PACKS', 90, 50);
  } else if (preset === 'medical') {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(170, 120, 300, 260, 18);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(295, 170, 50, 160);
    ctx.fillRect(240, 225, 160, 50);
    ctx.font = 'bold 16px monospace';
    ctx.fillText('EMERGENCY FIRST-AID KIT', 195, 355);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('SUPPLY SCAN FIXTURE: 1x EMERGENCY TRAUMA KIT', 70, 50);
  } else if (preset === 'discolored') {
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.roundRect(260, 130, 120, 260, [20, 20, 10, 10]);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(295, 90, 50, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('SUSPECT FLUID', 265, 240);
    ctx.fillText('GREEN TINT', 275, 265);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('WARNING: UNVERIFIED FLUID SAMPLE (DISCOLORED)', 70, 50);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

export function PhotoUploadModal({ isOpen, onClose, scan, onLiveAdded }: PhotoUploadModalProps) {
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

              {/* Demo Sample Fixtures */}
              <div className="pt-3 border-t border-echo-border/60">
                <span className="block text-[10px] font-mono text-echo-muted uppercase mb-2">
                  Or test with verified demo photo fixtures:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      const url = generatePresetImageDataUrl('water');
                      void scan.scanPhoto(url);
                    }}
                    className="p-2 rounded-lg border border-echo-border bg-echo-bg/60 hover:border-echo-cyan/60 hover:bg-echo-cyan/10 text-left text-xs font-mono transition-colors"
                  >
                    <div className="font-bold text-echo-cyan text-[11px]">3x Water Bottles</div>
                    <div className="text-[9px] text-echo-muted">500 mL sealed</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      const url = generatePresetImageDataUrl('mre');
                      void scan.scanPhoto(url);
                    }}
                    className="p-2 rounded-lg border border-echo-border bg-echo-bg/60 hover:border-echo-amber/60 hover:bg-echo-amber/10 text-left text-xs font-mono transition-colors"
                  >
                    <div className="font-bold text-echo-amber text-[11px]">2x MRE Rations</div>
                    <div className="text-[9px] text-echo-muted">1,200 kcal pack</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      const url = generatePresetImageDataUrl('medical');
                      void scan.scanPhoto(url);
                    }}
                    className="p-2 rounded-lg border border-echo-border bg-echo-bg/60 hover:border-echo-rose/60 hover:bg-echo-rose/10 text-left text-xs font-mono transition-colors"
                  >
                    <div className="font-bold text-echo-rose text-[11px]">1x Trauma Kit</div>
                    <div className="text-[9px] text-echo-muted">First-aid supplies</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      const url = generatePresetImageDataUrl('discolored');
                      void scan.scanPhoto(url);
                    }}
                    className="p-2 rounded-lg border border-echo-border bg-echo-bg/60 hover:border-echo-emerald/60 hover:bg-echo-emerald/10 text-left text-xs font-mono transition-colors"
                  >
                    <div className="font-bold text-emerald-400 text-[11px]">Suspect Fluid</div>
                    <div className="text-[9px] text-echo-muted">Flagged green tint</div>
                  </button>
                </div>
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
              <span>LIVE — hold an item up to the camera</span>
            </div>
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
                        {WATER_SAFETY_LABEL[a.waterSafety]}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Capacity each (mL)</label>
                      <input
                        type="number"
                        min={1}
                        step="any"
                        inputMode="decimal"
                        placeholder="unknown"
                        value={item.unitVolumeMl ?? ''}
                        disabled={isSaving}
                        onChange={(e) => {
                          const v = e.target.value;
                          scan.updateItem(i, { unitVolumeMl: v === '' ? null : Number(v) });
                        }}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Fill level</label>
                      <select
                        value={item.fillLevel ?? ''}
                        disabled={isSaving}
                        onChange={(e) =>
                          scan.updateItem(i, {
                            fillLevel: e.target.value === '' ? null : (e.target.value as FillLevel),
                          })
                        }
                        className={inputCls}
                      >
                        {FILL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Location</label>
                      <input
                        type="text"
                        placeholder="e.g. locker seven"
                        value={item.location ?? ''}
                        disabled={isSaving}
                        onChange={(e) =>
                          scan.updateItem(i, { location: e.target.value === '' ? null : e.target.value })
                        }
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {isWater && (
                    <div className="text-[10px] font-mono text-echo-muted flex items-start gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-echo-cyan shrink-0" />
                      <div className="space-y-0.5">
                        <div>Drinkability: undetermined — test or treat before drinking</div>
                        {unknownWater && (
                          <div className="text-echo-amber">
                            Unknown capacity/fill won&apos;t count toward litres.
                          </div>
                        )}
                      </div>
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

            {proposal.uncertaintyNotes.length > 0 && (
              <div className="bg-echo-amber/10 border border-echo-amber/30 p-2.5 rounded-lg text-[10px] font-mono text-echo-amber space-y-1">
                <div className="font-bold flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>SENSOR UNCERTAINTY:</span>
                </div>
                {proposal.uncertaintyNotes.map((note, i) => (
                  <div key={i}>• {note}</div>
                ))}
              </div>
            )}

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
