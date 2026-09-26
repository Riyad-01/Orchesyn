'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EngineCapabilities, SpeechCapture } from '@/types';
import type { EngineError } from '@/lib/speech/engine';
import { createEngine, detectCapabilities, microphoneAvailable, type SpeechEngine } from '@/lib/speech';

export type RecorderPhase =
  | 'idle'
  | 'requesting' // waiting on the permission prompt
  | 'recording'
  | 'paused' // recording suspended; transcript kept, clock frozen
  | 'analysing'
  | 'done'
  | 'error';

export interface UseRecorderOptions {
  /** hard stop, in ms. 0 = no limit */
  maxMs?: number;
  language?: string;
  /** fired when the timer reaches maxMs, before the capture is returned */
  onAutoStop?: () => void;
  onError?: (error: EngineError) => void;
}

export interface UseRecorder {
  phase: RecorderPhase;
  capabilities: EngineCapabilities;
  micAvailable: boolean | null;
  /** 0..1 live microphone level */
  level: number;
  /** rolling loudness curve for the waveform */
  levels: number[];
  /** live interim transcript */
  interim: string;
  /** confirmed transcript so far */
  transcript: string;
  elapsedMs: number;
  error: EngineError | null;
  canRecord: boolean;
  start: () => Promise<void>;
  /** suspend recording: freezes the clock, keeps the transcript */
  pause: () => void;
  /** continue a paused recording */
  resume: () => Promise<void>;
  stop: () => Promise<SpeechCapture | null>;
  cancel: () => void;
  reset: () => void;
  /** the capture produced by the last stop()/auto-stop/submitTyped — for effects that fire on phase 'done' */
  getCapture: () => SpeechCapture | null;
  /** raw mic audio from the last recording (for cloud ASR), null when unavailable */
  getAudioBlob: () => Blob | null;
  /** typed fallback for browsers with no speech recognition */
  submitTyped: (text: string, seconds: number) => SpeechCapture;
}

/**
 * Drives a speaking session: permissions, the engine, the clock, the level meter
 * and the live transcript. Every screen that records goes through this hook so
 * the behaviour is identical in impromptu, coach, drills and IELTS mocks.
 */
