'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarStatus, EchoError, EchoErrorCode, ChatApiResponse } from '@/types/echo';
import { InventoryService } from '@/lib/inventory/service';
import { parseToolArgs, runGetInventory } from '@/lib/ai/tools';
import { fetchWeather, getBrowserLocation } from '@/lib/ai/weather';
import { answerSealQuestion, answerUnknownItem } from '@/lib/inventory/sealQuestion';
import { answerUserName } from '@/lib/memory/profile';
import { generateId } from '@/lib/utils';

/**
 * ECHO voice session — one interface, two transports:
 *  - 'realtime': OpenAI Realtime over WebRTC (ephemeral token from /api/realtime/session)
 *  - 'pipeline': push-to-talk fallback  mic → /api/voice (STT) → /api/chat → /api/voice (TTS)
 *                (and browser speechSynthesis if the server has no key)
 * The permanent API key never reaches the browser.
 */

export type VoiceMode = 'realtime' | 'pipeline';
export type VoicePreference = 'auto' | VoiceMode;
export type VoiceStatus = 'disconnected' | 'connecting' | 'ready' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface Caption {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  final: boolean;
  at: number;
}

export interface UseEchoVoiceOptions {
  /** 'auto' tries Realtime, falls back to the pipeline. */
  mode?: VoicePreference;
  /** Fired when a caption becomes final (mirror into the chat feed). */
  onCaption?: (c: Caption) => void;
}

export interface EchoVoice {
  mode: VoiceMode | null;
  status: VoiceStatus;
  /** Ready-made mapping for <AvatarVisualizer status=…/> */
  avatarStatus: AvatarStatus;
  captions: Caption[];
  error: EchoError | null;
  /** 0..1 output loudness, ~30 fps — drive the jaw with this. */
  amplitude: number;
  /** Same value without re-render; call inside your own rAF loop. */
  getAmplitude: () => number;
  /** Remote audio stream in realtime mode (null in pipeline mode). */
  playbackStream: MediaStream | null;
  /** The element ECHO's voice plays through (both modes). */
  audioElement: HTMLAudioElement | null;
  isMicHeld: boolean;

  /** Call from a user gesture (button press). Requests mic permission. */
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Push-to-talk: press → start, release → stop. Auto-connects if needed. */
  startTalking: () => Promise<void>;
  stopTalking: () => void;
  /** Typed input — works in both modes and without a microphone. */
  sendText: (text: string) => Promise<void>;
  /** Give ECHO context (e.g. "photo scan proposed 3 bottles"); optionally have it respond aloud. */
  notify: (text: string, opts?: { respond?: boolean }) => void;
  /** ECHO speaks this exact short line (e.g. "Water bottle added."). Queued if ECHO is mid-reply. */
  say: (text: string, opts?: { urgent?: boolean }) => void;
  /** ECHO asks this question in-conversation (so it understands the spoken answer). `context` is hidden guidance. */
  ask: (question: string, context?: string) => void;
  /** Retry audio after an autoplay block ('playback_failed'). Call from a tap. */
  resumePlayback: () => Promise<void>;
  clearError: () => void;
}

const MIN_HOLD_MS = 250;
const CONNECT_TIMEOUT_MS = 12000;

const toAvatar: Record<VoiceStatus, AvatarStatus> = {
  disconnected: 'idle',
  connecting: 'thinking',
  ready: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  error: 'error',
};

function err(code: EchoErrorCode, message: string): EchoError {
  return { code, message };
}

function micError(e: unknown): EchoError {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return err('mic_denied', 'Microphone access was blocked. Allow it in the browser address bar, or type instead.');
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return err('mic_unavailable', 'No microphone found. You can type to ECHO instead.');
  return err('mic_unavailable', 'Microphone could not start. You can type to ECHO instead.');
}

