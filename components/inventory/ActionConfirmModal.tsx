'use client';

import React from 'react';
import { EchoAction } from '@/types/echo';
import { Card, Button, Badge } from '@/components/ui';
import { AlertCircle, Check, X, ShieldAlert } from 'lucide-react';

interface ActionConfirmModalProps {
  action: EchoAction | null;
  onConfirm: (action: EchoAction) => void;
  onCancel: () => void;
}

export function ActionConfirmModal({
  action,
  onConfirm,
  onCancel,
}: ActionConfirmModalProps) {
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <Card glow="cyan" className="max-w-md w-full bg-echo-surface border-echo-cyan/60">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-echo-border mb-3">
          <ShieldAlert className="w-5 h-5 text-echo-cyan" />
          <h3 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
            Confirm AI Proposed Action
          </h3>
        </div>

        <div className="space-y-3 mb-5">
          {action.type === 'inventory_update' && (
            <div className="bg-echo-bg/60 border border-echo-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-echo-muted">OPERATION:</span>
                <Badge variant={action.operation === 'add' ? 'emerald' : 'amber'}>
                  {action.operation.toUpperCase()}
                </Badge>
              </div>

              <div className="text-sm font-mono font-bold text-white">
                {action.item.name}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-echo-muted">
                <span>Quantity:</span>
                <span className="text-echo-cyan font-bold">
                  +{action.item.quantity} {action.item.unit}
                </span>
              </div>

              {action.reason && (
                <div className="text-[11px] font-mono text-echo-muted/80 pt-1 border-t border-echo-border">
                  Source reason: {action.reason}
                </div>
              )}
            </div>
          )}

          {action.type === 'save_location' && (
            <div className="bg-echo-bg/60 border border-echo-border rounded-lg p-3 space-y-1">
              <div className="text-sm font-mono font-bold text-white">
                {action.location.label}
              </div>
              <div className="text-xs font-mono text-echo-muted">
                Lat: {action.location.latitude}, Lng: {action.location.longitude}
              </div>
            </div>
          )}

          <div className="flex items-start space-x-2 text-[11px] font-mono text-echo-amber bg-echo-amber/10 border border-echo-amber/30 p-2 rounded">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>AI mutations require manual authorization before commit.</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(action)}
            className="px-5"
          >
            <Check className="w-4 h-4 mr-1" />
            Authorize & Commit
          </Button>
        </div>
      </Card>
    </div>
  );
}
