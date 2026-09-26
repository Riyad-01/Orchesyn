import { describe, expect, it } from 'vitest';
import { buildAdaptivePlan, levelToBand, MAX_CARRY, reschedule, weeklyAllocation } from './planner';

describe('weeklyAllocation', () => {
  it('gives every skill at least one session a week', () => {
    const a = weeklyAllocation({});
    expect(Object.values(a).every((n) => n >= 1)).toBe(true);
  });
  it('stacks extra time on weak and under-target skills', () => {
    const a = weeklyAllocation(
      { listening: 90, reading: 50, writing: 70, speaking: 40 },
      { writing: 7 }, // levelToBand(70)=6.5 < 7 → target top-up on top of the +1 weakness top-up
    );
    expect(a.speaking).toBeGreaterThanOrEqual(3);
    expect(a.reading).toBeGreaterThanOrEqual(3);
    expect(a.writing).toBe(3);
    expect(a.listening).toBe(1);
  });
  it('never exceeds the cap', () => {
    const a = weeklyAllocation({ speaking: 10 }, { speaking: 9 });
    expect(a.speaking).toBeLessThanOrEqual(4);
  });
});

describe('buildAdaptivePlan', () => {
  it('covers all four skills inside the week when capacity allows', () => {
    const plan = buildAdaptivePlan({ levels: {}, minutesPerDay: 30, overdueReviews: 0, days: 7 });
    const skills = new Set(plan.flatMap((d) => d.items.map((i) => i.skill)));
    expect([...skills].sort()).toEqual(['listening', 'reading', 'speaking', 'writing']);
  });
  it('weaves at most one overdue review per day until clear', () => {
    const plan = buildAdaptivePlan({ levels: {}, minutesPerDay: 20, overdueReviews: 3, days: 7 });
    const reviews = plan.map((d) => d.items.filter((i) => i.kind === 'review').length);
    expect(reviews.filter((n) => n === 1).length).toBe(3);
    expect(Math.max(...reviews)).toBe(1);
  });
  it('respects the daily capacity', () => {
    const plan = buildAdaptivePlan({ levels: {}, minutesPerDay: 10, overdueReviews: 0, days: 7 });
    for (const d of plan) {
      const mins = d.items.reduce((a, i) => a + i.minutes, 0);
      expect(mins).toBeLessThanOrEqual(10);
    }
  });
});

describe('reschedule', () => {
  const plan = [
    { date: '2026-09-20', items: [{ lessonId: 'L1', skill: 'listening' as const, minutes: 8, kind: 'new' as const }] },
    { date: '2026-09-21', items: [{ lessonId: 'R1', skill: 'reading' as const, minutes: 9, kind: 'new' as const }] },
    { date: '2026-09-22', items: [] },
    { date: '2026-09-23', items: [] },
  ];

  it('moves missed work forward, flagged as rescheduled', () => {
    const out = reschedule(plan, new Set(), '2026-09-22');
    expect(out[0].items).toHaveLength(0);
    const moved = out.flatMap((d) => d.items).filter((i) => i.kind === 'rescheduled');
    expect(moved).toHaveLength(2);
  });

  it('never carries more than MAX_CARRY onto one day', () => {
    const big = [
      { date: '2026-09-19', items: Array.from({ length: 5 }, (_, i) => ({ lessonId: `X${i}`, skill: 'reading' as const, minutes: 5, kind: 'new' as const })) },
      { date: '2026-09-22', items: [] },
      { date: '2026-09-23', items: [] },
      { date: '2026-09-24', items: [] },
    ];
    const out = reschedule(big, new Set(), '2026-09-22');
    for (const d of out) {
      const carried = d.items.filter((i) => i.kind === 'rescheduled').length;
      expect(carried).toBeLessThanOrEqual(MAX_CARRY);
    }
    // nothing vanishes
    expect(out.flatMap((d) => d.items)).toHaveLength(5);
  });

  it('leaves done work where it was', () => {
    const out = reschedule(plan, new Set(['2026-09-20:L1']), '2026-09-22');
    expect(out[0].items.map((i) => i.lessonId)).toEqual(['L1']);
  });
});

describe('levelToBand', () => {
  it('maps the 0–100 scale onto half-bands', () => {
    expect(levelToBand(100)).toBe(9);
    expect(levelToBand(70)).toBe(6.5);
    expect(levelToBand(0)).toBe(0);
  });
});
