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
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';
import { Card, Button, Badge } from '@/components/ui';
import { useInventory } from '@/hooks/useInventory';
import { useEchoVoice } from '@/hooks/useEchoVoice';
import { useSupplyScan } from '@/hooks/useSupplyScan';
import { ChatMessage, AvatarStatus, InventoryItem } from '@/types/echo';
import { confirmationPhrase } from '@/lib/inventory/live';
import { setPendingSealQuestion } from '@/lib/inventory/sealQuestion';
import { InventoryService } from '@/lib/inventory/service';
import {
  Send,
  Camera,
  Package,
  Navigation,
  MessageSquare,
  Sparkles,
  Droplet,
  Shield,
  Layers,
  ChevronDown,
} from 'lucide-react';

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

  // Extract latest assistant message for the live holographic subtitle banner
  const latestAssistantMessage = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    return assistantMsgs[assistantMsgs.length - 1]?.content || GREETING.content;
  }, [messages]);

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
  const [activeTab, setActiveTab] = useState<'chat' | 'inventory' | 'maps'>('chat');

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
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
    <main className="min-h-screen max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 flex flex-col justify-between space-y-4">
      {/* 1. Sleek Compact Top Bar & Survival Telemetry */}
      <div className="space-y-2">
        <StatusHeader />
        <AlertTicker />
        <SurvivalGauges summary={summary} batteryLevel={94} />
      </div>

      {/* 2. Primary Showcase: Hero Centered Humanoid Avatar Stage */}
      <section className="relative w-full flex flex-col items-center justify-center py-2 sm:py-4">
        {/* Holographic Avatar Stage Card */}
        <div className="w-full max-w-4xl bg-echo-surface/70 border border-echo-cyan/40 rounded-3xl p-3 sm:p-6 backdrop-blur-xl relative shadow-[0_0_50px_rgba(0,229,255,0.12)] flex flex-col items-center">
          {/* Top Dev / State Override Switcher */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-1 z-20">
            {(['idle', 'listening', 'thinking', 'speaking', 'error'] as AvatarStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => setAvatarStatus(st)}
                className={`px-2 py-0.5 text-[9px] sm:text-[10px] font-mono rounded-md border uppercase transition-all ${
                  avatarStatus === st
                    ? 'bg-echo-cyan text-echo-bg border-echo-cyan font-bold shadow-[0_0_10px_rgba(0,229,255,0.7)]'
                    : 'border-echo-border/80 text-echo-muted hover:text-white bg-echo-bg/60'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Large Humanoid Hologram Avatar */}
          <AvatarVisualizer
            status={avatarStatus}
            amplitude={voiceActive ? voice.amplitude : 0}
            speechEnabled={speechEnabled}
            onToggleSpeech={() => setSpeechEnabled(!speechEnabled)}
            onStatusChange={(newStatus) => setAvatarStatus(newStatus)}
          />

          {/* Live Holographic Spoken Subtitle Banner */}
          <div className="w-full max-w-2xl mt-1 mb-3 px-4 py-2.5 rounded-xl bg-echo-bg/85 border border-echo-cyan/30 text-center shadow-inner">
            <div className="flex items-center justify-center space-x-1.5 text-[10px] font-mono text-echo-cyan uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3 h-3 text-echo-cyan animate-pulse" />
              <span>LIVE AI TRANSMISSION</span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-white leading-relaxed">
              &ldquo;{latestAssistantMessage}&rdquo;
            </p>
          </div>

          {/* Centered Voice Controls & Quick Command Input */}
          <div className="w-full max-w-2xl space-y-2.5">
            {/* Input Bar Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputVal);
              }}
              className="flex gap-2 items-center"
            >
              <VoiceInputButton
                voice={voice}
                onTranscript={(text) => handleSendMessage(text)}
                status={avatarStatus}
                disabled={!voice && isLoading}
              />

              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Command ECHO (e.g. 'How much water do I have?')..."
                className="flex-1 bg-echo-bg/90 border border-echo-border focus:border-echo-cyan focus:outline-none focus:ring-1 focus:ring-echo-cyan rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-white placeholder-echo-muted transition-all shadow-inner"
                disabled={isLoading}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading || !inputVal.trim()}
                className="px-5 py-3 rounded-xl font-bold"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            {/* Quick Action Triggers */}
            <QuickActions
              onCheckWater={() => handleSendMessage('How much water do I have in current inventory?')}
              onScanSupplies={() => setIsPhotoModalOpen(true)}
              onSaveLocation={() => setActiveTab('maps')}
              onAskTip={() => handleSendMessage('Provide emergency water purification guidance.')}
              disabled={isLoading}
            />

            {/* Voice System Error Banner (Mic denied, Audio failed) */}
            {voice.error && (
              <div className="flex items-start justify-between gap-2 rounded-xl border border-echo-rose/50 bg-echo-rose/10 p-2.5 text-xs font-mono text-echo-rose">
                <span>{voice.error.message}</span>
                <span className="flex shrink-0 gap-1.5">
                  {voice.error.code === 'playback_failed' && (
                    <button
                      onClick={() => voice.resumePlayback()}
                      className="rounded-md border border-echo-rose/60 px-2 py-0.5 hover:bg-echo-rose/20"
                    >
                      Enable audio
                    </button>
                  )}
                  <button
                    onClick={voice.clearError}
                    className="rounded-md border border-echo-rose/60 px-2 py-0.5 hover:bg-echo-rose/20"
                  >
                    Dismiss
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Supporting Command Deck: Tabbed Supporting Panels */}
      <section className="w-full max-w-5xl mx-auto space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-echo-surface/80 p-1.5 border border-echo-border rounded-2xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'chat'
                ? 'bg-echo-cyan text-echo-bg shadow-[0_0_15px_rgba(0,229,255,0.45)]'
                : 'text-echo-muted hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>TRANSMISSION LOG ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'inventory'
                ? 'bg-echo-cyan text-echo-bg shadow-[0_0_15px_rgba(0,229,255,0.45)]'
                : 'text-echo-muted hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>SUPPLIES MANIFEST ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'maps'
                ? 'bg-echo-cyan text-echo-bg shadow-[0_0_15px_rgba(0,229,255,0.45)]'
                : 'text-echo-muted hover:text-white'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>GEO-RADAR BEACON</span>
          </button>
        </div>

        {/* Tab View Container */}
        <div className="w-full">
          {activeTab === 'chat' && (
            <ConversationFeed
              messages={messages}
              isLoading={isLoading}
              avatarStatus={avatarStatus}
              inputVal={inputVal}
              onInputChange={setInputVal}
              onSendMessage={handleSendMessage}
              voice={voice}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryList
              items={items}
              summary={summary}
              onAddItem={() => setIsManualAddOpen(true)}
              onScanPhoto={() => setIsPhotoModalOpen(true)}
              onQuantityChange={handleQuantityChange}
              onResetSeed={handleResetSeed}
              onClearAll={handleClearAll}
            />
          )}

          {activeTab === 'maps' && <LocationTracker />}
        </div>
      </section>

      {/* 4. Action Confirmation & Photo Upload Modals */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        scan={scan}
        onLiveAdded={(e) => {
          if (e.category === 'water' && e.waterSafety === 'safety_unknown') {
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
