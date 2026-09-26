import { describe, expect, it } from 'vitest';
import { mergeWhisperIntoCapture } from './whisper';
import type { SpeechCapture } from '@/types';

const base: SpeechCapture = {
  transcript: 'old web speech text',
  words: [{ word: 'old', startMs: 0, endMs: 200, confidence: 0.8 }],
  segments: [],
  audio: { durationMs: 9000, avgLoudness: 0.1, peakLoudness: 0.2, silenceMs: 400, envelope: [], clipped: false },
  engine: 'web-speech',
  latencyMs: 100,
  typedFallback: false,
};

describe('mergeWhisperIntoCapture', () => {
  it('replaces transcript and timings, keeps audio stats', () => {
    const merged = mergeWhisperIntoCapture(base, {
      text: 'I went to the market yesterday.',
      words: [{ word: 'I', start: 100, end: 300 }, { word: 'went', start: 400, end: 700 }],
    });
    expect(merged.transcript).toBe('I went to the market yesterday.');
    expect(merged.engine).toBe('cloud');
    expect(merged.words[1]).toMatchObject({ word: 'went', startMs: 400, endMs: 700 });
    expect(merged.audio.durationMs).toBe(9000);
  });

  it('keeps original words when whisper has no timings', () => {
    const merged = mergeWhisperIntoCapture(base, { text: 'hello there', words: [] });
    expect(merged.words).toBe(base.words);
  });
});
