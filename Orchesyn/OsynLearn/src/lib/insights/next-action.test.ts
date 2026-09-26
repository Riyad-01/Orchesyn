import { describe, expect, it } from 'vitest';
import type { DailyProgress, Session } from '@/types';
import { DIMENSION_ROUTE, smartNextActions, weakestDimension } from './next-action';

const NOW = 1_750_000_000_000;

const mk = (over: number, daysAgo: number, extra: Partial<Session> = {}): Session =>
  ({
    id: `s${over}-${daysAgo}`,
    userId: 'u',
    mode: 'impromptu',
    title: `Session ${over}`,
    status: 'completed',
    startedAt: new Date(NOW - daysAgo * 86_400_000).toISOString(),
    spokenSec: 60 + over,
    overall: over,
    band: 6,
    dimensionScores: { fluency: over, grammar: over - 5 },
    reportId: `r${over}`,
    ...extra,
  }) as Session;

const streak = (over: Partial<Parameters<typeof smartNextActions>[0]['streak']> = {}) => ({
  current: 3,
  atRisk: false,
  goalMetToday: true,
  dailyGoalMin: 10,
  ...over,
});

const today = (over: Partial<DailyProgress> = {}): DailyProgress =>
  ({
    date: '2026-09-21',
    spokenSec: 700,
    sessions: 2,
    goalSec: 600,
    bestOverall: 80,
    dimensions: {},
    ...over,
  }) as DailyProgress;

const base = {
  sessions: [mk(78, 0)],
  streak: streak(),
  today: today(),
  dueCards: 0,
  hasLastGuide: false,
  hour: 10,
  now: NOW,
};

describe('smartNextActions', () => {
  it('falls back to the first rep when there is no data at all', () => {
    const a = smartNextActions({ ...base, sessions: [], today: null });
    expect(a[0].href).toBe('/impromptu/');
    expect(a[0].label).toMatch(/first speaking rep/i);
  });

  it('puts an at-risk streak first, with the real minutes still owed', () => {
    const a = smartNextActions({
      ...base,
      streak: streak({ atRisk: true, goalMetToday: false, current: 12 }),
      today: today({ spokenSec: 120 }),
    });
    expect(a[0].emoji).toBe('🔥');
    expect(a[0].label).toContain('12-day streak');
    expect(a[0].sub).toContain('8 more minutes');
  });

  it('does not claim a streak is at risk when the goal is already met', () => {
    const a = smartNextActions({ ...base, streak: streak({ atRisk: true, goalMetToday: true }) });
    expect(a.some((x) => x.emoji === '🔥')).toBe(false);
  });

  it('surfaces due word-bank cards with the exact count', () => {
    const a = smartNextActions({ ...base, dueCards: 7 });
    const card = a.find((x) => x.emoji === '🃏');
    expect(card?.label).toBe('7 Word Bank cards due');
    expect(card?.href).toBe('/ielts/study/');
  });

  it('suggests an overdue drill review with its own deep link', () => {
    const sessions = [mk(70, 9, { title: 'Sample · Describe a city · R2', topicId: 't1' })];
    const a = smartNextActions({ ...base, sessions });
    const review = a.find((x) => x.emoji === '🔁');
    expect(review?.label).toBe('Review: Describe a city');
    expect(review?.href).toBe('/impromptu?topic=t1');
  });

  it('targets the weakest dimension only when it is genuinely weak', () => {
    const weakSessions = [mk(70, 0, { dimensionScores: { fluency: 82, grammar: 44 } })];
    const a = smartNextActions({ ...base, sessions: weakSessions });
    const target = a.find((x) => x.emoji === '🎯');
    expect(target?.label).toContain('grammar');
    expect(target?.href).toBe(DIMENSION_ROUTE.grammar.href);

    const strong = [mk(90, 0, { dimensionScores: { fluency: 88, grammar: 91 } })];
    expect(smartNextActions({ ...base, sessions: strong }).some((x) => x.emoji === '🎯')).toBe(false);
  });

  it('shows minutes remaining toward an unmet daily goal', () => {
    const a = smartNextActions({ ...base, today: today({ spokenSec: 180 }) });
    expect(a[0].emoji).toBe('⏱️');
    expect(a[0].label).toBe("7 min to today's goal");
  });

  it('never duplicates the goal message behind a streak save', () => {
    const a = smartNextActions({
      ...base,
      streak: streak({ atRisk: true, goalMetToday: false }),
      today: today({ spokenSec: 0 }),
    });
    expect(a.filter((x) => x.href === '/impromptu/').length).toBe(1);
  });

  it('respects the limit and keeps priority order', () => {
    const a = smartNextActions(
      {
        ...base,
        sessions: [mk(70, 9, { title: 'Sample · Describe a city · R2', topicId: 't1' })],
        dueCards: 4,
        hasLastGuide: true,
        streak: streak({ atRisk: true, goalMetToday: false }),
        today: today({ spokenSec: 0 }),
      },
      3,
    );
    expect(a).toHaveLength(3);
    expect(a.map((x) => x.emoji)).toEqual(['🔥', '🃏', '🔁']);
  });
});

describe('weakestDimension', () => {
  it('averages only the recent window', () => {
    const list = [mk(50, 0), mk(52, 1), mk(99, 30)];
    const w = weakestDimension(list, 2);
    expect(w?.key).toBe('grammar');
    expect(Math.round(w?.avg ?? 0)).toBe(46);
  });

  it('returns null with no measurable dimensions', () => {
    expect(weakestDimension([mk(50, 0, { dimensionScores: {} })])).toBeNull();
  });
});
