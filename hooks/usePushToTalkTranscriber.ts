'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EchoError } from '@/types/echo';

/**
 * Minimal push-to-talk → text (via /api/voice). Used by VoiceInputButton's legacy
 * `onTranscript` mode so existing UI gets real speech input with zero rewiring.
 */
export function usePushToTalkTranscriber(onTranscript: (text: string) => void) {
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [error, setError] = useState<EchoError | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cb = useRef(onTranscript);
  cb.current = onTranscript;

  useEffect(() => () => micRef.current?.getTracks().forEach((t) => t.stop()), []);

  const start = useCallback(async () => {
    if (recRef.current) return;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ code: 'mic_unavailable', message: 'Microphone needs HTTPS or localhost. Type instead.' });
      return;
    }
    try {
      if (!micRef.current || !micRef.current.active) {
        micRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      }
    } catch (e) {
      const denied = (e as { name?: string }).name === 'NotAllowedError';
      setError({
        code: denied ? 'mic_denied' : 'mic_unavailable',
        message: denied ? 'Microphone access was blocked. Allow it in the address bar, or type instead.' : 'No microphone available. Type instead.',
      });
      return;
    }
    window.speechSynthesis?.cancel();
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported?.(m));
    const rec = new MediaRecorder(micRef.current, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.start();
    recRef.current = rec;
    startedAt.current = performance.now();
    setState('recording');
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    recRef.current = null;
    const held = performance.now() - startedAt.current;
    rec.onstop = async () => {
      if (held < 250) return setState('idle');
      setState('transcribing');
      try {
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, `speech.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`);
        const res = await fetch('/api/voice', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setError(
            data.errorCode === 'no_api_key'
              ? { code: 'no_api_key', message: 'Voice input is not configured on the server. Type instead.' }
              : { code: 'provider_error', message: 'Could not transcribe that. Try again or type.' }
          );
        } else if (data.transcription?.trim()) {
          cb.current(data.transcription.trim());
        } else {
          setError({ code: 'provider_error', message: "Didn't catch that — hold and speak again." });
        }
      } catch {
        setError({ code: 'connection_failed', message: 'Network error while sending audio.' });
      } finally {
        setState('idle');
      }
    };
    setTimeout(() => rec.state === 'recording' && rec.stop(), 150);
  }, []);

  return { state, error, start, stop, clearError: () => setError(null) };
}
