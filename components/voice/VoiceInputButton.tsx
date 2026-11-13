'use client';

import React from 'react';
import { Mic, MicOff, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import type { AvatarStatus, EchoError } from '@/types/echo';
import type { EchoVoice } from '@/hooks/useEchoVoice';
import { usePushToTalkTranscriber } from '@/hooks/usePushToTalkTranscriber';

interface VoiceInputButtonProps {
  /**
   * Full mode: pass the object from useEchoVoice() — ECHO hears and replies aloud itself.
   * Legacy mode: omit `voice` and pass `onTranscript` — the button only transcribes speech and
   * hands you the text (e.g. into sendMessage), matching the scaffold's original props.
   */
  voice?: EchoVoice;
  onTranscript?: (text: string) => void;
  /** Legacy prop, accepted for compatibility (unused). */
  status?: AvatarStatus;
  disabled?: boolean;
  className?: string;
}

/** Push-to-talk: hold (pointer, or Space/Enter while focused) to speak, release to send. */
export function VoiceInputButton({ voice, onTranscript, disabled = false, className }: VoiceInputButtonProps) {
  const ptt = usePushToTalkTranscriber(onTranscript ?? (() => {}));

  const held = voice ? voice.isMicHeld : ptt.state === 'recording';
  const busy = voice ? voice.status === 'connecting' : false;
  const processing = voice ? voice.status === 'thinking' : ptt.state === 'transcribing';
  const error: EchoError | null = voice ? voice.error : ptt.error;
  const blocked = error?.code === 'mic_denied' || error?.code === 'mic_unavailable';

  const press = (e: React.PointerEvent | React.KeyboardEvent) => {
    if (disabled || blocked) return;
    if ('pointerId' in e) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
    void (voice ? voice.startTalking() : ptt.start());
  };
  const release = (e: React.PointerEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (voice) voice.stopTalking();
    else ptt.stop();
  };

  const label = blocked
    ? 'MIC BLOCKED — TYPE'
    : busy
      ? 'CONNECTING…'
      : held
        ? 'LISTENING… RELEASE'
        : processing
          ? 'PROCESSING…'
          : 'HOLD TO TALK';

  return (
    <Button
      type="button"
      variant={held ? 'danger' : 'secondary'}
      size="md"
      disabled={disabled || blocked}
      aria-pressed={held}
      aria-label="Hold to talk to ECHO"
      title={error?.message}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && press(e)}
      onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && release(e)}
      className={`relative select-none touch-none transition-all duration-200 ${
        held
          ? 'bg-echo-rose text-white shadow-[0_0_15px_rgba(244,63,94,0.6)]'
          : 'border-echo-cyan/40 text-echo-cyan hover:bg-echo-cyan/10'
      } ${className ?? ''}`}
    >
      {busy || processing ? (
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
      ) : blocked || error ? (
        <AlertTriangle className="w-4 h-4 mr-1.5" />
      ) : held ? (
        <MicOff className="w-4 h-4 mr-1.5" />
      ) : (
        <Mic className="w-4 h-4 mr-1.5" />
      )}
      <span>{label}</span>
    </Button>
  );
}
