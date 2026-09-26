import type { DailyProgress, DimensionKey, Session, StreakInfo } from '@/types';
import { computeDueReviews } from './mistakes';

/**
 * Smart next action — ONE ranked brain for "what should I do now?".
 *
 * Every suggestion is computed from real learner state (sessions, streak,
 * today's progress, spaced-repetition due dates). Nothing decorative:
 * if the engine says "save your streak", the streak really is at risk.
 *
 * Pure + synchronous → unit-tested and cheap to run on every render.
 */

export interface NextAction {
  href: string;
  emoji: string;
  label: string;
  sub: string;
  /** the evidence sentence — why THIS action, right now */
  why: string;
  /** honest time estimate in minutes */
  minutes: number;
}

export interface NextActionInput {
  sessions: Session[];
  streak: Pick<StreakInfo, 'current' | 'atRisk' | 'goalMetToday' | 'dailyGoalMin'>;
  /** today's progress (first matching entry of the daily array) */
  today: DailyProgress | null;
  /** word-bank SRS cards whose due timestamp passed */
  dueCards: number;
  /** osyn:guide-last exists — learner stopped mid-guide */
  hasLastGuide: boolean;
  /** local hour 0–23, used only for copy, never for ranking */
  hour: number;
  now?: number;
}

/** weakest dimension across the most recent sessions (mirrors coachNote) */
export function weakestDimension(sessions: Session[], window = 8): { key: DimensionKey; avg: number } | null {
  const agg: Record<string, number[]> = {};
  for (const s of sessions.slice(0, window)) {
    for (const [k, v] of Object.entries(s.dimensionScores)) {
      if (typeof v === 'number' && v >= 0) (agg[k] ??= []).push(v);
    }
  }
  const dims = Object.entries(agg)
    .map(([k, vs]) => ({ key: k as DimensionKey, avg: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => a.avg - b.avg);
  return dims[0] ?? null;
}

/** where to drill a given dimension */
export const DIMENSION_ROUTE: Record<DimensionKey, { href: string; drill: string }> = {
  pronunciation: { href: '/ielts/', drill: 'pronunciation drills' },
  fluency: { href: '/impromptu/', drill: 'fluency reps' },
  grammar: { href: '/coach/', drill: 'grammar coaching' },
  vocabulary: { href: '/toefl/', drill: 'vocabulary guides' },
  fillers: { href: '/impromptu/', drill: 'filler-free reps' },
  pace: { href: '/impromptu/', drill: 'paced reps' },
  clarity: { href: '/coach/', drill: 'clarity coaching' },
};

export function smartNextActions(input: NextActionInput, limit = 3): NextAction[] {
  const { sessions, streak, today, dueCards, hasLastGuide, now = Date.now() } = input;
  const out: NextAction[] = [];

  // 1. streak about to break → the cheapest save first
  const goalSec = (today?.goalSec ?? streak.dailyGoalMin * 60) || 600;
  const spokenSec = today?.spokenSec ?? 0;
  const leftMin = Math.max(1, Math.ceil((goalSec - spokenSec) / 60));
  if (streak.atRisk && !streak.goalMetToday && streak.current > 0) {
    out.push({
      href: '/impromptu/',
      emoji: '🔥',
      label: `Save your ${streak.current}-day streak`,
      sub: `${leftMin} more minute${leftMin === 1 ? '' : 's'} of speaking keeps it alive`,
      why: `No goal today yet — the streak breaks at midnight.`,
      minutes: leftMin,
    });
  }

  // 2. spaced-repetition debt: word bank cards
  if (dueCards > 0) {
    out.push({
      href: '/ielts/study/',
      emoji: '🃏',
      label: `${dueCards} Word Bank card${dueCards === 1 ? '' : 's'} due`,
      sub: 'A 2-minute review keeps them in long-term memory',
      why: 'Cards past their review date lose retention fast.',
      minutes: 2,
    });
  }

  // 3. drill review that SRS says is overdue
  const dueDrill = computeDueReviews(sessions, new Date(now))[0];
  if (dueDrill) {
    out.push({
      href: dueDrill.href,
      emoji: '🔁',
      label: `Review: ${dueDrill.title}`,
      sub: `${dueDrill.attempts} attempt${dueDrill.attempts === 1 ? '' : 's'} · ${dueDrill.overdueDays > 0 ? `${dueDrill.overdueDays}d overdue` : 'due today'}`,
      why: `Spaced repetition says this one is ripe (${dueDrill.intervalDays}-day interval).`,
      minutes: 3,
    });
  }

  // 4. weakest dimension, only when it actually needs work (< 65)
  const weak = weakestDimension(sessions);
  if (weak && weak.avg < 65) {
    const route = DIMENSION_ROUTE[weak.key];
    out.push({
      href: route.href,
      emoji: '🎯',
      label: `Train ${weak.key} (~${Math.round(weak.avg)})`,
      sub: `Your lowest dimension across recent sessions — ${route.drill}`,
      why: `Averaging ${Math.round(weak.avg)}/100 on ${weak.key} over your last sessions.`,
      minutes: 5,
    });
  }

  // 5. daily goal still open (only if streak isn't already screaming,
  //    and only for learners who have actually spoken before — a brand-new
  //    user should see "first rep", not a goal countdown)
  if (sessions.length > 0 && spokenSec < goalSec && !out.some((a) => a.emoji === '🔥')) {
    out.push({
      href: '/impromptu/',
      emoji: '⏱️',
      label: `${leftMin} min to today's goal`,
      sub: `${Math.floor(spokenSec / 60)} of ${Math.ceil(goalSec / 60)} minutes spoken today`,
      why: `Daily goal is ${Math.ceil(goalSec / 60)} minutes — consistency beats intensity.`,
      minutes: leftMin,
    });
  }

  // 6. continue where you stopped
  if (hasLastGuide) {
    out.push({
      href: '/toefl/',
      emoji: '📖',
      label: 'Continue your last guide',
      sub: 'Guide Library remembers where you stopped',
      why: 'You stopped mid-guide — finishing it costs minutes.',
      minutes: 4,
    });
  }

  // 7. reflect on the latest report
  const last = sessions[0];
  if (last) {
    out.push({
      href: `/report?id=${last.reportId}`,
      emoji: '📊',
      label: 'Re-read your last report',
      sub: `${new Date(last.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · see what moved`,
      why: 'Reviewing feedback shortly after a rep doubles retention.',
      minutes: 2,
    });
  }

  // 8. nothing at all → first rep
  if (out.length === 0) {
    out.push({
      href: '/impromptu/',
      emoji: '🎙️',
      label: 'Do your first speaking rep',
      sub: '60 seconds is enough to start the streak',
      why: 'Every plan starts with one recorded minute.',
      minutes: 1,
    });
  }

  return out.slice(0, limit);
}
