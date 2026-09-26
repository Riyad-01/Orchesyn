import { describe, expect, it } from 'vitest';
import type { Session } from '@/types';
import { coachNote, dayKey, historyStats, sortSessions } from './history-stats';

const NOW = 1_750_000_000_000;
const mk = (over: number, daysAgo: number, extra: Partial<Session> = {}): Session =>
  ({
    id: `s${over}-${daysAgo}`,
    userId: 'u',
    mode: 'impromptu',
    title: `Session ${over}`,
    status: 'done',
    startedAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
    spokenSec: 60 + over,
    overall: over,
    band: 6,
    dimensionScores: { fluency: over, grammar: over - 5 },
    reportId: `r${over}`,
    ...extra,
  }) as Session;

describe('historyStats', () => {
  it('computes week counts, averages and trend', () => {
    const s = historyStats([mk(70, 1), mk(60, 2), mk(50, 10)], NOW);
    expect(s.count).toBe(3);
    expect(s.weekCount).toBe(2);
    expect(s.avg).toBe(65);
    expect(s.prevAvg).toBe(50);
    expect(s.trendPct).toBe(15);
    expect(s.best?.overall).toBe(70);
  });

  it('handles empty history safely', () => {
    const s = historyStats([], NOW);
    expect(s.count).toBe(0);
    expect(s.avg).toBe(0);
    expect(s.best).toBeNull();
  });
});

describe('coachNote', () => {
  it('encourages a first rep when empty', () => {
    expect(coachNote([], NOW).href).toBe('/impromptu');
  });

  it('celebrates an upward trend', () => {
    const n = coachNote([mk(80, 1), mk(70, 2), mk(50, 10)], NOW);
    expect(n.headline).toContain('Up 25');
  });

  it('names the weakest dimension on steady weeks', () => {
    const n = coachNote([mk(60, 1), mk(60, 3), mk(60, 10)], NOW);
    expect(n.body).toContain('grammar'); // grammar = overall-5 → weakest
  });
});

describe('sortSessions + dayKey', () => {
  it('sorts by best and longest', () => {
    const list = [mk(50, 1), mk(90, 2, { spokenSec: 30 }), mk(70, 3, { spokenSec: 300 })];
    expect(sortSessions(list, 'best')[0].overall).toBe(90);
    expect(sortSessions(list, 'longest')[0].spokenSec).toBe(300);
    expect(sortSessions(list, 'newest')[0].overall).toBe(50);
  });

  it('dayKey is human-readable', () => {
    expect(dayKey(new Date(NOW).toISOString())).toMatch(/[A-Z][a-z]{2}/);
  });
});
