import type { EngineCapabilities, SpeechCapture, TranscriptSegment, WordToken } from '@/types';

/**
 * Pluggable speech engine.
 *
 * The app never talks to a concrete provider. `getEngine()` picks the best engine
 * available in this browser and everything above this line works with any of them:
 *
 *   - web-speech : on-device, free, zero setup. Chrome/Edge/Safari.
 *   - cloud      : Deepgram / OpenAI Realtime / Azure, wired by setting an API key.
 *   - manual     : typed fallback when no microphone is available.
 */

export interface EngineStartOptions {
  language?: string;
  /** caller-owned mic stream; when provided the engine must NOT stop its tracks */
  stream?: MediaStream;
  /** called with the growing transcript so the UI can live-caption */
  onInterim?: (text: string) => void;
  /** called each time a chunk becomes final */
  onFinal?: (segment: TranscriptSegment) => void;
  /** called with a fresh loudness sample (0..1) for the waveform */
  onLevel?: (level: number) => void;
  onError?: (error: EngineError) => void;
}

export type EngineErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'no-audio'
  | 'network'
  | 'aborted'
  | 'unknown';

export interface EngineError {
  code: EngineErrorCode;
  message: string;
  /** true when the user can fix it and retry */
  recoverable: boolean;
}

export interface SpeechEngine {
  readonly kind: EngineCapabilities['kind'];
  capabilities(): EngineCapabilities;
  start(options: EngineStartOptions): Promise<void>;
  stop(): Promise<SpeechCapture>;
  cancel(): void;
}

/* ------------------------------------------------------------------ *
 * Capability detection
 * ------------------------------------------------------------------ */

type SpeechRecognitionCtor = new () => any;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function hasMediaRecorder(): boolean {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
}

export async function microphoneAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function detectCapabilities(): EngineCapabilities {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return {
      kind: 'none',
      available: false,
      reason: 'This browser has no Speech Recognition API. Use Chrome, Edge or Safari, or type your answer instead.',
      liveInterim: false,
      wordTimings: false,
      wordConfidence: false,
      phonemeScores: false,
      language: 'en-US',
      offline: true,
    };
  }
  // Chrome/Edge expose per-word timings and confidence; Safari does not.
  const isChromium = typeof navigator !== 'undefined' && /Chrome|Chromium|Edg/.test(navigator.userAgent);
  return {
    kind: 'web-speech',
    available: true,
    liveInterim: true,
    wordTimings: isChromium,
    wordConfidence: isChromium,
    phonemeScores: false,
    language: 'en-US',
    offline: false,
  };
}

/* ------------------------------------------------------------------ *
 * Timing helpers shared by every engine
 * ------------------------------------------------------------------ */

/**
 * When the engine cannot give us per-word timings we synthesise them by spreading
 * the capture evenly across the words. Pace and pause analysis degrade gracefully
 * instead of silently reporting zeros, and `wordTimings:false` tells the UI to
 * label those numbers as estimates.
 */
export function synthesiseTimings(words: string[], durationMs: number): WordToken[] {
  if (!words.length || durationMs <= 0) return [];
  const perWord = durationMs / words.length;
  return words.map((word, i) => ({
    word,
    startMs: Math.round(i * perWord),
    endMs: Math.round(i * perWord + perWord * 0.78),
    confidence: -1,
  }));
}

export function joinWords(words: string[]): string {
  return words.join(' ').replace(/\s+([,.!?;:])/g, '$1').replace(/\s+/g, ' ').trim();
}
