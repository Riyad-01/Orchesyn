import type { EngineCapabilities, SpeechCapture, TranscriptSegment, WordToken } from '@/types';
import { AudioMeter } from './audio-meter';
import {
  detectCapabilities,
  getSpeechRecognitionCtor,
  joinWords,
  synthesiseTimings,
  type EngineError,
  type EngineStartOptions,
  type SpeechEngine,
} from './engine';

/**
 * On-device speech engine built on the Web Speech API.
 *
 * Real-world quirks this has to survive:
 *   - Chrome ends a recognition session after ~60s or after a silence, so we
 *     transparently restart it and stitch the segments together.
 *   - Restarting replays nothing, but `resultIndex` resets, so we track the number
 *     of already-consumed final results.
 *   - Safari never emits word-level timings; we synthesise them and flag it.
 *   - The mic stream is held separately from recognition so the level meter keeps
 *     running across restarts.
 */
export class WebSpeechEngine implements SpeechEngine {
  readonly kind = 'web-speech' as const;

  private recognition: any = null;
  private meter = new AudioMeter();
  private stream: MediaStream | null = null;

  private words: WordToken[] = [];
  private segments: TranscriptSegment[] = [];
  private interim = '';
  private running = false;
  private restarting = false;
  private consumedFinals = 0;
  private startedAt = 0;
  private lastWordEndMs = 0;
  private language = 'en-US';
  private networkFails = 0;
  private ownsStream = false;
  private opts: EngineStartOptions = {};
  private stoppedResolve: ((value: void) => void) | null = null;
  private wordTimingsSeen = false;

  capabilities(): EngineCapabilities {
    const base = detectCapabilities();
    return { ...base, wordTimings: base.wordTimings || this.wordTimingsSeen };
  }

