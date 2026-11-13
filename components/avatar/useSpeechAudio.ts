'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setVoiceSupported(true);
    }
  }, []);

  const speak = useCallback(
    (text: string, onEndCallback?: () => void) => {
      if (!text || typeof window === 'undefined' || !('speechSynthesis' in window) || !speechEnabled) {
        if (onEndCallback) setTimeout(onEndCallback, 2500);
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95; // Slightly robotic/synthetic AI tone

      // Pick a suitable English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural') || v.name.includes('Daniel'))
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      setIsSpeaking(true);

      // Synthesize realistic speech amplitude wave
      const startTime = Date.now();
      const animateAmplitude = () => {
        if (!window.speechSynthesis.speaking) {
          setAmplitude(0);
          setIsSpeaking(false);
          return;
        }

        const elapsed = (Date.now() - startTime) / 1000;
        // Natural speech cadence simulation with syllable bursts and brief pauses
        const syllableCadence = Math.sin(elapsed * 14) * 0.4 + Math.sin(elapsed * 22) * 0.3;
        const breathModulation = Math.sin(elapsed * 2) * 0.2;
        const rawAmp = Math.max(0.15, Math.min(1.0, 0.4 + syllableCadence + breathModulation));
        
        setAmplitude(rawAmp);
        animationFrameRef.current = requestAnimationFrame(animateAmplitude);
      };

      utterance.onstart = () => {
        setIsSpeaking(true);
        animationFrameRef.current = requestAnimationFrame(animateAmplitude);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setAmplitude(0);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setAmplitude(0);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    },
    [speechEnabled]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setAmplitude(0);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  return {
    isSpeaking,
    amplitude,
    voiceSupported,
    speechEnabled,
    setSpeechEnabled,
    speak,
    stop,
  };
}
