'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { StatusHeader } from '@/components/dashboard/StatusHeader';
import { AlertTicker } from '@/components/dashboard/AlertTicker';
import { SurvivalGauges } from '@/components/dashboard/SurvivalGauges';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ConversationFeed } from '@/components/dashboard/ConversationFeed';
import { AvatarVisualizer } from '@/components/avatar/AvatarVisualizer';
import { InventoryList } from '@/components/inventory/InventoryList';
import { PhotoUploadModal } from '@/components/inventory/PhotoUploadModal';
import { ManualAddItemModal } from '@/components/inventory/ManualAddItemModal';
import { LocationTracker } from '@/components/maps/LocationTracker';
import { Card } from '@/components/ui';
import { useInventory } from '@/hooks/useInventory';
import { useEchoVoice } from '@/hooks/useEchoVoice';
import { useSupplyScan } from '@/hooks/useSupplyScan';
import { ChatMessage, AvatarStatus, InventoryItem } from '@/types/echo';
import { confirmationPhrase } from '@/lib/inventory/live';
import { setPendingSealQuestion } from '@/lib/inventory/sealQuestion';
import { InventoryService } from '@/lib/inventory/service';

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: 'ECHO online. Hold the mic to talk, or type below. Scan supplies to log them.',
  timestamp: 0,
};