  async start(options: EngineStartOptions): Promise<void> {
    this.opts = options;
    this.language = options.language || 'en-US';
    this.words = [];
    this.segments = [];
    this.interim = '';
    this.consumedFinals = 0;
    this.lastWordEndMs = 0;
    this.wordTimingsSeen = false;
    this.networkFails = 0;

    // One shared stream per session (the recorder owns it on most platforms):
    // a second concurrent getUserMedia is a classic Android flakiness source.
    this.ownsStream = !options.stream;
    try {
      this.stream =
        options.stream ??
        (await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        }));
    } catch (err) {
      options.onError?.(toEngineError(err));
      throw err;
    }
    await this.meter.attach(this.stream, options.onLevel);

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      const error: EngineError = {
        code: 'unsupported',
        message: 'This browser cannot recognise speech.',
        recoverable: false,
      };
      options.onError?.(error);
      throw new Error(error.message);
    }

    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => this.handleResult(event);
    this.recognition.onerror = (event: any) => this.handleError(event);
    this.recognition.onend = () => this.handleEnd();

    this.running = true;
    this.startedAt = Date.now();
    try {
      this.recognition.start();
    } catch {
      // start() throws if it is already running — harmless on a restart race
    }
  }

  private handleResult(event: any) {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const alt = result[0];
      const text: string = alt?.transcript ?? '';
      if (!text) continue;

      if (result.isFinal) {
        const now = Date.now();
        const startMs = this.lastWordEndMs;
        const endMs = now - this.startedAt;
        this.segments.push({
          text: text.trim(),
          startMs,
          endMs,
          confidence: typeof alt.confidence === 'number' && alt.confidence > 0 ? alt.confidence : -1,
          final: true,
        });
        this.consumeWords(alt, startMs, endMs, text.trim());
        this.lastWordEndMs = endMs;
        this.consumedFinals = i + 1;
        this.interim = '';
        this.opts.onFinal?.(this.segments[this.segments.length - 1]);
      } else {
        this.interim = text;
      }
      this.opts.onInterim?.(this.currentTranscript());
    }
  }

  /**
   * Chrome puts `words` on the alternative with startTime/endTime in seconds.
   * Safari does not, so we fall back to spreading the segment across its words.
   */
  private consumeWords(alt: any, startMs: number, endMs: number, text: string) {
    const wordList = alt?.words;
    if (Array.isArray(wordList) && wordList.length) {
      this.wordTimingsSeen = true;
      for (const w of wordList) {
        const word = String(w.word ?? '').trim();
        if (!word) continue;
        const wStart = typeof w.startTime === 'number' ? Math.round(w.startTime * 1000) : startMs;
        const wEnd = typeof w.endTime === 'number' ? Math.round(w.endTime * 1000) : wStart + 200;
        this.words.push({ word, startMs: wStart, endMs: wEnd, confidence: -1 });
      }
      return;
    }
    // No word data: synthesise inside this segment's window.
    const plain = text.split(/\s+/).filter(Boolean);
    const span = Math.max(endMs - startMs, 1);
    const per = span / plain.length;
    plain.forEach((word, i) => {
      this.words.push({
        word,
        startMs: Math.round(startMs + i * per),
        endMs: Math.round(startMs + i * per + per * 0.78),
        confidence: -1,
      });
    });
  }

  private handleError(event: any) {
    const error = event?.error;
    if (error === 'no-speech' || error === 'aborted') return; // routine, we restart
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      this.running = false;
      this.opts.onError?.({
        code: 'permission-denied',
        message: 'Microphone access was blocked. Allow it in your browser settings and try again.',
        recoverable: true,
      });
      return;
    }
    if (error === 'network') {
      this.networkFails += 1;
      // On flaky connections (4G, captive portals) Chrome would otherwise loop
      // start→network-error→end→restart forever with an empty transcript.
      // After two fails we stop restarting; the level meter keeps running and
      // the raw audio is still transcribed by Whisper when the user finishes.
      if (this.networkFails >= 2) this.running = false;
      this.opts.onError?.({
        code: 'network',
        message:
          this.networkFails >= 2
            ? 'Live captions cannot reach the speech service on this network. Keep speaking — your audio is transcribed when you finish, or type it instead.'
            : 'Speech recognition needs a network connection. Retrying…',
        recoverable: true,
      });
    }
  }

  /** Chrome silently ends sessions; restart so a 60s answer is captured whole. */
  private handleEnd() {
    if (!this.running) {
      this.stoppedResolve?.();
      this.stoppedResolve = null;
      return;
    }
    if (this.restarting) return;
    this.restarting = true;
    const wait = 120;
    setTimeout(() => {
      this.restarting = false;
      if (!this.running || !this.recognition) return;
      try {
        this.recognition.start();
      } catch {
        // already started
      }
    }, wait);
  }

  private currentTranscript(): string {
    const finals = this.segments.map((s) => s.text).join(' ');
    return `${finals}${this.interim ? ` ${this.interim}` : ''}`.replace(/\s+/g, ' ').trim();
  }

  async stop(): Promise<SpeechCapture> {
    const stoppedAt = Date.now();
    this.running = false;
    try {
      this.recognition?.stop();
    } catch {
      // ignore
    }
    // give the final result a moment to arrive before we read it out
    await new Promise<void>((resolve) => {
      this.stoppedResolve = resolve;
      setTimeout(resolve, 350);
    });

    const transcript = this.currentTranscript();
    const elapsed = stoppedAt - this.startedAt;
    const audio = this.meter.stats(elapsed);

    let words = this.words;
    if (!words.length && transcript) {
      words = synthesiseTimings(transcript.split(/\s+/).filter(Boolean), elapsed);
    } else if (words.length) {
      // normalise against the recorded duration in case word timings start late
      const maxEnd = Math.max(...words.map((w) => w.endMs), 0);
      if (maxEnd > 0 && Math.abs(maxEnd - elapsed) > elapsed * 0.5) {
        const scale = elapsed / maxEnd;
        words = words.map((w) => ({
          ...w,
          startMs: Math.round(w.startMs * scale),
          endMs: Math.round(w.endMs * scale),
        }));
      }
    }

    this.dispose();
    return {
      transcript: transcript || joinWords(words.map((w) => w.word)),
      words,
      segments: this.segments,
      audio,
      engine: 'web-speech',
      latencyMs: Date.now() - stoppedAt,
      typedFallback: false,
    };
  }

  cancel(): void {
    this.running = false;
    try {
      this.recognition?.abort();
    } catch {
      // ignore
    }
    this.dispose();
  }

  private dispose(): void {
    this.meter.dispose();
    if (this.ownsStream) this.stream?.getTracks().forEach((t) => t.stop());
    this.recognition = null;
    this.stream = null;
  }
}

function toEngineError(err: unknown): EngineError {
  const name = (err as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      code: 'permission-denied',
      message: 'Microphone permission was denied. Enable it for this site and try again.',
      recoverable: true,
    };
  }
  if (name === 'NotFoundError') {
    return { code: 'no-audio', message: 'No microphone was found on this device.', recoverable: false };
  }
  return {
    code: 'unknown',
    message: (err as Error)?.message ?? 'Could not start the microphone.',
    recoverable: true,
  };
}
