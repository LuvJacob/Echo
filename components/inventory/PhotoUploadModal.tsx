'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { VisionApiResponse, VisionResult, EchoAction } from '@/types/echo';
import { Camera, Upload, AlertTriangle, Check, X, Loader2 } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSimulateScan = async () => {
    setIsAnalyzing(true);
    setVisionResult(null);

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: 'data:image/jpeg;base64,mock_water_bottle_sample_data',
          prompt: 'Detect survival supplies and calculate quantity',
        }),
      });

      const data: VisionApiResponse = await res.json();
      if (data.success && data.result) {
        setVisionResult(data.result);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <Card glow="cyan" className="max-w-lg w-full bg-echo-surface border-echo-cyan/60">
        <div className="flex items-center justify-between pb-3 border-b border-echo-border mb-4">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-echo-cyan" />
            <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
              Optical Supply Scanner
            </h3>
          </div>
          <button onClick={onClose} className="text-echo-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scan Area / Viewfinder */}
        <div className="border-2 border-dashed border-echo-border rounded-xl p-6 mb-4 flex flex-col items-center justify-center bg-echo-bg/50 relative overflow-hidden text-center">
          {/* Cyberpunk HUD Frame */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-echo-cyan" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-echo-cyan" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-echo-cyan" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-echo-cyan" />

          {isAnalyzing ? (
            <div className="py-6 flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 text-echo-cyan animate-spin" />
              <span className="text-xs font-mono text-echo-cyan animate-pulse">
                SCANNING OBJECT RECOGNITION TENSORS...
              </span>
            </div>
          ) : visionResult ? (
            <div className="w-full text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-echo-muted">DETECTED TARGETS:</span>
                <Badge variant="emerald">RECOGNITION HIGH</Badge>
              </div>
              {visionResult.detectedObjects.map((obj, i) => (
                <div key={i} className="bg-echo-surface p-2.5 rounded border border-echo-cyan/40 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-mono font-bold text-white">{obj.name}</div>
                    <div className="text-[10px] font-mono text-echo-muted">{obj.notes}</div>
                  </div>
                  <div className="text-sm font-mono font-bold text-echo-cyan">
                    +{obj.quantity} {obj.unit}
                  </div>
                </div>
              ))}

              {visionResult.uncertaintyNotes.length > 0 && (
                <div className="bg-echo-amber/10 border border-echo-amber/30 p-2 rounded text-[10px] font-mono text-echo-amber space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>OPTICAL SENSOR UNCERTAINTY:</span>
                  </div>
                  {visionResult.uncertaintyNotes.map((note, i) => (
                    <div key={i}>• {note}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <Upload className="w-8 h-8 text-echo-muted mx-auto" />
              <p className="text-xs font-mono text-echo-text">
                Point camera or upload image of supply cache
              </p>
              <p className="text-[10px] font-mono text-echo-muted">
                Supports water bottles, canned goods, medical kits, rations
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          {!visionResult ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSimulateScan}
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? 'Analyzing Optical Feed...' : 'Scan Demo Water Bottles (+3)'}
            </Button>
          ) : (
            <div className="flex items-center space-x-2 w-full justify-end">
              <Button variant="ghost" size="sm" onClick={() => setVisionResult(null)}>
                Rescan
              </Button>
              <Button variant="primary" size="sm" onClick={handleAcceptProposal}>
                <Check className="w-4 h-4 mr-1" />
                Submit For Confirmation
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
