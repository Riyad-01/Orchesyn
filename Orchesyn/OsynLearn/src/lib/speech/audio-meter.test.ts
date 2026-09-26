import { describe, expect, it } from 'vitest';
import { estimateF0 } from './audio-meter';

const RATE = 48000;

function sine(hz: number, amp = 0.3, n = 2048): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / RATE);
  return out;
}

describe('estimateF0 (on-device pitch DSP)', () => {
  it('recovers low, mid and high voice fundamentals', () => {
    expect(estimateF0(sine(110), RATE)).toBeCloseTo(110, -1);
    expect(estimateF0(sine(220), RATE)).toBeCloseTo(220, -1);
    expect(estimateF0(sine(330), RATE)).toBeCloseTo(330, -1);
  });

  it('returns 0 for silence and near-silence', () => {
    expect(estimateF0(new Float32Array(2048), RATE)).toBe(0);
    expect(estimateF0(sine(220, 0.001), RATE)).toBe(0);
  });

  it('returns 0 for unvoiced noise', () => {
    const noise = new Float32Array(2048);
    let seed = 42;
    for (let i = 0; i < noise.length; i++) {
      seed = (seed * 16807) % 2147483647;
      noise[i] = ((seed / 2147483647) * 2 - 1) * 0.3;
    }
    expect(estimateF0(noise, RATE)).toBe(0);
  });

  it('is octave-safe on a strong harmonic-free tone', () => {
    const f = estimateF0(sine(200), RATE);
    expect(f).toBeGreaterThan(180);
    expect(f).toBeLessThan(220);
  });
});