export function useRecorder(options: UseRecorderOptions = {}): UseRecorder {
  const { maxMs = 60000, language = 'en-US', onAutoStop, onError } = options;

  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [capabilities, setCapabilities] = useState<EngineCapabilities>(() => detectCapabilities());
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  const [level, setLevel] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<EngineError | null>(null);

  const engineRef = useRef<SpeechEngine | null>(null);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelsRef = useRef<number[]>([]);
  const stoppedByTimerRef = useRef(false);
  const captureRef = useRef<SpeechCapture | null>(null);
  /* pause/resume bookkeeping */
  const phaseRef = useRef<RecorderPhase>('idle');
  const pausedTotalRef = useRef(0); // ms spent paused, excluded from the clock
  const pauseStartRef = useRef(0);
  const prefixRef = useRef(''); // transcript captured before the current recognition run
  const transcriptRef = useRef(''); // mirror of the transcript state for handlers
  const elapsedRef = useRef(0); // mirror of elapsedMs for stale-closure-safe stop()
  const engineKindRef = useRef<SpeechCapture['engine']>('web-speech');
  phaseRef.current = phase;
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const mediaArmedRef = useRef(false);
  const sharedStreamRef = useRef<MediaStream | null>(null);

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  useEffect(() => {
    setCapabilities(detectCapabilities());
    let cancelled = false;
    void microphoneAvailable().then((ok) => {
      if (!cancelled) setMicAvailable(ok);
    });
    return () => {
      cancelled = true;
      clearTick();
      engineRef.current?.cancel();
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript('');
    setInterim('');
    setLevels([]);
    levelsRef.current = [];
    setElapsedMs(0);
    setLevel(0);
    stoppedByTimerRef.current = false;
    captureRef.current = null;
    pausedTotalRef.current = 0;
    pauseStartRef.current = 0;
    prefixRef.current = '';
    transcriptRef.current = '';
    elapsedRef.current = 0;

    const engine = createEngine();
    if (!engine) {
      const next = detectCapabilities();
      setCapabilities(next);
      const err: EngineError = {
        code: 'unsupported',
        message: next.reason ?? 'Speech recognition is not available in this browser.',
        recoverable: false,
      };
      setError(err);
      setPhase('error');
      onError?.(err);
      return;
    }
    engineRef.current = engine;
    engineKindRef.current = engine.kind;
    setPhase('requesting');

    /* ONE shared mic stream for recognition + level meter + MediaRecorder.
     * A second concurrent getUserMedia is a classic Android flakiness source. */
    let shared: MediaStream;
    try {
      shared = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (err) {
      const e: EngineError = {
        code: 'permission-denied',
        message: (err as Error)?.message ?? 'Could not access the microphone.',
        recoverable: true,
      };
      setError(e);
      setPhase('error');
      onError?.(e);
      return;
    }
    sharedStreamRef.current = shared;

    try {
      await engine.start({
        language,
        stream: shared,
        onLevel: (value) => {
          setLevel(value);
          levelsRef.current.push(value);
          // throttle state updates so the waveform does not re-render 20x a second per point
          if (levelsRef.current.length % 2 === 0) setLevels([...levelsRef.current.slice(-200)]);
        },
        onInterim: (text) => {
          const full = prefixRef.current ? `${prefixRef.current} ${text}` : text;
          setInterim(text);
          setTranscript(full);
          transcriptRef.current = full;
        },
        onError: (err) => {
          setError(err);
          onError?.(err);
          if (err.code === 'permission-denied') setPhase('error');
        },
      });
    } catch (err) {
      shared.getTracks().forEach((t) => t.stop());
      sharedStreamRef.current = null;
      const e: EngineError = {
        code: 'permission-denied',
        message: (err as Error)?.message ?? 'Could not access the microphone.',
        recoverable: true,
      };
      setError(e);
      setPhase('error');
      onError?.(e);
      return;
    }

    /* raw audio for optional cloud ASR (Whisper) from the SAME stream */
    audioBlobRef.current = null;
    mediaChunksRef.current = [];
    mediaArmedRef.current = true;
    if (typeof MediaRecorder !== 'undefined') {
      const rec = new MediaRecorder(shared);
      mediaRecRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) mediaChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        audioBlobRef.current = new Blob(mediaChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        shared.getTracks().forEach((t) => t.stop());
        sharedStreamRef.current = null;
      };
      try {
        rec.start(500);
      } catch {
        /* ignore */
      }
    }

    setPhase('recording');
    startedAtRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current - pausedTotalRef.current;
      elapsedRef.current = elapsed;
      setElapsedMs(elapsed);
      if (maxMs > 0 && elapsed >= maxMs && !stoppedByTimerRef.current) {
        stoppedByTimerRef.current = true;
        onAutoStop?.();
        void stopInternal();
      }
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, maxMs, onAutoStop, onError]);

  const stopInternal = useCallback(async (): Promise<SpeechCapture | null> => {
    clearTick();
    mediaArmedRef.current = false;
    const rec = mediaRecRef.current;
    if (rec && rec.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        rec.addEventListener('stop', () => resolve(), { once: true });
        try {
          rec.stop();
        } catch {
          resolve();
        }
      });
    }
    mediaRecRef.current = null;
    const engine = engineRef.current;
    if (!engine) return null;
    setPhase('analysing');
    const capture = await engine.stop();
    captureRef.current = capture;
    setTranscript(capture.transcript);
    transcriptRef.current = capture.transcript;
    setInterim('');
    setLevel(0);
    setPhase('done');
    return capture;
  }, []);

  /**
   * Pause: Web Speech has no native pause, so we snapshot the transcript, cancel
   * recognition and freeze the clock. Resume starts a fresh recognition run and
   * prefixes its output with the snapshot — the learner sees one continuous text.
   */
  const pause = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    clearTick();
    try {
      mediaRecRef.current?.pause();
    } catch {
      /* ignore */
    }
    pauseStartRef.current = Date.now();
    prefixRef.current = transcriptRef.current.trim();
    setInterim('');
    setLevel(0);
    engineRef.current?.cancel();
    engineRef.current = null;
    setPhase('paused');
  }, []);

  const resume = useCallback(async () => {
    if (phaseRef.current !== 'paused') return;
    pausedTotalRef.current += Date.now() - pauseStartRef.current;
    try {
      mediaRecRef.current?.resume();
    } catch {
      /* ignore */
    }
    const engine = createEngine();
    if (!engine) {
      const err: EngineError = {
        code: 'unsupported',
        message: 'Speech recognition became unavailable. Finish with what you have.',
        recoverable: true,
      };
      setError(err);
      onError?.(err);
      return;
    }
    engineRef.current = engine;
    engineKindRef.current = engine.kind;
    try {
      await engine.start({
        language,
        stream: sharedStreamRef.current ?? undefined,
        onLevel: (value) => {
          setLevel(value);
          levelsRef.current.push(value);
          if (levelsRef.current.length % 2 === 0) setLevels([...levelsRef.current.slice(-200)]);
        },
        onInterim: (text) => {
          const full = prefixRef.current ? `${prefixRef.current} ${text}` : text;
          setInterim(text);
          setTranscript(full);
          transcriptRef.current = full;
        },
        onError: (err) => {
          setError(err);
          onError?.(err);
          if (err.code === 'permission-denied') setPhase('error');
        },
      });
    } catch (err) {
      const e: EngineError = {
        code: 'permission-denied',
        message: (err as Error)?.message ?? 'Could not resume microphone access.',
        recoverable: true,
      };
      setError(e);
      setPhase('error');
      onError?.(e);
      return;
    }
    setPhase('recording');
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current - pausedTotalRef.current;
      elapsedRef.current = elapsed;
      setElapsedMs(elapsed);
      if (maxMs > 0 && elapsed >= maxMs && !stoppedByTimerRef.current) {
        stoppedByTimerRef.current = true;
        onAutoStop?.();
        void stopInternal();
      }
    }, 100);
  }, [language, maxMs, onAutoStop, onError, stopInternal]);

  /** Stop. When paused there is no live engine, so the capture is built from the snapshot. */
  const stop = useCallback(async (): Promise<SpeechCapture | null> => {
    // idempotent: UI buttons and the save-effect may both call stop()
    if (phaseRef.current === 'done' || phaseRef.current === 'analysing') {
      return captureRef.current;
    }
    if (phaseRef.current === 'paused') {
      // release the mic: finalising the recorder stops the shared tracks
      try {
        mediaRecRef.current?.stop();
      } catch {
        /* ignore */
      }
      mediaRecRef.current = null;
      const text = (prefixRef.current || transcriptRef.current).trim();
      const durationMs = Math.max(1000, elapsedRef.current);
      const words = text.split(/\s+/).filter(Boolean);
      const per = durationMs / Math.max(words.length, 1);
      const capture: SpeechCapture = {
        transcript: text,
        words: words.map((word, i) => ({
          word,
          startMs: Math.round(i * per),
          endMs: Math.round(i * per + per * 0.78),
          confidence: -1,
        })),
        segments: [],
        audio: {
          durationMs,
          avgLoudness: -1,
          peakLoudness: -1,
          silenceMs: 0,
          envelope: levelsRef.current.slice(-200),
          clipped: false,
        },
        engine: engineKindRef.current,
        latencyMs: 0,
        typedFallback: false,
      };
      captureRef.current = capture;
      setTranscript(text);
      setPhase('done');
      return capture;
    }
    return stopInternal();
  }, [stopInternal]);

  const cancel = useCallback(() => {
    clearTick();
    engineRef.current?.cancel();
    engineRef.current = null;
    sharedStreamRef.current?.getTracks().forEach((t) => t.stop());
    sharedStreamRef.current = null;
    setPhase('idle');
    setLevel(0);
    setTranscript('');
    setInterim('');
    setElapsedMs(0);
    pausedTotalRef.current = 0;
    prefixRef.current = '';
    transcriptRef.current = '';
    elapsedRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    clearTick();
    sharedStreamRef.current?.getTracks().forEach((t) => t.stop());
    sharedStreamRef.current = null;
    setPhase('idle');
    setError(null);
    setTranscript('');
    setInterim('');
    setElapsedMs(0);
    setLevel(0);
    setLevels([]);
    levelsRef.current = [];
    captureRef.current = null;
    pausedTotalRef.current = 0;
    prefixRef.current = '';
    transcriptRef.current = '';
    elapsedRef.current = 0;
  }, []);

  /** Typed fallback: keeps the app usable with no microphone at all. */
  const submitTyped = useCallback((text: string, seconds: number): SpeechCapture => {
    const words = text.split(/\s+/).filter(Boolean);
    const durationMs = Math.max(seconds, Math.round((words.length / 130) * 60000)) * 1000;
    const per = durationMs / Math.max(words.length, 1);
    const capture: SpeechCapture = {
      transcript: text.trim(),
      words: words.map((word, i) => ({
        word,
        startMs: Math.round(i * per),
        endMs: Math.round(i * per + per * 0.78),
        confidence: -1,
      })),
      segments: [],
      audio: {
        durationMs,
        avgLoudness: -1,
        peakLoudness: -1,
        silenceMs: 0,
        envelope: [],
        clipped: false,
      },
      engine: 'manual',
      latencyMs: 0,
      typedFallback: true,
    };
    captureRef.current = capture;
    setTranscript(capture.transcript);
    transcriptRef.current = capture.transcript;
    setPhase('done');
    return capture;
  }, []);

  return {
    phase,
    capabilities,
    micAvailable,
    level,
    levels,
    interim,
    transcript,
    elapsedMs,
    error,
    canRecord: capabilities.available && micAvailable !== false,
    start,
    pause,
    resume,
    stop,
    cancel,
    reset,
    getCapture: () => captureRef.current,
    getAudioBlob: () => audioBlobRef.current,
    submitTyped,
  };
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