export function useEchoVoice(options: UseEchoVoiceOptions = {}): EchoVoice {
  const preference = options.mode ?? 'auto';
  const onCaptionRef = useRef(options.onCaption);
  onCaptionRef.current = options.onCaption;

  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [status, setStatusState] = useState<VoiceStatus>('disconnected');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [error, setError] = useState<EchoError | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const [playbackStream, setPlaybackStream] = useState<MediaStream | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isMicHeld, setMicHeld] = useState(false);

  const statusRef = useRef<VoiceStatus>('disconnected');
  const modeRef = useRef<VoiceMode | null>(null);
  const captionsRef = useRef<Caption[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdStartRef = useRef(0);
  const releasedRef = useRef(true); // true once the user lets go (even mid-connect)
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const elementSourceConnected = useRef(false);
  const ampRef = useRef(0);
  const synthAmpRef = useRef<number | null>(null); // browser-TTS simulated amplitude
  const connectingRef = useRef<Promise<void> | null>(null);
  const handledCalls = useRef(new Set<string>());
  const responseActiveRef = useRef(false);
  const sayQueueRef = useRef<{ text: string; urgent?: boolean }[]>([]);
  /** Hands-free answer window after ECHO asks a question (no button needed). */
  const awaitingAnswerRef = useRef(false);
  const handsFreeRef = useRef(false);
  const handsFreeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatus = useCallback((s: VoiceStatus) => {
    statusRef.current = s;
    setStatusState(s);
  }, []);

  const fail = useCallback(
    (e: EchoError, fatal = false) => {
      setError(e);
      if (fatal) setStatus('error');
      else if (statusRef.current !== 'disconnected') setStatus('ready');
    },
    [setStatus]
  );

  // ---------- captions ----------
  const upsertCaption = useCallback((id: string, role: Caption['role'], text: string, final: boolean, append = false) => {
    const list = captionsRef.current;
    const idx = list.findIndex((c) => c.id === id);
    let next: Caption[];
    let cap: Caption;
    if (idx >= 0) {
      cap = { ...list[idx], text: append ? list[idx].text + text : text, final };
      next = [...list];
      next[idx] = cap;
    } else {
      cap = { id, role, text, final, at: Date.now() };
      next = [...list, cap].slice(-50);
    }
    captionsRef.current = next;
    setCaptions(next);
    if (final && cap.text.trim()) onCaptionRef.current?.(cap);
  }, []);

  // ---------- audio output + analyser ----------
  const ensureAudio = useCallback(() => {
    if (!audioElRef.current) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElRef.current = el;
      setAudioElement(el);
    }
    if (!ctxRef.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctxRef.current = ctx;
        analyserRef.current = an;
      }
    }
    void ctxRef.current?.resume().catch(() => {});
    return audioElRef.current;
  }, []);

  // amplitude loop
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const buf = new Uint8Array(512);
    const tick = (t: number) => {
      let a = 0;
      if (synthAmpRef.current != null) {
        a = synthAmpRef.current;
      } else if (analyserRef.current && statusRef.current === 'speaking') {
        analyserRef.current.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        a = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      }
      ampRef.current = a;
      if (t - last > 33) {
        last = t;
        setAmplitude((prev) => (Math.abs(prev - a) > 0.02 ? a : prev));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playElement = useCallback(
    async (el: HTMLAudioElement) => {
      try {
        await el.play();
      } catch (e) {
        console.warn('[useEchoVoice] playback blocked', e);
        fail(err('playback_failed', 'Audio playback was blocked. Tap “enable audio” to hear ECHO.'));
      }
    },
    [fail]
  );

  // ---------- mic ----------
  const getMic = useCallback(async (): Promise<MediaStream> => {
    if (micRef.current && micRef.current.getAudioTracks().some((t) => t.readyState === 'live')) return micRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('insecure'), { echo: err('mic_unavailable', 'Microphone needs HTTPS or localhost. You can type instead.') });
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      micRef.current = s;
      return s;
    } catch (e) {
      throw Object.assign(new Error('mic'), { echo: micError(e) });
    }
  }, []);

  // ---------- realtime ----------
  const sendEvent = useCallback((evt: Record<string, unknown>) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === 'open') dc.send(JSON.stringify(evt));
  }, []);

  /** Open the mic with server voice-activity detection so the survivor can just answer out loud. */
  const startHandsFree = () => {
    if (modeRef.current !== 'realtime' || handsFreeRef.current) return;
    handsFreeRef.current = true;
    sendEvent({ type: 'input_audio_buffer.clear' });
    sendEvent({
      type: 'session.update',
      session: {
        type: 'realtime',
        audio: {
          input: {
            turn_detection: { type: 'server_vad', threshold: 0.65, prefix_padding_ms: 300, silence_duration_ms: 800, create_response: true, interrupt_response: true },
          },
        },
      },
    });
    micRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
    setMicHeld(true);
    setStatus('listening');
    handsFreeTimer.current = setTimeout(() => endHandsFree(), 10000); // no answer → close the mic
  };

  /** Back to push-to-talk. */
  const endHandsFree = () => {
    if (!handsFreeRef.current) return;
    handsFreeRef.current = false;
    if (handsFreeTimer.current) clearTimeout(handsFreeTimer.current);
    handsFreeTimer.current = null;
    micRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    setMicHeld(false);
    sendEvent({ type: 'session.update', session: { type: 'realtime', audio: { input: { turn_detection: null } } } });
    if (statusRef.current === 'listening') setStatus('ready');
    setTimeout(flushSay, 0); // play any confirmations that queued while we listened
  };

  /** Out-of-band response: spoken but not added to the conversation history. */
  const sendSay = (text: string, urgent?: boolean) => {
    responseActiveRef.current = true;
    const tone = urgent ? ' Speak with urgency: firm, serious and alarmed, like a safety alarm — clear and slightly faster, stressing the words DO NOT DRINK.' : ' Calm, steady tone.';
    sendEvent({
      type: 'response.create',
      response: {
        conversation: 'none',
        input: [], // no history: ECHO must not drift back to an earlier topic
        output_modalities: ['audio'],
        instructions: `You are a text-to-speech voice. Say exactly this line and nothing else: "${text.replace(/"/g, "'")}".${tone}`,
      },
    });
  };

  /** Play the next queued line if ECHO is free (not replying, not listening). */
  const flushSay = () => {
    if (responseActiveRef.current || statusRef.current === 'listening' || handsFreeRef.current) return;
    const next = sayQueueRef.current.shift();
    if (next) sendSay(next.text, next.urgent);
  };

  const handleRealtimeEvent = useCallback(
    (evt: Record<string, any>) => {
      switch (evt.type) {
        case 'conversation.item.input_audio_transcription.delta': {
          const prev = captionsRef.current.find((c) => c.id === evt.item_id)?.text ?? '';
          upsertCaption(evt.item_id, 'user', (prev === '…' ? '' : prev) + (evt.delta ?? ''), false);
          break;
        }
        case 'conversation.item.input_audio_transcription.completed':
          upsertCaption(evt.item_id, 'user', evt.transcript ?? '', true);
          break;
        case 'response.output_audio_transcript.delta':
        case 'response.audio_transcript.delta':
          upsertCaption(evt.item_id, 'assistant', evt.delta ?? '', false, true);
          break;
        case 'response.output_audio_transcript.done':
        case 'response.audio_transcript.done':
          upsertCaption(evt.item_id, 'assistant', evt.transcript ?? '', true);
          break;
        case 'input_audio_buffer.committed':
          // Placeholder so the user's line sits ABOVE ECHO's reply even if transcription arrives late.
          if (evt.item_id) upsertCaption(evt.item_id, 'user', '…', false);
          break;
        case 'response.created':
          responseActiveRef.current = true;
          if (handsFreeRef.current) endHandsFree(); // the server heard the answer and is replying
          if (statusRef.current !== 'listening') setStatus('thinking');
          break;
        case 'output_audio_buffer.started':
          setStatus('speaking');
          break;
        case 'input_audio_buffer.speech_started':
          if (handsFreeRef.current && handsFreeTimer.current) {
            clearTimeout(handsFreeTimer.current); // they're answering; let them finish
            handsFreeTimer.current = setTimeout(() => endHandsFree(), 15000);
          }
          break;
        case 'output_audio_buffer.stopped':
        case 'output_audio_buffer.cleared':
          if (statusRef.current === 'speaking') setStatus('ready');
          if (awaitingAnswerRef.current && evt.type === 'output_audio_buffer.stopped') {
            awaitingAnswerRef.current = false;
            startHandsFree();
          } else {
            flushSay();
          }
          break;
        case 'response.done': {
          responseActiveRef.current = false;
          setTimeout(flushSay, 0); // after this event's state updates
          const output: any[] = evt.response?.output ?? [];
          const calls = output.filter((o) => o.type === 'function_call' && !handledCalls.current.has(o.call_id));
          if (calls.length) {
            setStatus('thinking');
            calls.forEach((c) => handledCalls.current.add(c.call_id));
            void Promise.all(
              calls.map(async (c) => {
                // Inventory tool reads the PERSISTED store right now — this makes fresh-session recall work.
                const result =
                  c.name === 'get_inventory'
                    ? runGetInventory(InventoryService.list(), parseToolArgs(c.arguments))
                    : c.name === 'get_weather'
                      ? await fetchWeather(await getBrowserLocation())
                      : c.name === 'set_water_sealed'
                        ? answerSealQuestion(parseToolArgs(c.arguments))
                        : c.name === 'add_scanned_item'
                          ? answerUnknownItem(parseToolArgs(c.arguments))
                          : c.name === 'set_user_name'
                            ? answerUserName(parseToolArgs(c.arguments))
                            : { error: `Unknown tool ${c.name}` };
                sendEvent({
                  type: 'conversation.item.create',
                  item: { type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(result) },
                });
              })
            ).then(() => sendEvent({ type: 'response.create' }));
          } else if (evt.response?.status === 'failed') {
            fail(err('provider_error', evt.response?.status_details?.error?.message ?? 'ECHO could not answer. Try again.'));
          } else if (statusRef.current === 'thinking') {
            // No audio was produced (e.g. text-only). Return to ready.
            setStatus('ready');
          }
          break;
        }
        case 'error': {
          const msg: string = evt.error?.message ?? 'Realtime error';
          if (/cancel|no active response|not active/i.test(msg)) break; // harmless barge-in race
          if (/buffer too small|buffer is empty/i.test(msg)) {
            if (statusRef.current === 'thinking') setStatus('ready');
            break; // a too-short press; not worth surfacing
          }
          console.warn('[useEchoVoice] realtime error', evt.error);
          fail(err('provider_error', msg));
          break;
        }
      }
    },
    [fail, sendEvent, setStatus, upsertCaption]
  );

  const teardown = useCallback(() => {
    try {
      dcRef.current?.close();
    } catch {}
    try {
      pcRef.current?.close();
    } catch {}
    dcRef.current = null;
    pcRef.current = null;
    try {
      recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    } catch {}
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    synthAmpRef.current = null;
    setPlaybackStream(null);
    setMicHeld(false);
  }, []);

  const connectRealtime = useCallback(async () => {
    const res = await fetch('/api/realtime/session', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.clientSecret) {
      throw Object.assign(new Error(data.error ?? 'session failed'), {
        echo: err(data.errorCode === 'no_api_key' ? 'no_api_key' : 'connection_failed', data.error ?? 'Could not start voice session.'),
      });
    }

    const el = ensureAudio();
    const mic = await getMic();
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      el.srcObject = stream;
      setPlaybackStream(stream);
      const ctx = ctxRef.current;
      if (ctx && analyserRef.current) {
        try {
          ctx.createMediaStreamSource(stream).connect(analyserRef.current);
        } catch (x) {
          console.warn('[useEchoVoice] analyser attach failed', x);
        }
      }
      void playElement(el);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        if (pcRef.current === pc) fail(err('connection_failed', 'Voice link dropped. Press talk to reconnect.'), true);
      }
    };

    const track = mic.getAudioTracks()[0];
    track.enabled = false; // push-to-talk: muted until held
    pc.addTrack(track, mic);

    const dc = pc.createDataChannel('oai-events');
    dcRef.current = dc;
    dc.onmessage = (m) => {
      try {
        handleRealtimeEvent(JSON.parse(m.data));
      } catch (x) {
        console.warn('[useEchoVoice] bad event', x);
      }
    };
    const opened = new Promise<void>((resolve, reject) => {
      dc.onopen = () => resolve();
      dc.onerror = () => reject(new Error('data channel error'));
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdpRes = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      body: offer.sdp,
      headers: { Authorization: `Bearer ${data.clientSecret}`, 'Content-Type': 'application/sdp' },
    });
    if (!sdpRes.ok) {
      const t = await sdpRes.text().catch(() => '');
      throw Object.assign(new Error(t), { echo: err('connection_failed', `Voice handshake failed (${sdpRes.status}).`) });
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });

    await Promise.race([
      opened,
      new Promise<void>((_, rej) => setTimeout(() => rej(new Error('timeout')), CONNECT_TIMEOUT_MS)),
    ]);
  }, [ensureAudio, fail, getMic, handleRealtimeEvent, playElement]);

  const connect = useCallback(async () => {
    if (connectingRef.current) return connectingRef.current;
    if (statusRef.current !== 'disconnected' && statusRef.current !== 'error') return;

    const run = (async () => {
      teardown(); // drop any dead peer connection before reconnecting
      setError(null);
      setStatus('connecting');
      ensureAudio(); // inside the user gesture → unlocks autoplay

      if (preference !== 'pipeline') {
        try {
          await connectRealtime();
          modeRef.current = 'realtime';
          setMode('realtime');
          setStatus('ready');
          return;
        } catch (e) {
          const echo: EchoError | undefined = (e as { echo?: EchoError }).echo;
          teardown();
          if (preference === 'realtime' || echo?.code === 'mic_denied' || echo?.code === 'mic_unavailable') {
            fail(echo ?? err('connection_failed', 'Realtime voice failed to connect.'), true);
            if (echo?.code === 'mic_denied' || echo?.code === 'mic_unavailable') {
              // typing still works through the pipeline
              modeRef.current = 'pipeline';
              setMode('pipeline');
              setStatus('ready');
            }
            return;
          }
          console.warn('[useEchoVoice] realtime unavailable, using push-to-talk pipeline', e);
        }
      }

      ensureAudio();
      modeRef.current = 'pipeline';
      setMode('pipeline');
      setStatus('ready');
    })();

    connectingRef.current = run;
    try {
      await run;
    } finally {
      connectingRef.current = null;
    }
  }, [connectRealtime, ensureAudio, fail, preference, setStatus, teardown]);

  const disconnect = useCallback(() => {
    teardown();
    modeRef.current = null;
    setMode(null);
    setStatus('disconnected');
  }, [setStatus, teardown]);

  useEffect(() => () => {
    teardown();
    audioElRef.current?.remove();
    void ctxRef.current?.close().catch(() => {});
  }, [teardown]);

  // ---------- pipeline helpers ----------
  const speakPipeline = useCallback(
    async (text: string, urgent?: boolean) => {
      const el = ensureAudio();
      setStatus('speaking');
      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textToSpeak: text, ...(urgent ? { tone: 'urgent' } : {}) }),
        });
        if (!res.ok || !res.headers.get('content-type')?.includes('audio')) throw new Error(`tts ${res.status}`);
        const url = URL.createObjectURL(await res.blob());
        el.srcObject = null;
        el.src = url;
        if (!elementSourceConnected.current && ctxRef.current && analyserRef.current) {
          const src = ctxRef.current.createMediaElementSource(el);
          src.connect(analyserRef.current);
          analyserRef.current.connect(ctxRef.current.destination);
          elementSourceConnected.current = true;
        }
        await new Promise<void>((resolve) => {
          el.onended = () => resolve();
          el.onerror = () => resolve();
          playElement(el).then(() => {
            if (el.paused) resolve();
          });
        });
        URL.revokeObjectURL(url);
      } catch (e) {
        // Server TTS unavailable → browser speech synthesis with simulated amplitude.
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          await new Promise<void>((resolve) => {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 1.05;
            u.pitch = 0.95;
            const start = performance.now();
            const iv = setInterval(() => {
              const t = (performance.now() - start) / 1000;
              synthAmpRef.current = Math.max(0.1, Math.min(1, 0.45 + Math.sin(t * 14) * 0.35 + Math.sin(t * 23) * 0.2));
            }, 33);
            const done = () => {
              clearInterval(iv);
              synthAmpRef.current = null;
              resolve();
            };
            u.onend = done;
            u.onerror = () => {
              done();
              fail(err('playback_failed', 'Speech playback failed. Read the caption instead.'));
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(u);
          });
        } else {
          fail(err('playback_failed', 'This browser cannot play speech. Read the caption instead.'));
        }
      } finally {
        if (statusRef.current === 'speaking') setStatus('ready');
      }
    },
    [ensureAudio, fail, playElement, setStatus]
  );

  const pipelineTurn = useCallback(
    async (text: string) => {
      setStatus('thinking');
      try {
        const history = captionsRef.current
          .filter((c) => c.final)
          .slice(-10)
          .map((c) => ({ id: c.id, role: c.role, content: c.text, timestamp: c.at }));
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history, inventorySnapshot: InventoryService.list() }),
        });
        const data = (await res.json()) as ChatApiResponse;
        if (!res.ok || !data.success) throw new Error(data.error ?? `chat ${res.status}`);
        upsertCaption(generateId('cap'), 'assistant', data.reply, true);
        await speakPipeline(data.speechText || data.reply);
      } catch (e) {
        console.error('[useEchoVoice] turn failed', e);
        fail(err('provider_error', 'ECHO could not answer. Check the connection and try again.'));
      }
    },
    [fail, setStatus, speakPipeline, upsertCaption]
  );

  // ---------- push-to-talk ----------
  const startTalking = useCallback(async () => {
    releasedRef.current = false;
    if (statusRef.current === 'disconnected' || statusRef.current === 'error') await connect();
    if (statusRef.current === 'disconnected' || statusRef.current === 'error') return;
    // Released while connecting / answering the mic permission prompt → don't open the mic.
    if (releasedRef.current) return;
    setError(null);
    holdStartRef.current = performance.now();

    if (modeRef.current === 'realtime') {
      if (handsFreeRef.current) endHandsFree();
      awaitingAnswerRef.current = false;
      // barge-in: stop ECHO talking
      if (statusRef.current === 'speaking' || statusRef.current === 'thinking') {
        if (responseActiveRef.current) sendEvent({ type: 'response.cancel' });
        sendEvent({ type: 'output_audio_buffer.clear' });
      }
      sendEvent({ type: 'input_audio_buffer.clear' });
      micRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
      setMicHeld(true);
      setStatus('listening');
      return;
    }

    // pipeline
    window.speechSynthesis?.cancel();
    audioElRef.current?.pause();
    try {
      const mic = await getMic();
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported?.(m));
      if (releasedRef.current) return; // let go during the permission prompt
      const rec = new MediaRecorder(mic, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.start();
      recorderRef.current = rec;
      setMicHeld(true);
      setStatus('listening');
    } catch (e) {
      fail((e as { echo?: EchoError }).echo ?? micError(e));
    }
  }, [connect, fail, getMic, sendEvent, setStatus]);

  const stopTalking = useCallback(() => {
    releasedRef.current = true;
    if (!isMicHeldRef(recorderRef, micRef, modeRef)) return;
    const held = performance.now() - holdStartRef.current;
    setMicHeld(false);

    if (modeRef.current === 'realtime') {
      // small tail so the last syllable isn't clipped
      setTimeout(() => {
        micRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
        if (held < MIN_HOLD_MS) {
          sendEvent({ type: 'input_audio_buffer.clear' });
          setStatus('ready');
          return;
        }
        sendEvent({ type: 'input_audio_buffer.commit' });
        sendEvent({ type: 'response.create' });
        setStatus('thinking');
      }, 200);
      return;
    }

    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;
    rec.onstop = async () => {
      recorderRef.current = null;
      if (held < MIN_HOLD_MS) return setStatus('ready');
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
      setStatus('thinking');
      try {
        const form = new FormData();
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        form.append('audio', blob, `speech.${ext}`);
        const res = await fetch('/api/voice', { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          return fail(
            data.errorCode === 'no_api_key'
              ? err('no_api_key', 'Voice input is not configured on the server. Type your message instead.')
              : err('provider_error', 'Could not transcribe that. Try again or type.')
          );
        }
        const text: string = (data.transcription ?? '').trim();
        if (!text) return fail(err('provider_error', "I didn't catch that. Hold the button and speak again."));
        upsertCaption(generateId('cap'), 'user', text, true);
        await pipelineTurn(text);
      } catch (e) {
        console.error('[useEchoVoice] transcription failed', e);
        fail(err('connection_failed', 'Network error while sending audio.'));
      }
    };
    setTimeout(() => rec.state === 'recording' && rec.stop(), 150);
  }, [fail, pipelineTurn, sendEvent, setStatus, upsertCaption]);

  // ---------- typed input / context ----------
  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      if (statusRef.current === 'disconnected' || statusRef.current === 'error') await connect();
      setError(null);
      if (modeRef.current === 'realtime' && dcRef.current?.readyState === 'open') {
        if (statusRef.current === 'speaking' || statusRef.current === 'thinking') {
          if (responseActiveRef.current) sendEvent({ type: 'response.cancel' });
          sendEvent({ type: 'output_audio_buffer.clear' });
        }
        const id = generateId('cap');
        upsertCaption(id, 'user', text, true);
        sendEvent({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
        sendEvent({ type: 'response.create' });
        setStatus('thinking');
        return;
      }
      upsertCaption(generateId('cap'), 'user', text, true);
      await pipelineTurn(text);
    },
    [connect, pipelineTurn, sendEvent, setStatus, upsertCaption]
  );

  const notify = useCallback(
    (text: string, opts: { respond?: boolean } = {}) => {
      if (modeRef.current === 'realtime') {
        sendEvent({ type: 'conversation.item.create', item: { type: 'message', role: 'system', content: [{ type: 'input_text', text }] } });
        if (opts.respond) {
          sendEvent({ type: 'response.create' });
          setStatus('thinking');
        }
      } else if (opts.respond) {
        void pipelineTurn(text);
      }
    },
    [pipelineTurn, sendEvent, setStatus]
  );

  const ask = useCallback(
    async (question: string, context?: string) => {
      if (statusRef.current === 'disconnected' || statusRef.current === 'error') await connect();
      if (modeRef.current === 'realtime' && dcRef.current?.readyState === 'open') {
        // The model needs to know what was asked so it understands the spoken answer.
        sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'system',
            content: [{ type: 'input_text', text: `You just asked the survivor: "${question}". ${context ?? ''} Only answer about this question.` }],
          },
        });
        if (responseActiveRef.current) sendEvent({ type: 'response.cancel' });
        sayQueueRef.current = []; // stale confirmations would talk over the question
        awaitingAnswerRef.current = true; // open the mic when the question finishes playing
        sendSay(question);
        return;
      }
      upsertCaption(generateId('cap'), 'assistant', question, true);
      void speakPipeline(question);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connect, speakPipeline, upsertCaption]
  );

  const say = useCallback(
    async (text: string, opts: { urgent?: boolean } = {}) => {
      // Connect the live session first so confirmations use ECHO's real voice.
      if (statusRef.current === 'disconnected' || statusRef.current === 'error') await connect();
      if (modeRef.current === 'realtime' && dcRef.current?.readyState === 'open') {
        if (responseActiveRef.current || statusRef.current === 'listening') sayQueueRef.current.push({ text, urgent: opts.urgent });
        else sendSay(text, opts.urgent);
        return;
      }
      // Pipeline or not connected yet: server TTS (falls back to browser speech).
      upsertCaption(generateId('cap'), 'assistant', text, true);
      void speakPipeline(text, opts.urgent);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connect, speakPipeline, upsertCaption]
  );

  const resumePlayback = useCallback(async () => {
    await ctxRef.current?.resume().catch(() => {});
    if (audioElRef.current) {
      try {
        await audioElRef.current.play();
        setError((e) => (e?.code === 'playback_failed' ? null : e));
      } catch {
        fail(err('playback_failed', 'Audio is still blocked. Check the tab is not muted.'));
      }
    }
  }, [fail]);

  const clearError = useCallback(() => {
    setError(null);
    if (statusRef.current === 'error') setStatus(modeRef.current ? 'ready' : 'disconnected');
  }, [setStatus]);

  const getAmplitude = useCallback(() => ampRef.current, []);

  return useMemo(
    () => ({
      mode,
      status,
      avatarStatus: toAvatar[status],
      captions,
      error,
      amplitude,
      getAmplitude,
      playbackStream,
      audioElement,
      isMicHeld,
      connect,
      disconnect,
      startTalking,
      stopTalking,
      sendText,
      notify,
      say,
      ask,
      resumePlayback,
      clearError,
    }),
    [mode, status, captions, error, amplitude, getAmplitude, playbackStream, audioElement, isMicHeld, connect, disconnect, startTalking, stopTalking, sendText, notify, say, ask, resumePlayback, clearError]
  );
}

function isMicHeldRef(
  rec: React.RefObject<MediaRecorder | null>,
  mic: React.RefObject<MediaStream | null>,
  mode: React.RefObject<VoiceMode | null>
): boolean {
  if (mode.current === 'realtime') return !!mic.current?.getAudioTracks().some((t) => t.enabled);
  return rec.current?.state === 'recording';
}
