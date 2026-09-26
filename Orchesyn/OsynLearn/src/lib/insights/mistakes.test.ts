import { describe, expect, it } from 'vitest';
import { buildMistakeBook, computeDueReviews, oneKeyTakeaway } from './mistakes';
import type { FeedbackReport, Session } from '@/types';

const day = 86_400_000;

function report(daysAgo: number, extra: Partial<FeedbackReport>): FeedbackReport {
  return {
    id: `r${daysAgo}-${Math.random()}`,
    sessionId: 's',
    mode: 'impromptu',
    createdAt: new Date(Date.now() - daysAgo * day).toISOString(),
    engine: 'web-speech',
    typedFallback: false,
    overall: 60,
    band: 6,
    cefr: 'B1',
    dimensions: [],
    metrics: { wordCount: 50, durationMs: 30000, wpm: 100, fillerCount: 0, errorCount: 0 } as never,
    transcript: '',
    words: [],
    fillers: [],
    grammarIssues: [],
    vocabHighlights: [],
    pronunciationFlags: [],
    pauses: [],
    strongPoints: [],
    focusAreas: [],
    coachNote: '',
    nextDrills: [],
    analysisMs: 5,
    ...extra,
  } as FeedbackReport;
}

function session(daysAgo: number, title: string, extra: Partial<Session> = {}): Session {
  return {
    id: `sess-${title}-${daysAgo}`,
    userId: 'guest',
    mode: 'impromptu',
    title,
    status: 'completed',
    startedAt: new Date(Date.now() - daysAgo * day).toISOString(),
    spokenSec: 60,
    overall: 60,
    band: 6,
    dimensionScores: {},
    reportId: 'r',
    ...extra,
  } as Session;
}

describe('buildMistakeBook', () => {
  it('aggregates fillers and detects an improving trend', () => {
    const early = report(10, {
      fillers: [
        { phrase: 'um', index: 0, wordIndex: 0, atMs: 0 },
        { phrase: 'um', index: 1, wordIndex: 4, atMs: 900 },
      ],
    });
    const late = report(1, { fillers: [] });
    const book = buildMistakeBook([early, late]);
    const um = book.entries.find((e) => e.id === 'filler:um');
    expect(um).toBeTruthy();
    expect(um!.count).toBe(2);
    expect(um!.firstHalf).toBe(2);
    expect(um!.secondHalf).toBe(0);
    expect(book.improving).toBeGreaterThanOrEqual(1);
  });

  it('captures grammar rules with correction in the fix text', () => {
    const r = report(3, {
      grammarIssues: [
        {
          ruleId: 'since-vs-for',
          category: 'preposition',
          quote: 'since ten years',
          correction: 'for ten years',
          explanation: 'Use "for" with durations.',
          severity: 'warn',
          wordIndex: 2,
        },
      ],
    });
    const book = buildMistakeBook([r]);
    const g = book.entries.find((e) => e.kind === 'grammar');
    expect(g).toBeTruthy();
    expect(g!.fix).toContain('for ten years');
    expect(book.totals.grammar).toBe(1);
  });

  it('counts only basic (tier<=2) vocabulary', () => {
    const r = report(2, {
      vocabHighlights: [
        { word: 'good', tier: 1, wordIndex: 0, atMs: 0 },
        { word: 'good', tier: 2, wordIndex: 5, atMs: 800 },
        { word: 'meticulous', tier: 5, wordIndex: 9, atMs: 1400 },
      ],
    });
    const book = buildMistakeBook([r]);
    const v = book.entries.find((e) => e.kind === 'vocab');
    expect(v).toBeTruthy();
    expect(v!.detail).toContain('good');
    expect(v!.detail).not.toContain('meticulous');
  });
});

describe('computeDueReviews', () => {
  it('marks a once-practised topic due after 1 day', () => {
    const due = computeDueReviews([session(2, 'My hometown')]);
    expect(due).toHaveLength(1);
    expect(due[0].intervalDays).toBe(1);
    expect(due[0].overdueDays).toBeGreaterThanOrEqual(0);
  });

  it('does not mark a fresh topic due, and grows the interval with attempts', () => {
    const fresh = computeDueReviews([session(0, 'Fresh topic')]);
    expect(fresh).toHaveLength(0);
    const thrice = computeDueReviews([
      session(9, 'Repeat topic'),
      session(8, 'Repeat topic'),
      session(7, 'Repeat topic'),
    ]);
    expect(thrice).toHaveLength(1);
    expect(thrice[0].intervalDays).toBe(7);
  });

  it('builds practice links from drill/topic ids', () => {
    const due = computeDueReviews([session(3, 'T', { topicId: 't-9' })]);
    expect(due[0].href).toBe('/impromptu?topic=t-9');
  });
});

describe('oneKeyTakeaway', () => {
  it('prioritises grammar, then fillers, then weakest dimension', () => {
    const g = report(1, {
      grammarIssues: [{ ruleId: 'x', category: 'tense', quote: 'I go', correction: 'I went', explanation: '', severity: 'warn', wordIndex: 1 }],
      fillers: [{ phrase: 'um', index: 0, wordIndex: 0, atMs: 0 }],
    });
    expect(oneKeyTakeaway(g)).toContain('I went');
    const f = report(1, { fillers: [{ phrase: 'um', index: 0, wordIndex: 0, atMs: 0 }] });
    expect(oneKeyTakeaway(f)).toContain('um');
  });
});
