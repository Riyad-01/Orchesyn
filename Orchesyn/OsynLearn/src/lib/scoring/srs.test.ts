import { describe, expect, it } from 'vitest';
import { DAY, LEARN_STEP, buildPlan, dueCards, gradeCard, newCard, planFeasible } from './srs';

describe('spaced repetition', () => {
  const now = 1_000_000;

  it('a miss reschedules in 10 minutes and resets reps', () => {
    const c = gradeCard({ ...newCard('x', now), interval: 4, reps: 3 }, 'again', now);
    expect(c.due).toBe(now + LEARN_STEP);
    expect(c.interval).toBe(0);
    expect(c.lapses).toBe(1);
  });

  it('a hit doubles spacing 1d → 2d → 4d, capped at 60d', () => {
    let c = newCard('x', now);
    c = gradeCard(c, 'good', now);
    expect(c.interval).toBe(1);
    c = gradeCard(c, 'good', now);
    expect(c.interval).toBe(2);
    for (let i = 0; i < 10; i++) c = gradeCard(c, 'good', now);
    expect(c.interval).toBeLessThanOrEqual(60);
  });

  it('dueCards only returns cards whose time has come', () => {
    const due = newCard('a', now - 1);
    const later = { ...newCard('b', now), due: now + DAY };
    expect(dueCards([due, later], now).map((c) => c.id)).toEqual(['a']);
  });
});

describe('band planner', () => {
  it('produces one week per requested week, rotating focus', () => {
    const plan = buildPlan(5.5, 7, 10);
    expect(plan).toHaveLength(10);
    expect(plan[0].focus).not.toBe(plan[1].focus);
    expect(plan[0].action).toContain('week 1');
  });

  it('flags unrealistic timelines honestly', () => {
    expect(planFeasible(5, 9, 4).ok).toBe(false);
    expect(planFeasible(5.5, 7, 12).ok).toBe(true);
    expect(planFeasible(7, 6.5, 8).note).toContain('maintenance');
  });
});
