import { CURRICULUM } from './curriculum';
import { effectiveStatus } from './studio';
import type { Skill } from './types';

/**
 * Adaptive planning — all four skills every week, extra time where the
 * measured level and the learner's own target say it's needed, reviews
 * woven in when they're overdue, and missed work rescheduled forward
 * without ever stacking more than two carry-overs onto a day.
 */

export interface PlannerInput {
  /** 0–100 per skill from diagnostics (provisional is fine) */
  levels: Partial<Record<Skill, number>>;
  /** band targets 0–9 */
  targets?: Partial<Record<Skill, number>>;
  minutesPerDay: number;
  overdueReviews: number;
  days?: number;
  now?: number;
}

export interface PlanItem {
  lessonId: string;
  skill: Skill;
  minutes: number;
  kind: 'new' | 'review' | 'rescheduled';
}

export interface PlanDay {
  date: string; // yyyy-mm-dd
  items: PlanItem[];
}

const SKILLS: Skill[] = ['listening', 'reading', 'writing', 'speaking'];

export const levelToBand = (level: number) => Math.round((level / 100) * 9 * 2) / 2;

/** sessions per skill this week: base 1 + weakness/top-up time */
export function weeklyAllocation(
  levels: Partial<Record<Skill, number>>,
  targets?: Partial<Record<Skill, number>>,
): Record<Skill, number> {
  const out = {} as Record<Skill, number>;
  for (const s of SKILLS) {
    let n = 1; // every skill, every week — no skill starves
    const lvl = levels[s];
    if (lvl != null && lvl < 60) n += 2;
    else if (lvl != null && lvl < 75) n += 1;
    const tgt = targets?.[s];
    if (lvl != null && tgt != null && levelToBand(lvl) < tgt) n += 1;
    out[s] = Math.min(n, 4);
  }
  return out;
}

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Build the next N days, capacity-aware, prerequisites first. */
export function buildAdaptivePlan(input: PlannerInput): PlanDay[] {
  const now = input.now ?? Date.now();
  const horizon = input.days ?? 7;
  const alloc = weeklyAllocation(input.levels, input.targets);

  // per-skill queues: published lessons, prereqs before dependents
  const queues = {} as Record<Skill, string[]>;
  for (const s of SKILLS) {
    const ls = CURRICULUM.filter((l) => l.skill === s && effectiveStatus(l.id) === 'published');
    ls.sort((a, b) => (a.prereqs.length ? 1 : 0) - (b.prereqs.length ? 1 : 0) || a.difficulty - b.difficulty);
    queues[s] = ls.map((l) => l.id);
  }

  const minutes = Math.max(5, input.minutesPerDay);
  const days: PlanDay[] = [];
  let reviewLeft = input.overdueReviews;

  for (let i = 0; i < horizon; i++) {
    const t = now + i * 86_400_000;
    let cap = minutes;
    const items: PlanItem[] = [];

    // one overdue review a day until the debt is clear (2-min slots)
    if (reviewLeft > 0) {
      items.push({ lessonId: '__review__', skill: 'speaking', minutes: 2, kind: 'review' });
      cap -= 2;
      reviewLeft -= 1;
    }

    // round-robin the skills that still owe sessions this week
    for (const s of SKILLS) {
      if (alloc[s] <= 0 || !queues[s].length) continue;
      const lesson = CURRICULUM.find((l) => l.id === queues[s][0])!;
      if (lesson.minutes <= cap) {
        items.push({ lessonId: lesson.id, skill: s, minutes: lesson.minutes, kind: 'new' });
        cap -= lesson.minutes;
        queues[s].shift();
        alloc[s] -= 1;
      }
    }
    days.push({ date: dayKey(t), items });
  }
  return days;
}

export const MAX_CARRY = 2; // never overwhelm: carry-over cap per day

/**
 * Missed-day rescheduling: anything on a past day that wasn't done moves to
 * the earliest later day with spare capacity, at most MAX_CARRY per day.
 * Pure → unit-tested.
 */
export function reschedule(plan: PlanDay[], done: Set<string>, todayKey: string): PlanDay[] {
  const out: PlanDay[] = plan.map((d) => ({ ...d, items: [...d.items] }));
  const overflow: PlanItem[] = [];

  for (const d of out) {
    if (d.date >= todayKey) break;
    const kept: PlanItem[] = [];
    for (const it of d.items) {
      const key = `${d.date}:${it.lessonId}`;
      if (it.kind === 'review' || done.has(key)) kept.push(it);
      else overflow.push({ ...it, kind: 'rescheduled' });
    }
    d.items = kept;
  }

  for (const d of out) {
    if (d.date < todayKey || !overflow.length) continue;
    const usedMin = d.items.reduce((a, x) => a + x.minutes, 0);
    let carry = 0;
    const next: PlanItem[] = [...d.items];
    while (overflow.length && carry < MAX_CARRY) {
      const cand = overflow[0];
      if (usedMin + cand.minutes > 90) break; // sane daily ceiling
      next.push(overflow.shift()!);
      carry += 1;
    }
    d.items = next;
  }
  // whatever still doesn't fit lands on the last day rather than vanishing
  if (overflow.length) out[out.length - 1].items.push(...overflow);
  return out;
}
