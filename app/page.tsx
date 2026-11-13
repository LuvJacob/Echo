'use client';

import React, { useState } from 'react';
import { StatusHeader } from '@/components/dashboard/StatusHeader';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { AvatarVisualizer } from '@/components/avatar/AvatarVisualizer';
import { InventoryList } from '@/components/inventory/InventoryList';
import { ActionConfirmModal } from '@/components/inventory/ActionConfirmModal';
import { PhotoUploadModal } from '@/components/inventory/PhotoUploadModal';
import { LocationTracker } from '@/components/maps/LocationTracker';
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';
import { Card, Button, Badge } from '@/components/ui';
import { useInventory } from '@/hooks/useInventory';
import { useEchoChat } from '@/hooks/useEchoChat';
import { EchoAction, AvatarStatus } from '@/types/echo';
import { Send, Terminal, Sparkles, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const { items, summary, isLoaded, refresh, applyAction } = useInventory();
  const {
    messages,
    isLoading,
    avatarStatus,
    setAvatarStatus,
    pendingAction,
    sendMessage,
    clearPendingAction,
  } = useEchoChat(items);

  const [inputVal, setInputVal] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'maps'>('inventory');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage(inputVal);
    setInputVal('');
  };

  const handleConfirmAction = (action: EchoAction) => {
    if (action.type === 'inventory_update') {
      applyAction(action);
    }
    clearPendingAction();
  };

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-3 sm:p-6 flex flex-col justify-between">
      {/* HUD Header */}
      <StatusHeader />

      {/* Main Grid: Avatar Centerpiece + Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left / Center Column: Avatar & Chat Interface */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Holographic Avatar Core */}
          <Card glow="cyan" className="flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Status Switcher Toolbar for Testing */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-20">
              {(['idle', 'listening', 'thinking', 'speaking', 'error'] as AvatarStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setAvatarStatus(st)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono rounded border uppercase transition-colors ${
                    avatarStatus === st
                      ? 'bg-echo-cyan text-echo-bg border-echo-cyan font-bold'
                      : 'border-echo-border text-echo-muted hover:text-echo-text'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <AvatarVisualizer
              status={avatarStatus}
              onClick={() => {
                const next: Record<AvatarStatus, AvatarStatus> = {
                  idle: 'listening',
                  listening: 'thinking',
                  thinking: 'speaking',
                  speaking: 'idle',
                  error: 'idle',
                };
                setAvatarStatus(next[avatarStatus]);
              }}
            />

            {/* Quick Action Bar */}
            <div className="w-full pt-2 border-t border-echo-border">
              <QuickActions
                onCheckWater={() => sendMessage('How much water do I have in current inventory?')}
                onScanSupplies={() => setIsPhotoModalOpen(true)}
                onSaveLocation={() => setActiveTab('maps')}
                onAskTip={() => sendMessage('Provide emergency water purification tips for post-collapse scenario.')}
                disabled={isLoading}
              />
            </div>
          </Card>

          {/* Conversation Terminal */}
          <Card className="flex flex-col h-72 sm:h-80">
            <div className="flex items-center justify-between pb-2 border-b border-echo-border mb-2 text-xs font-mono text-echo-muted">
              <div className="flex items-center space-x-1.5 text-echo-cyan">
                <Terminal className="w-3.5 h-3.5" />
                <span>NEURAL TRANSMISSION LOG</span>
              </div>
              <span>FEED ACTIVE</span>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs font-mono">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center space-x-1 text-[10px] text-echo-muted mb-0.5">
                    <span className="uppercase font-semibold">
                      {m.role === 'user' ? 'SURVIVOR' : 'ECHO AI'}
                    </span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 ${
                      m.role === 'user'
                        ? 'bg-echo-cyan/15 border border-echo-cyan/40 text-echo-text'
                        : 'bg-echo-surface border border-echo-border text-echo-text shadow-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="pt-3 border-t border-echo-border flex gap-2">
              <VoiceInputButton
                onTranscript={(text) => sendMessage(text)}
                status={avatarStatus}
                disabled={isLoading}
              />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask ECHO (e.g. 'How much water do I have?')..."
                className="flex-1 bg-echo-bg/80 border border-echo-border focus:border-echo-cyan focus:outline-none rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-echo-muted"
                disabled={isLoading}
              />
              <Button type="submit" variant="primary" size="sm" disabled={isLoading || !inputVal.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Inventory & Geo Navigation Tabs */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Tab Switcher */}
          <div className="flex items-center space-x-2 bg-echo-surface/60 p-1 border border-echo-border rounded-lg">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-echo-cyan text-echo-bg shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                  : 'text-echo-muted hover:text-white'
              }`}
            >
              SUPPLIES MANIFEST
            </button>
            <button
              onClick={() => setActiveTab('maps')}
              className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                activeTab === 'maps'
                  ? 'bg-echo-cyan text-echo-bg shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                  : 'text-echo-muted hover:text-white'
              }`}
            >
              GEO BEACON
            </button>
          </div>

          {/* Active Panel View */}
          <div className="flex-1">
            {activeTab === 'inventory' ? (
              <InventoryList
                items={items}
                summary={summary}
                onAddItem={() => setIsPhotoModalOpen(true)}
              />
            ) : (
              <LocationTracker />
            )}
          </div>
        </div>
      </div>

      {/* Confirmation & Photo Modals */}
      <ActionConfirmModal
        action={pendingAction}
        onConfirm={handleConfirmAction}
        onCancel={clearPendingAction}
      />

      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onActionProposed={(action) => handleConfirmAction(action)}
      />
    </main>
  );
}
