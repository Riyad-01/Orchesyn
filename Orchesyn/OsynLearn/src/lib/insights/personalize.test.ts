import { describe, expect, it } from 'vitest';
import {
  CANONICAL_START_ORDER,
  examCountdown,
  paceAdvice,
  personalStartOrder,
  targetGap,
} from './personalize';

const NOW = 1_750_000_000_000;
const day = 86_400_000;

describe('examCountdown', () => {
  it('counts whole days and flags urgency inside 3 weeks', () => {
    const soon = new Date(NOW + 10 * day).toISOString();
    expect(examCountdown(soon, NOW)).toEqual({ days: 10, urgent: true });
    const far = new Date(NOW + 90 * day).toISOString();
    expect(examCountdown(far, NOW)).toEqual({ days: 90, urgent: false });
  });
  it('returns null without a date, with a bad date, or after the exam', () => {
    expect(examCountdown(undefined, NOW)).toBeNull();
    expect(examCountdown('not-a-date', NOW)).toBeNull();
    expect(examCountdown(new Date(NOW - day).toISOString(), NOW)).toBeNull();
  });
});

describe('targetGap', () => {
  it('measures against the learner\'s own target at 1dp', () => {
    expect(targetGap(6.2, 7)).toBe(0.8);
    expect(targetGap(7.5, 7)).toBe(-0.5);
  });
  it('stays silent without evidence', () => {
    expect(targetGap(null, 7)).toBeNull();
    expect(targetGap(6.5, undefined)).toBeNull();
  });
});

describe('paceAdvice', () => {
  it('produces an honest weekly rate when a countdown exists', () => {
    const a = paceAdvice(1.5, { days: 35, urgent: false });
    expect(a).toContain('1.5');
    expect(a).toContain('35 days');
    expect(a).toContain('+0.3/week');
  });
  it('says nothing when the target is already beaten', () => {
    expect(paceAdvice(-0.5, { days: 30, urgent: false })).toBeNull();
    expect(paceAdvice(null, null)).toBeNull();
  });
});

describe('personalStartOrder', () => {
  it('puts the trainer for the weakest dimension first', () => {
    expect(personalStartOrder('grammar')[0]).toBe('/coach');
    expect(personalStartOrder('pronunciation')[0]).toBe('/ielts');
    expect(personalStartOrder('pace')[0]).toBe('/lab');
  });
  it('keeps every surface exactly once and falls back canonically', () => {
    expect([...personalStartOrder('grammar')].sort()).toEqual([...CANONICAL_START_ORDER].sort());
    expect(personalStartOrder(null)).toEqual(CANONICAL_START_ORDER);
    expect(personalStartOrder('unknown-dim')).toEqual(CANONICAL_START_ORDER);
  });
});
