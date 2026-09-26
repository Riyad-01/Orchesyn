/**
 * Tiny spaced-repetition engine (SM-2 inspired, honest and boring).
 * Pure functions — the page layer persists to localStorage.
 */

export interface SrsCard {
  id: string;
  /** epoch ms when the card is due again */
  due: number;
  /** current interval in days (0 = learning step) */
  interval: number;
  reps: number;
  lapses: number;
}

export type SrsGrade = 'again' | 'good';

export const DAY = 86_400_000;
export const LEARN_STEP = 10 * 60_000; // 10 minutes

export function newCard(id: string, now: number): SrsCard {
  return { id, due: now, interval: 0, reps: 0, lapses: 0 };
}

export function gradeCard(card: SrsCard, grade: SrsGrade, now: number): SrsCard {
  if (grade === 'again') {
    return { ...card, interval: 0, reps: 0, lapses: card.lapses + 1, due: now + LEARN_STEP };
  }
  const interval = card.interval === 0 ? 1 : Math.min(60, card.interval * 2);
  return { ...card, interval, reps: card.reps + 1, due: now + interval * DAY };
}

export function dueCards(cards: SrsCard[], now: number): SrsCard[] {
  return cards.filter((c) => c.due <= now);
}

export function streakOf(cards: SrsCard[]): number {
  return cards.reduce((n, c) => n + c.reps, 0);
}

/* ------------------------------------------------------------------ */
/* Band goal planner                                                    */
/* ------------------------------------------------------------------ */

export interface PlanWeek {
  week: number;
  focus: string;
  action: string;
}

const FOCUS_CYCLE: { focus: string; action: string }[] = [
  { focus: 'Fluency & pacing', action: '2 speaking reps/day · keep fillers under 2 per minute' },
  { focus: 'Lexical resource', action: '10 Word Bank cards/day · use 3 new words in reps' },
  { focus: 'Grammar under pressure', action: '1 rep focused on tense accuracy · log errors same day' },
  { focus: 'Pronunciation & rhythm', action: '10 min shadowing with listening scripts' },
  { focus: 'Listening precision', action: '1 listening set · study the transcript after checking' },
  { focus: 'Reading speed', action: '1 passage timed · review every Not Given mistake' },
  { focus: 'Writing structure', action: '1 Task report · apply the examiner\'s top fix next time' },
  { focus: 'Mock & review', action: 'full mock or writing Task 2 · review Insights on Sunday' },
];

export function buildPlan(current: number, target: number, weeks: number): PlanWeek[] {
  const gap = Math.max(0.5, target - current);
  const perWeek = gap / Math.max(1, weeks);
  const out: PlanWeek[] = [];
  for (let w = 1; w <= weeks; w++) {
    const slot = FOCUS_CYCLE[(w - 1) % FOCUS_CYCLE.length];
    out.push({
      week: w,
      focus: slot.focus,
      action: `${slot.action} · aim +${(perWeek).toFixed(1).replace(/\.0$/, '')} band by week ${w}`,
    });
  }
  return out;
}

export function planFeasible(current: number, target: number, weeks: number): { ok: boolean; note: string } {
  const gap = target - current;
  if (gap <= 0) return { ok: true, note: 'You are already at (or above) your target — switch to maintenance mode.' };
  const perMonth = (gap / Math.max(1, weeks)) * 4;
  if (perMonth > 1) {
    return { ok: false, note: `+${gap.toFixed(1)} in ${weeks} weeks is very aggressive (realistic pace is ~0.5-1 band per 2-3 months). Extend the timeline or lower the target.` };
  }
  return { ok: true, note: `Realistic: ~${perMonth.toFixed(1)} band/month with daily practice. Trust the cycle.` };
}
