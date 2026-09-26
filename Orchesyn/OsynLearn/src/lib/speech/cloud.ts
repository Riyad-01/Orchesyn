import type { EngineCapabilities, SpeechCapture, TranscriptSegment, WordToken } from '@/types';
import { joinWords, type EngineStartOptions, type SpeechEngine } from './engine';
import type { PhonemeInput } from '@/lib/scoring/pronunciation';

/**
 * Cloud engine adapter (optional).
 *
 * This is the seam where a paid provider plugs in. It is deliberately a thin
 * interface: point it at Deepgram, OpenAI Realtime, Azure Speech or the Microsoft
 * Pronunciation Assessment API and the rest of the app is unchanged — except that
 * `phonemes` become available and pronunciation scoring stops being an estimate.
 *
 * Nothing is called unless `NEXT_PUBLIC_SPEECH_PROVIDER` is set, so the app runs
 * fully on-device with no key.
 */

export interface CloudEngineConfig {
  provider: 'deepgram' | 'openai' | 'azure';
  /** server-side endpoint that holds the real key; never ship a key to the client */
  endpoint: string;
  language: string;
}

export interface CloudTranscript {
  transcript: string;
  words: WordToken[];
  segments: TranscriptSegment[];
  phonemes: PhonemeInput[];
  durationMs: number;
  avgLoudness: number;
  peakLoudness: number;
}

export function cloudConfig(): CloudEngineConfig | null {
  const provider = process.env.NEXT_PUBLIC_SPEECH_PROVIDER as CloudEngineConfig['provider'] | undefined;
  const endpoint = process.env.NEXT_PUBLIC_SPEECH_ENDPOINT;
  if (!provider || !endpoint) return null;
  return { provider, endpoint, language: 'en-US' };
}

export class CloudSpeechEngine implements SpeechEngine {
  readonly kind = 'cloud' as const;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startedAt = 0;
  private opts: EngineStartOptions = {};
  private levels: number[] = [];

  constructor(private config: CloudEngineConfig) {}

  capabilities(): EngineCapabilities {
    return {
      kind: 'cloud',
      available: true,
      liveInterim: true,
      wordTimings: true,
      wordConfidence: true,
      phonemeScores: this.config.provider === 'azure',
      language: this.config.language,
      offline: false,
    };
  }

  async start(options: EngineStartOptions): Promise<void> {
    this.opts = options;
    this.chunks = [];
    this.levels = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(250);
    this.startedAt = Date.now();
    this.pollLevel(options.onLevel);
  }

  private pollLevel(onLevel?: (level: number) => void) {
    if (!this.stream) return;
    const Ctx: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(this.stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      if (!this.recorder || this.recorder.state === 'inactive') {
        void ctx.close().catch(() => undefined);
        return;
      }
      analyser.getByteTimeDomainData(buf as any);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const level = Math.min(1, Math.sqrt(sum / buf.length) * 3);
      this.levels.push(level);
      onLevel?.(level);
      setTimeout(tick, 50);
    };
    tick();
  }

  async stop(): Promise<SpeechCapture> {
    const elapsed = Date.now() - this.startedAt;
    const blob = await new Promise<Blob>((resolve) => {
      if (!this.recorder) return resolve(new Blob());
      this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: this.recorder?.mimeType }));
      this.recorder.stop();
    });
    this.stream?.getTracks().forEach((t) => t.stop());

    let result: CloudTranscript;
    try {
      const form = new FormData();
      form.append('audio', blob, 'speech.webm');
      form.append('provider', this.config.provider);
      form.append('language', this.config.language);
      const res = await fetch(this.config.endpoint, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Speech API responded ${res.status}`);
      result = (await res.json()) as CloudTranscript;
    } catch (err) {
      this.opts.onError?.({
        code: 'network',
        message: `Cloud transcription failed: ${(err as Error).message}. Falling back to the on-device engine.`,
        recoverable: true,
      });
      result = {
        transcript: '', words: [], segments: [], phonemes: [],
        durationMs: elapsed, avgLoudness: avg(this.levels), peakLoudness: Math.max(0, ...this.levels),
      };
    }

    return {
      transcript: result.transcript || joinWords(result.words.map((w) => w.word)),
      words: result.words,
      segments: result.segments,
      audio: {
        durationMs: result.durationMs || elapsed,
        avgLoudness: result.avgLoudness || avg(this.levels),
        peakLoudness: result.peakLoudness || Math.max(0, ...this.levels),
        silenceMs: 0,
        envelope: this.levels.slice(-180),
        clipped: false,
      },
      engine: 'cloud',
      latencyMs: Date.now() - this.startedAt - elapsed,
      typedFallback: false,
    };
  }

  cancel(): void {
    try {
      this.recorder?.stop();
    } catch {
      // ignore
    }
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10000) / 10000;
}
