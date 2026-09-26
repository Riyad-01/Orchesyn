import { describe, expect, it } from 'vitest';
import { prosodyFeedback } from './prosody';
import type { PauseEvent, WordToken } from '@/types';

const words = (n: number): WordToken[] =>
  Array.from({ length: n }, (_, i) => ({ word: 'word', startMs: i * 400, endMs: i * 400 + 300, confidence: -1 }));

describe('prosody feedback', () => {
  it('flags a flat envelope as monotone and scores it down', () => {
    const p = prosodyFeedback({ words: words(30), envelope: Array(60).fill(0.3), pauses: [], durationMs: 12000 });
    expect(p.monotoneRisk).toBe('high');
    expect(p.score).toBeLessThan(60);
    expect(p.tips.length).toBeGreaterThan(0);
  });

  it('rewards an expressive envelope', () => {
    const env = Array.from({ length: 60 }, (_, i) => 0.2 + (i % 2 ? 0.5 : 0.1) + (i % 7) * 0.05);
    const p = prosodyFeedback({ words: words(30), envelope: env, pauses: [], durationMs: 12000 });
    expect(p.monotoneRisk).toBe('low');
    expect(p.score).toBeGreaterThanOrEqual(70);
  });

  it('is unmeasurable for typed answers or tiny audio', () => {
    const typed = prosodyFeedback({ words: words(30), envelope: Array(60).fill(0.4), pauses: [], durationMs: 12000, typedFallback: true });
    expect(typed.score).toBe(-1);
    const tiny = prosodyFeedback({ words: words(3), envelope: [0.4], pauses: [], durationMs: 3000 });
    expect(tiny.score).toBe(-1);
    expect(tiny.notes[0]).toMatch(/audio/i);
  });

  it('uses the measured pitch contour when available', () => {
    const env = Array.from({ length: 60 }, (_, i) => 0.3 + (i % 2) * 0.1);
    const flat = prosodyFeedback({
      words: words(30), envelope: env, pitch: Array(80).fill(120), pauses: [], durationMs: 12000,
    });
    expect(flat.monotoneRisk).toBe('high');
    expect(flat.pitchMedian).toBe(120);

    const lively: number[] = [];
    for (let i = 0; i < 80; i++) lively.push(110 + (i % 8) * 12 + (i % 3) * 6);
    const varied = prosodyFeedback({ words: words(30), envelope: env, pitch: lively, pauses: [], durationMs: 12000 });
    expect(varied.monotoneRisk).toBe('low');
    expect(varied.score).toBeGreaterThan(flat.score);
  });

  it('detects a rising final contour', () => {
    const rising: number[] = [];
    for (let i = 0; i < 90; i++) rising.push(i < 60 ? 120 + (i % 5) * 8 : 160 + (i % 5) * 8);
    const p = prosodyFeedback({ words: words(30), envelope: Array(60).fill(0.4), pitch: rising, pauses: [], durationMs: 12000 });
    expect(p.drift).toBe('rising');
    expect(p.tips.some((t) => /downward|assertion/i.test(t))).toBe(true);
  });

  it('penalises abrupt mid-thought breaks', () => {
    const env = Array.from({ length: 60 }, (_, i) => 0.2 + (i % 3) * 0.2);
    const pauses: PauseEvent[] = [
      { atMs: 1000, durationMs: 900, afterWordIndex: 2, kind: 'awkward' },
      { atMs: 3000, durationMs: 800, afterWordIndex: 6, kind: 'awkward' },
    ];
    const clean = prosodyFeedback({ words: words(30), envelope: env, pauses: [], durationMs: 12000 });
    const broken = prosodyFeedback({ words: words(30), envelope: env, pauses, durationMs: 12000 });
    expect(broken.awkwardBreaks).toBe(2);
    expect(broken.score).toBeLessThan(clean.score);
  });
});
