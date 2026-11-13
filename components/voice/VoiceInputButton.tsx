'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { AvatarStatus } from '@/types/echo';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  status: AvatarStatus;
  disabled?: boolean;
}

export function VoiceInputButton({
  onTranscript,
  status,
  disabled = false,
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);

  // Fallback demo speech toggle
  const toggleRecording = () => {
    if (disabled) return;
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Simulate quick voice capture for demo fallback
      setTimeout(() => {
        setIsRecording(false);
        onTranscript('How much water do I have in current inventory?');
      }, 1800);
    }
  };

  return (
    <Button
      variant={isRecording ? 'danger' : 'secondary'}
      size="md"
      onClick={toggleRecording}
      disabled={disabled}
      className={`relative transition-all duration-300 ${
        isRecording
          ? 'bg-echo-rose text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
          : 'border-echo-cyan/40 text-echo-cyan hover:bg-echo-cyan/10'
      }`}
    >
      {isRecording ? (
        <>
          <MicOff className="w-4 h-4 mr-1.5 animate-spin" />
          <span>LISTENING...</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4 mr-1.5 text-echo-cyan" />
          <span>VOICE COMMAND</span>
        </>
      )}
    </Button>
  );
}
