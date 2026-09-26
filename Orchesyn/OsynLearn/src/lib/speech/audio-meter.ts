import type { AudioStats } from '@/types';

/**
 * Microphone level meter + on-device pitch tracker.
 *
 * Runs an AnalyserNode at ~20fps and keeps a rolling loudness envelope (live
 * waveform, quiet/clipping warnings, clarity score) AND an F0 contour via
 * normalised autocorrelation — the real intonation signal behind the prosody
 * card. No audio ever leaves the device for this.
 */

const SAMPLE_HZ = 20;
const SILENCE_THRESHOLD = 0.008;
const VOICED_THRESHOLD = 0.02;

/**
 * Estimate the fundamental frequency (Hz) of one time-domain frame using
 * normalised autocorrelation over the 70–400 Hz speech range.
 * Returns 0 when the frame is silent or not periodically voiced.
 * Pure and allocation-light so it can run at 20fps and be unit-tested.
 */
export function estimateF0(frame: ArrayLike<number>, sampleRate: number): number {
  const n = frame.length;
  if (n < 256 || sampleRate <= 0) return 0;

  let energy = 0;
  let mean = 0;
  for (let i = 0; i < n; i++) {
    energy += frame[i] * frame[i];
    mean += frame[i];
  }
  if (energy / n < 0.0005) return 0; // silence gate (~rms 0.022)
  mean /= n;

  const x = new Float32Array(n);
  let r0 = 0;
  for (let i = 0; i < n; i++) {
    x[i] = frame[i] - mean;
    r0 += x[i] * x[i];
  }
  if (r0 <= 1e-9) return 0;

  const minLag = Math.max(4, Math.floor(sampleRate / 400)); // 400 Hz ceiling
  const maxLag = Math.min(Math.floor(sampleRate / 70), n - 4); // 70 Hz floor
  if (maxLag <= minLag) return 0;

  let bestLag = -1;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let norm = 0;
    const end = n - lag;
    for (let i = 0; i < end; i++) {
      sum += x[i] * x[i + lag];
      norm += x[i + lag] * x[i + lag];
    }
    const corr = sum / Math.sqrt(r0 * Math.max(norm, 1e-9));
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (bestLag < 0 || bestCorr < 0.5) return 0; // not periodically voiced
  return Math.round(sampleRate / bestLag);
}

export class AudioMeter {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stream: MediaStream | null = null;
  private buffer: Uint8Array = new Uint8Array(0);
  private frame: Float32Array = new Float32Array(0);

  private sumSquares = 0;
  private samples = 0;
  private peak = 0;
  private silenceSamples = 0;
  private envelope: number[] = [];
  private pitch: number[] = [];
  private clippingFrames = 0;

  get levels(): number[] {
    return this.envelope;
  }

  async attach(stream: MediaStream, onLevel?: (level: number) => void): Promise<void> {
    const Ctx: typeof AudioContext =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.source = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.6;
    this.buffer = new Uint8Array(this.analyser.fftSize);
    this.frame = new Float32Array(this.analyser.fftSize);
    this.source.connect(this.analyser);
    this.stream = stream;

    this.timer = setInterval(() => {
      if (!this.analyser || !this.ctx) return;
      this.analyser.getByteTimeDomainData(this.buffer as any);
      let sum = 0;
      let clippedHere = false;
      for (let i = 0; i < this.buffer.length; i++) {
        const v = (this.buffer[i] - 128) / 128;
        sum += v * v;
        if (Math.abs(v) > 0.98) clippedHere = true;
      }
      const rms = Math.sqrt(sum / this.buffer.length);
      if (clippedHere) this.clippingFrames += 1;
      this.sumSquares += rms * rms;
      this.samples += 1;
      this.peak = Math.max(this.peak, rms);
      if (rms < SILENCE_THRESHOLD) this.silenceSamples += 1;
      // keep the buffers bounded so a long session cannot grow them without limit
      if (this.envelope.length > 4000) this.envelope.shift();
      if (this.pitch.length > 4000) this.pitch.shift();
      this.envelope.push(Math.min(1, rms * 3));

      // pitch contour: only meaningful on voiced (loud enough) frames
      if (rms > VOICED_THRESHOLD) {
        for (let i = 0; i < this.buffer.length; i++) this.frame[i] = (this.buffer[i] - 128) / 128;
        this.pitch.push(estimateF0(this.frame, this.ctx.sampleRate));
      } else {
        this.pitch.push(0);
      }
      onLevel?.(Math.min(1, rms * 3));
    }, 1000 / SAMPLE_HZ);
  }

  stats(durationMs: number): AudioStats {
    const avg = this.samples > 0 ? Math.sqrt(this.sumSquares / this.samples) : 0;
    const silenceMs = Math.round((this.silenceSamples / Math.max(this.samples, 1)) * durationMs);
    return {
      durationMs: Math.round(durationMs),
      avgLoudness: Math.round(avg * 10000) / 10000,
      peakLoudness: Math.round(this.peak * 10000) / 10000,
      silenceMs,
      envelope: this.downsample(this.envelope, 180),
      pitch: this.thin(this.pitch, 360),
      clipped: this.clippingFrames > this.samples * 0.2,
    };
  }

  /** Reduce the envelope to a fixed number of points for the waveform component. */
  private downsample(input: number[], target: number): number[] {
    if (input.length <= target) return [...input];
    const out: number[] = [];
    const step = input.length / target;
    for (let i = 0; i < target; i++) {
      const from = Math.floor(i * step);
      const to = Math.max(from + 1, Math.floor((i + 1) * step));
      let max = 0;
      for (let j = from; j < to && j < input.length; j++) max = Math.max(max, input[j]);
      out.push(max);
    }
    return out;
  }

  /** Decimate the pitch contour without smearing voiced/unvoiced (0) frames. */
  private thin(input: number[], target: number): number[] {
    if (input.length <= target) return [...input];
    const out: number[] = [];
    const step = input.length / target;
    for (let i = 0; i < target; i++) out.push(input[Math.floor(i * step)]);
    return out;
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
  }
}
