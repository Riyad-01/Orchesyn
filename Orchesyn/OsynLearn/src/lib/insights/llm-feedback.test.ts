import { describe, expect, it } from 'vitest';
import { buildFeedbackPrompt, mergeLlmFeedback, parseLlmFeedback, type LlmFeedback } from './llm-feedback';
import type { FeedbackReport } from '@/types';

const good = `{
  "grammar": [{"quote":"i go yesterday","correction":"I went yesterday","explanation":"past tense","severity":"bad"}],
  "vocabulary": ["meticulous"],
  "organization": "Clear position, one example, no close.",
  "improvements": ["Add a closing sentence that restates your position.", "Replace 'very good' with a precise adjective.", "Pause at clause boundaries instead of mid-phrase."],
  "cefr": "B1"
}`;

function baseReport(): FeedbackReport {
  return {
    id: 'r1',
    sessionId: 's1',
    mode: 'impromptu',
    createdAt: new Date().toISOString(),
    engine: 'web-speech',
    typedFallback: false,
    overall: 60,
    band: 6,
    cefr: 'B2',
    dimensions: [],
    metrics: {
      wordCount: 40, durationMs: 30000, wpm: 120, artRate: 2, syllablesPerSec: 4,
      fillerCount: 2, fillerRatePerMin: 4, pauseCount: 3, awkwardPauseCount: 1,
      longestPauseMs: 900, totalPauseMs: 2000, meanRunLength: 8, uniqueWords: 30,
      ttr: 0.7, cttr: 5, mtld: 60, lexicalDensity: 0.5, avgWordTier: 1.5,
      rareWordCount: 2, selfCorrectionCount: 0, restartCount: 0,
      avgSentenceLength: 10, sentenceCount: 4, errorCount: 1, errorsPer100Words: 2,
      avgAsrConfidence: 0.9, avgLoudness: 0.1, latencyToStartMs: 300,
    },
    transcript: 'i go yesterday and it was very good',
    words: [],
    fillers: [],
    grammarIssues: [{ ruleId: 'x', category: 'tense', quote: 'i go yesterday', correction: 'I went yesterday', explanation: 'past', severity: 'bad', wordIndex: 0 }],
    vocabHighlights: [],
    pronunciationFlags: [],
    pauses: [],
    strongPoints: [],
    focusAreas: [],
    coachNote: '',
    nextDrills: [],
    analysisMs: 1,
  };
}

describe('parseLlmFeedback', () => {
  it('parses fenced and bare JSON', () => {
    expect(parseLlmFeedback(good)?.improvements.length).toBe(3);
    expect(parseLlmFeedback('```json\n' + good + '\n```')?.grammar[0].correction).toBe('I went yesterday');
  });
  it('rejects garbage, empty and schema-breaking payloads', () => {
    expect(parseLlmFeedback('no json here')).toBeNull();
    expect(parseLlmFeedback('{"grammar": [], "improvements": []}')).toBeNull();
    expect(parseLlmFeedback('{"grammar": [{"quote": ""}], "improvements": ["x"]}')?.grammar.length).toBe(0);
  });
});

describe('buildFeedbackPrompt', () => {
  it('embeds transcript, metrics and the verbatim-quote rule', () => {
    const p = buildFeedbackPrompt('hello world answer', { mode: 'impromptu', wpm: 118, fillerCount: 2 });
    expect(p).toContain('hello world answer');
    expect(p).toContain('118 wpm');
    expect(p).toMatch(/verbatim/i);
  });
});

describe('mergeLlmFeedback', () => {
  it('replaces grammar issues with the examiner-validated ones and stores the plan', () => {
    const fb = parseLlmFeedback(good) as LlmFeedback;
    const merged = mergeLlmFeedback(baseReport(), fb, 'openai/gpt-oss-120b');
    expect(merged.grammarIssues[0].ruleId).toBe('llm-0');
    expect(merged.llm?.improvements.length).toBe(3);
    expect(merged.llm?.cefr).toBe('B1');
    expect(merged.llm?.model).toBe('openai/gpt-oss-120b');
    expect(merged.overall).toBe(60); // objective scores untouched
  });
});
