'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EchoError } from '@/types/echo';

/**
 * Live camera viewfinder (laptop webcam or phone rear camera) → JPEG data URL.
 * Works on desktop, where <input capture> only opens a file picker.
 * Needs HTTPS or localhost.
 */
export function useCameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<EchoError | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setStarting(false);
  }, []);

  useEffect(() => stop, [stop]);

  // The <video> only mounts once `active` is true, so attach the stream after that render.
  useEffect(() => {
    const v = videoRef.current;
    if (active && v && streamRef.current && v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current;
      void v.play().catch(() => {});
    }
  }, [active]);

  /** Returns false if the camera can't be used (caller can fall back to a file picker). */
  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({ code: 'mic_unavailable', message: 'Camera needs HTTPS or localhost. Use "Upload image" instead.' });
      return false;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
      return true;
    } catch (e) {
      const name = (e as { name?: string }).name;
      setError({
        code: name === 'NotAllowedError' ? 'mic_denied' : 'mic_unavailable',
        message:
          name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow it in the address bar, or use "Upload image".'
            : 'No camera found. Use "Upload image" instead.',
      });
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  /** Current frame as a small JPEG data URL; the camera stays on (live scanning). */
  const grabFrame = useCallback((maxDim = 640): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || v.readyState < 2) return null;
    const scale = Math.min(1, maxDim / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  /** Grab the current frame as a JPEG data URL and turn the camera off. */
  const capture = useCallback((): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    const url = canvas.toDataURL('image/jpeg', 0.9);
    stop();
    return url;
  }, [stop]);

  return { videoRef, active, starting, error, start, capture, grabFrame, stop, clearError: () => setError(null) };
}
