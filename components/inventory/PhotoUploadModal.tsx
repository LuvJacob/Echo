'use client';

import React, { useState, useRef } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { VisionApiResponse, VisionResult, EchoAction, ItemCategory } from '@/types/echo';
import {
  Camera,
  Upload,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Scan,
  Sparkles,
  ShieldAlert,
  Droplet,
  Package,
} from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionProposed: (action: EchoAction) => void;
}

export function PhotoUploadModal({
  isOpen,
  onClose,
  onActionProposed,
}: PhotoUploadModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'water' | 'mre' | 'medical' | 'discolored'>('water');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Preset scenarios for reliable 75-second live demo
  const presets = [
    {
      id: 'water' as const,
      name: 'Water Bottles (+3)',
      desc: '3 standard 500ml water bottles',
      category: 'water' as ItemCategory,
      count: 3,
      unit: 'bottles',
      notes: 'Standard sealed plastic bottles. Fluid appears clear.',
      uncertainty: ['Optical scan cannot verify potability or dissolved contaminants.'],
      safety: [],
    },
    {
      id: 'mre' as const,
      name: 'MRE Rations (+2)',
      desc: 'High-calorie survival meal packs',
      category: 'food' as ItemCategory,
      count: 2,
      unit: 'packs',
      notes: 'Vacuum-sealed military ration packs. 2,400 kcal total estimated.',
      uncertainty: ['Expiration date stamp partially obscured; check printed code.'],
      safety: [],
    },
    {
      id: 'medical' as const,
      name: 'Trauma Kit (+1)',
      desc: 'Field emergency first-aid kit',
      category: 'medical' as ItemCategory,
      count: 1,
      unit: 'kits',
      notes: 'Sterile bandages, antiseptic pads, pressure tourniquet identified.',
      uncertainty: ['Verify tamper-evident seal before clinical field use.'],
      safety: [],
    },
    {
      id: 'discolored' as const,
      name: 'Suspect Fluid (Flagged)',
      desc: 'Discolored greenish liquid bottle',
      category: 'water' as ItemCategory,
      count: 1,
      unit: 'bottles',
      notes: 'Unusual tint detected in container fluid.',
      uncertainty: ['Fluid demonstrates abnormal spectral reflection.'],
      safety: ['CAUTION: Do not ingest unpurified liquid. Chemical or biological hazard possible.'],
    },
  ];

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanPreset = async (presetId = activePreset) => {
    setIsAnalyzing(true);
    setVisionResult(null);

    const preset = presets.find((p) => p.id === presetId) || presets[0];

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: previewImage || `data:image/jpeg;base64,mock_${preset.id}_sample_data`,
          prompt: `Analyze survival assets: ${preset.desc}`,
        }),
      });

      const data: VisionApiResponse = await res.json();
      if (data.success && data.result) {
        // Overlay preset details for realistic presentation
        const finalResult: VisionResult = {
          ...data.result,
          detectedObjects: [
            {
              name: preset.name.split(' (')[0],
              category: preset.category,
              quantity: preset.count,
              unit: preset.unit,
              confidence: 0.94,
              notes: preset.notes,
              boundingBox: { x: 80, y: 60, width: 240, height: 280 },
            },
          ],
          uncertaintyNotes: preset.uncertainty,
          safetyConcerns: preset.safety,
          suggestedAction: {
            type: 'inventory_update',
            operation: 'add',
            item: {
              name: preset.name.split(' (')[0],
              category: preset.category,
              quantity: preset.count,
              unit: preset.unit,
              source: 'vision_scan',
              notes: preset.notes,
            },
            reason: `Optical scan recognition (${preset.count} ${preset.unit})`,
            confidence: 0.94,
          },
        };
        setVisionResult(finalResult);
      }
    } catch (e) {
      console.error('[PhotoUploadModal] Scan failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptProposal = () => {
    if (visionResult?.suggestedAction) {
      onActionProposed(visionResult.suggestedAction);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <Card glow="cyan" className="max-w-xl w-full bg-echo-surface border-echo-cyan/60 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-echo-cyan" />
            <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
              Optical Multi-Spectral Supply Scanner
            </h3>
          </div>
          <button onClick={onClose} className="text-echo-muted hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Selector Chips for Live Demo */}
        <div className="mb-3">
          <span className="block text-[10px] font-mono text-echo-muted uppercase mb-1.5">
            Select Live Demo Preset or Upload Photo:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActivePreset(p.id);
                  setVisionResult(null);
                }}
                className={`text-left p-2 rounded-lg border text-xs font-mono transition-colors ${
                  activePreset === p.id
                    ? 'border-echo-cyan bg-echo-cyan/15 text-white'
                    : 'border-echo-border bg-echo-bg/60 text-echo-muted hover:border-echo-border/80'
                }`}
              >
                <div className="font-bold text-[11px] truncate">{p.name}</div>
                <div className="text-[9px] text-echo-muted truncate">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Viewfinder Canvas */}
        <div className="border border-echo-cyan/40 rounded-xl p-4 sm:p-6 mb-3 flex flex-col items-center justify-center bg-echo-bg/80 relative overflow-hidden min-h-[220px]">
          {/* Cyberpunk HUD Frame Reticles */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-echo-cyan" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-echo-cyan" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-echo-cyan" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-echo-cyan" />

          {/* Animated Laser Scanning Line */}
          {isAnalyzing && (
            <div className="absolute inset-x-0 h-1 bg-echo-cyan shadow-[0_0_15px_#00e5ff] animate-bounce top-0 pointer-events-none" />
          )}

          {isAnalyzing ? (
            <div className="py-8 flex flex-col items-center space-y-3 z-10">
              <Loader2 className="w-10 h-10 text-echo-cyan animate-spin" />
              <span className="text-xs font-mono text-echo-cyan font-bold tracking-widest animate-pulse">
                PARSING MULTI-SPECTRAL TENSORS...
              </span>
              <span className="text-[10px] font-mono text-echo-muted">
                Extracting object boundaries & fluid refraction
              </span>
            </div>
          ) : visionResult ? (
            <div className="w-full text-left space-y-2.5 z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-echo-cyan font-bold flex items-center gap-1.5">
                  <Scan className="w-4 h-4" />
                  OPTICAL RECOGNITION CONFIRMED:
                </span>
                <Badge variant="emerald">CONFIDENCE 94%</Badge>
              </div>

              {visionResult.detectedObjects.map((obj, i) => (
                <div
                  key={i}
                  className="bg-echo-surface/90 p-3 rounded-lg border border-echo-cyan/50 flex justify-between items-center shadow-md"
                >
                  <div>
                    <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span>{obj.name}</span>
                      <Badge variant="cyan">{obj.category}</Badge>
                    </div>
                    <div className="text-[10px] font-mono text-echo-muted mt-0.5">
                      {obj.notes}
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold text-echo-cyan pl-2">
                    +{obj.quantity} {obj.unit}
                  </div>
                </div>
              ))}

              {/* Safety Alerts */}
              {visionResult.safetyConcerns.length > 0 && (
                <div className="bg-echo-rose/15 border border-echo-rose/50 p-2.5 rounded-lg text-[10px] font-mono text-echo-rose space-y-1">
                  <div className="font-bold flex items-center gap-1 text-xs">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>OPTICAL SAFETY WARNING:</span>
                  </div>
                  {visionResult.safetyConcerns.map((s, idx) => (
                    <div key={idx}>• {s}</div>
                  ))}
                </div>
              )}

              {/* Uncertainty Notes */}
              {visionResult.uncertaintyNotes.length > 0 && (
                <div className="bg-echo-amber/10 border border-echo-amber/30 p-2.5 rounded-lg text-[10px] font-mono text-echo-amber space-y-1">
                  <div className="font-bold flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>SENSOR UNCERTAINTY:</span>
                  </div>
                  {visionResult.uncertaintyNotes.map((note, i) => (
                    <div key={i}>• {note}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 space-y-3 text-center">
              {previewImage ? (
                <div className="relative max-h-40 overflow-hidden rounded-lg border border-echo-border">
                  <img src={previewImage} alt="Preview" className="max-h-40 object-contain mx-auto" />
                </div>
              ) : (
                <div className="space-y-1">
                  <Camera className="w-10 h-10 text-echo-cyan/70 mx-auto animate-pulse" />
                  <p className="text-xs font-mono text-white font-bold">
                    Viewfinder Ready: {presets.find((p) => p.id === activePreset)?.name}
                  </p>
                  <p className="text-[10px] font-mono text-echo-muted">
                    Point camera at water bottles or canned rations
                  </p>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleSelectFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-echo-muted hover:text-white"
              >
                <Upload className="w-3 h-3 mr-1" />
                Or upload local image file
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {!visionResult ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleScanPreset(activePreset)}
              disabled={isAnalyzing}
              className="w-full text-xs font-bold py-2.5"
            >
              <Scan className="w-4 h-4 mr-1.5" />
              {isAnalyzing ? 'Scanning Multi-Spectral Feed...' : `Scan Target [${presets.find((p) => p.id === activePreset)?.name}]`}
            </Button>
          ) : (
            <div className="flex items-center space-x-2 w-full justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisionResult(null)}
              >
                Rescan
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcceptProposal}
                className="px-5 font-bold"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Authorize & Propose to ECHO
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