export default function HomePage() {
  const { items, summary, isLoaded, refresh, addItem, applyAction, confirmProposal } = useInventory();

  // [Person B] One voice session drives captions, avatar state and jaw amplitude.
  const voice = useEchoVoice();
  const scan = useSupplyScan({
    confirmProposal,
    onConfirmed: (r) =>
      voice.notify(
        `Inventory update confirmed by the survivor and saved. Water total is now ${r.totals.waterLiters} litres.`,
        { respond: false }
      ),
  });

  const messages = useMemo<ChatMessage[]>(
    () => [GREETING, ...voice.captions.map((c) => ({ id: c.id, role: c.role, content: c.text, timestamp: c.at }))],
    [voice.captions]
  );
  const isLoading = voice.status === 'connecting' || voice.status === 'thinking';

  // Manual avatar state (dev toolbar) only applies while ECHO itself is idle.
  const [manualStatus, setManualStatus] = useState<AvatarStatus | null>(null);
  const voiceActive = voice.status !== 'disconnected' && voice.status !== 'ready';
  const avatarStatus: AvatarStatus = voiceActive ? voice.avatarStatus : manualStatus ?? voice.avatarStatus;
  const setAvatarStatus = (s: AvatarStatus) => setManualStatus(s === 'idle' ? null : s);

  const [speechEnabled, setSpeechEnabled] = useState(true);
  useEffect(() => {
    if (voice.audioElement) voice.audioElement.muted = !speechEnabled;
  }, [speechEnabled, voice.audioElement]);

  const [inputVal, setInputVal] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'maps'>('inventory');

  const handleSendMessage = (text: string) => {
    void voice.sendText(text);
    setInputVal('');
  };

  const handleManualAdd = (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
    addItem(item);
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    if (delta > 0) {
      addItem({ ...item, quantity: delta });
    } else {
      applyAction({
        type: 'inventory_update',
        operation: 'remove',
        item: { ...item, quantity: Math.abs(delta) },
      });
    }
  };

  const handleResetSeed = () => {
    InventoryService.seedDemoSupplies();
    refresh();
  };

  const handleClearAll = () => {
    applyAction({
      type: 'inventory_update',
      operation: 'clear',
      item: { name: '', category: 'other', quantity: 0, unit: '', source: 'manual' },
    });
  };

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-3 sm:p-5 flex flex-col justify-between space-y-4">
      {/* 1. Tactical HUD Header & Emergency Broadcast Ticker */}
      <div>
        <StatusHeader />
        <AlertTicker />
        <SurvivalGauges summary={summary} batteryLevel={94} />
      </div>

      {/* 2. Main Mission Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left / Center Column: Avatar Stage + Conversation Terminal */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Holographic Avatar Centerpiece */}
          <Card glow="cyan" className="p-3 sm:p-4 bg-echo-surface/90 border-echo-cyan/40 relative overflow-hidden">
            {/* Interactive Avatar State Switcher Toolbar */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-20">
              {(['idle', 'listening', 'thinking', 'speaking', 'error'] as AvatarStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setAvatarStatus(st)}
                  className={`px-1.5 py-0.5 text-[9px] font-mono rounded border uppercase transition-colors ${
                    avatarStatus === st
                      ? 'bg-echo-cyan text-echo-bg border-echo-cyan font-bold shadow-[0_0_6px_rgba(0,229,255,0.6)]'
                      : 'border-echo-border text-echo-muted hover:text-echo-text bg-echo-bg/50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <AvatarVisualizer
              status={avatarStatus}
              amplitude={voiceActive ? voice.amplitude : 0}
              speechEnabled={speechEnabled}
              onToggleSpeech={() => setSpeechEnabled(!speechEnabled)}
              onStatusChange={(newStatus) => setAvatarStatus(newStatus)}
            />

            {/* Quick Tactical Action Triggers */}
            <div className="w-full pt-3 border-t border-echo-border mt-2">
              <QuickActions
                onCheckWater={() => handleSendMessage('How much water do I have in current inventory?')}
                onScanSupplies={() => setIsPhotoModalOpen(true)}
                onSaveLocation={() => setActiveTab('maps')}
                onAskTip={() => handleSendMessage('Provide emergency water purification guidance.')}
                disabled={isLoading}
              />
            </div>

            {/* [Person B] Voice errors: mic blocked, audio blocked, link dropped */}
            {voice.error && (
              <div className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-echo-rose/50 bg-echo-rose/10 p-2 text-[11px] font-mono text-echo-rose">
                <span>{voice.error.message}</span>
                <span className="flex shrink-0 gap-1">
                  {voice.error.code === 'playback_failed' && (
                    <button onClick={() => voice.resumePlayback()} className="rounded border border-echo-rose/60 px-2 py-0.5 hover:bg-echo-rose/20">
                      Enable audio
                    </button>
                  )}
                  <button onClick={voice.clearError} className="rounded border border-echo-rose/60 px-2 py-0.5 hover:bg-echo-rose/20">
                    Dismiss
                  </button>
                </span>
              </div>
            )}
          </Card>

          {/* Conversation Terminal Stream */}
          <ConversationFeed
            messages={messages}
            isLoading={isLoading}
            avatarStatus={avatarStatus}
            inputVal={inputVal}
            onInputChange={setInputVal}
            onSendMessage={handleSendMessage}
            voice={voice}
          />
        </div>

        {/* Right Column: Inventory Manifest & Geo-Radar Navigation Tabs */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Tactical Tab Navigator */}
          <div className="flex items-center space-x-2 bg-echo-surface/80 p-1 border border-echo-border rounded-xl">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                activeTab === 'inventory'
                  ? 'bg-echo-cyan text-echo-bg shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-echo-muted hover:text-white'
              }`}
            >
              SUPPLIES MANIFEST ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('maps')}
              className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all ${
                activeTab === 'maps'
                  ? 'bg-echo-cyan text-echo-bg shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-echo-muted hover:text-white'
              }`}
            >
              GEO-RADAR BEACON
            </button>
          </div>

          {/* Active Tab View */}
          <div className="flex-1">
            {activeTab === 'inventory' ? (
              <InventoryList
                items={items}
                summary={summary}
                onAddItem={() => setIsManualAddOpen(true)}
                onScanPhoto={() => setIsPhotoModalOpen(true)}
                onQuantityChange={handleQuantityChange}
                onResetSeed={handleResetSeed}
                onClearAll={handleClearAll}
              />
            ) : (
              <LocationTracker />
            )}
          </div>
        </div>
      </div>

      {/* 3. Action Confirmation & Photo Upload Modals */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        scan={scan}
        voiceListening={voice.status === 'listening'}
        voiceCaption={[...voice.captions].reverse().find((c) => c.role === 'assistant')?.text}
        onLiveAdded={(e) => {
          if (e.category === 'water' && e.waterSafety === 'safety_unknown') {
            // Ask live; the spoken yes/no is recorded by the set_water_sealed tool.
            setPendingSealQuestion(e);
            void voice.ask(
              `${e.name} added. Is it unopened and factory-sealed?`,
              `Live scan just added one "${e.name}" (${e.unitVolumeMl ?? '?'} mL). You are asking whether it is unopened and factory-sealed. When the survivor answers, call set_water_sealed with their answer.`
            );
          } else {
            void voice.say(confirmationPhrase(e));
          }
        }}
      />

      <ManualAddItemModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onAdd={handleManualAdd}
      />
    </main>
  );
}
