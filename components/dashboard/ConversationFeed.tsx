'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage, EchoAction, AvatarStatus } from '@/types/echo';
import { Card, Button, Badge } from '@/components/ui';
import { Terminal, Send, Volume2, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';

interface ConversationFeedProps {
  messages: ChatMessage[];
  isLoading: boolean;
  avatarStatus: AvatarStatus;
  inputVal: string;
  onInputChange: (val: string) => void;
  onSendMessage: (text: string) => void;
  onPlaySpeech?: (text: string) => void;
  onAuthorizeAction?: (action: EchoAction) => void;
}

export function ConversationFeed({
  messages,
  isLoading,
  avatarStatus,
  inputVal,
  onInputChange,
  onSendMessage,
  onPlaySpeech,
  onAuthorizeAction,
}: ConversationFeedProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    onSendMessage(inputVal);
  };

  const samplePrompts = [
    'How much water do I have?',
    'Scan +3 water bottles into inventory',
    'Report radiation status in Sector 4',
    'Emergency water purification protocol',
  ];

  return (
    <Card className="flex flex-col h-80 sm:h-96 bg-echo-surface/90 border-echo-border">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-echo-border mb-2 text-xs font-mono">
        <div className="flex items-center space-x-2 text-echo-cyan">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-wider uppercase">COMM-LINK TRANSMISSION</span>
        </div>
        <div className="flex items-center space-x-1 text-echo-emerald text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-echo-emerald animate-ping" />
          <span>ENCRYPTED</span>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none">
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(prompt)}
            disabled={isLoading}
            className="shrink-0 text-[10px] font-mono px-2 py-1 rounded-md bg-echo-bg/70 border border-echo-border text-echo-muted hover:text-echo-cyan hover:border-echo-cyan/40 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1.5 text-xs font-mono"
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Message Header / Timestamp */}
              <div className="flex items-center space-x-1.5 text-[10px] text-echo-muted mb-1">
                <span className={`font-bold ${isUser ? 'text-echo-cyan' : 'text-echo-emerald'}`}>
                  {isUser ? 'SURVIVOR [CALL-SIGN 01]' : 'ECHO ONBOARD AI'}
                </span>
                <span>•</span>
                <span>{new Date(m.timestamp).toLocaleTimeString().split(' ')[0]}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[88%] rounded-xl p-3 relative transition-all duration-200 ${
                  isUser
                    ? 'bg-echo-cyan/15 border border-echo-cyan/40 text-echo-text rounded-tr-none'
                    : 'bg-echo-bg/80 border border-echo-border hover:border-echo-cyan/40 text-white rounded-tl-none shadow-md'
                }`}
              >
                <div className="leading-relaxed">{m.content}</div>

                {/* Inline Action Proposal Card */}
                {m.proposedAction && onAuthorizeAction && (
                  <div className="mt-2.5 pt-2 border-t border-echo-border/80 flex items-center justify-between gap-2 bg-echo-surface/60 p-2 rounded-lg">
                    <div className="flex items-center space-x-1.5 text-[11px] text-echo-cyan font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-echo-cyan shrink-0" />
                      <span>
                        {m.proposedAction.type === 'inventory_update'
                          ? `Proposed: +${m.proposedAction.item.quantity} ${m.proposedAction.item.name}`
                          : 'Proposed System Action'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onAuthorizeAction(m.proposedAction!)}
                      className="text-[10px] py-1 px-2.5 h-auto shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Authorize
                    </Button>
                  </div>
                )}

                {/* Audio Playback Trigger for ECHO Responses */}
                {!isUser && onPlaySpeech && (
                  <div className="mt-1.5 flex justify-end">
                    <button
                      onClick={() => onPlaySpeech(m.speechText || m.content)}
                      className="flex items-center space-x-1 text-[10px] text-echo-muted hover:text-echo-cyan transition-colors"
                      title="Replay Voice Synthesis"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>PLAY VOICE</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Thinking Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-1">
            <span className="text-[10px] font-mono text-echo-purple font-bold">
              ECHO AI // COMPUTING
            </span>
            <div className="bg-echo-surface border border-echo-purple/40 rounded-xl rounded-tl-none p-3 text-echo-purple flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-echo-purple animate-ping" />
              <span className="text-xs font-mono">Synthesizing tactical response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Bar Form */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-echo-border flex gap-2 items-center">
        <VoiceInputButton
          onTranscript={(text) => onSendMessage(text)}
          status={avatarStatus}
          disabled={isLoading}
        />

        <input
          type="text"
          value={inputVal}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Command ECHO (e.g. 'How much water do I have?')..."
          className="flex-1 bg-echo-bg/80 border border-echo-border focus:border-echo-cyan focus:outline-none focus:ring-1 focus:ring-echo-cyan rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-echo-muted transition-all"
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isLoading || !inputVal.trim()}
          className="px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
