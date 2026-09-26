import { describe, expect, it } from 'vitest';
import { analyseSpeech } from './index';
import { mergeWhisperIntoCapture } from '@/lib/speech/whisper';
import type { SpeechCapture, WordToken } from '@/types';

function cap(text: string): SpeechCapture {
  const raw = text.split(/\s+/).filter(Boolean);
  const words: WordToken[] = raw.map((w, i) => ({ word: w, startMs: i * 400, endMs: i * 400 + 300, confidence: -1 }));
  const durationMs = Math.max(raw.length * 400, 1000);
  return {
    transcript: text,
    words,
    segments: [],
    audio: {
      durationMs,
      avgLoudness: 0.1,
      peakLoudness: 0.3,
      silenceMs: 0,
      envelope: new Array(60).fill(0.2),
      clipped: false,
    },
    engine: 'web-speech',
    latencyMs: 0,
    typedFallback: false,
  };
}

describe('script intelligence & guidance fallbacks', () => {
  it('applies English deep analysis to Latin text even when profile language is Bangla', () => {
    const r = analyseSpeech({
      sessionId: 's1',
      mode: 'impromptu',
      capture: cap('I go to the market yesterday and I has many things to buy for the family'),
      language: 'bn-BD',
    });
    expect(r.grammarIssues.length).toBeGreaterThan(0);
    const g = r.dimensions.find((d) => d.key === 'grammar');
    expect(g?.score).toBeGreaterThanOrEqual(0);
  });

  it('does not force Latin grammar rules onto Bangla speech', () => {
    const r = analyseSpeech({
      sessionId: 's2',
      mode: 'impromptu',
      capture: cap('আমি গতকাল বাজারে গিয়েছিলাম এবং অনেক কিছু কিনেছি'),
      language: 'bn-BD',
    });
    const g = r.dimensions.find((d) => d.key === 'grammar');
    // -1 dimensions are dropped from the list by design; absent == unmeasured
    expect(g?.score ?? -1).toBe(-1);
    expect(r.grammarIssues.length).toBe(0);
  });

  it('always leaves the learner a next step, even with no speech', () => {
    const r = analyseSpeech({ sessionId: 's3', mode: 'impromptu', capture: cap('') });
    expect(r.focusAreas.length).toBeGreaterThan(0);
    expect(r.focusAreas[0]).toMatch(/speech|mic|network/i);
  });

  it('labels whisper-sourced transcripts as cloud engine after merge', () => {
    const merged = mergeWhisperIntoCapture(cap('hello there friend'), { text: 'hello there friend', words: [] });
    expect(merged.engine).toBe('cloud');
  });
});
