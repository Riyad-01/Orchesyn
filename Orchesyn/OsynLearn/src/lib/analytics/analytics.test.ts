import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { track, readEvents, summarise, clearAnalytics, MAX_EVENTS } from './index';

/** deterministic fake storage + clock so retention windows are testable */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const DAY = 86_400_000;

describe('analytics (on-device, privacy-conscious)', () => {
  let now: number;
  beforeEach(() => {
    now = Date.parse('2026-09-01T00:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('records events with timestamps and never stores content or ids beyond event fields', () => {
    const s = fakeStorage();
    track({ name: 'diagnostic_completed', kind: 'screening' }, s);
    const ev = readEvents(s);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toEqual({ name: 'diagnostic_completed', kind: 'screening', at: now });
  });

  it('bounds the ring buffer at MAX_EVENTS', () => {
    const s = fakeStorage();
    for (let i = 0; i < MAX_EVENTS + 20; i++) track({ name: 'conversion', plan: 'prep' }, s);
    expect(readEvents(s)).toHaveLength(MAX_EVENTS);
  });

  it('computes week-1 retention from activity days, unknown before the window elapses', () => {
    const s = fakeStorage();
    track({ name: 'activity', kind: 'session', minutes: 10 }, s); // day 0
    vi.setSystemTime(now + 3 * DAY);
    track({ name: 'activity', kind: 'lesson', minutes: 5 }, s); // day 3 → week-1 retained
    let sum = summarise(readEvents(s), now + 3 * DAY);
    expect(sum.week1Retained).toBeNull(); // window (7d) not elapsed yet — honest unknown
    sum = summarise(readEvents(s), now + 8 * DAY);
    expect(sum.week1Retained).toBe(true);
  });

  it('reports week-1 lapse only after the full window with no activity', () => {
    const s = fakeStorage();
    track({ name: 'activity', kind: 'session', minutes: 10 }, s);
    const sum = summarise(readEvents(s), now + 9 * DAY);
    expect(sum.week1Retained).toBe(false);
    expect(sum.week4Retained).toBeNull();
  });

  it('aggregates funnel + economics metrics', () => {
    const s = fakeStorage();
    track({ name: 'diagnostic_completed', kind: 'screening' }, s);
    track({ name: 'first_corrected_retry', lessonId: 'L1' }, s);
    track({ name: 'activity', kind: 'session', minutes: 12 }, s);
    vi.setSystemTime(now + DAY);
    track({ name: 'activity', kind: 'mock', minutes: 13 }, s);
    track({ name: 'conversion', plan: 'prep' }, s);
    vi.setSystemTime(now + 2 * DAY);
    track({ name: 'cancellation', plan: 'prep' }, s);
    track({ name: 'ai_cost', usdCents: 7 }, s);
    track({ name: 'ai_cost', usdCents: 3 }, s);
    const sum = summarise(readEvents(s), now + 2 * DAY);
    expect(sum.diagnosticsCompleted).toBe(1);
    expect(sum.firstCorrectedRetries).toBe(1);
    expect(sum.activeMinutes).toBe(25);
    expect(sum.activeDays).toBe(2);
    expect(sum.conversions).toBe(1);
    expect(sum.cancellations).toBe(1);
    expect(sum.aiCostUsdCents).toBe(10);
    expect(sum.aiCostCentsPerActiveDay).toBe(5);
  });

  it('clearAnalytics erases everything (settings privacy promise)', () => {
    const s = fakeStorage();
    track({ name: 'conversion', plan: 'prep' }, s);
    clearAnalytics(s);
    expect(readEvents(s)).toEqual([]);
  });

  it('survives corrupt storage without throwing', () => {
    const s = fakeStorage();
    s.setItem('osyn:analytics', '{oops');
    expect(readEvents(s)).toEqual([]);
  });
});
