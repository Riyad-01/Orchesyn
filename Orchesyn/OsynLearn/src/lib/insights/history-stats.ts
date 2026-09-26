import type { Session } from '@/types';

/**
 * History intelligence — pure functions over sessions.
 * Trends compare the last 7 days against the previous 7; the coach note
 * turns the numbers into one human sentence + one action.
 */

const DAY = 86_400_000;

export interface HistoryStats {
  count: number;
  weekCount: number;
  totalMin: number;
  avg: number; // last 7 days overall
  prevAvg: number;
  trendPct: number; // avg - prevAvg (points)
  best: Session | null;
}

export function historyStats(sessions: Session[], now = Date.now()): HistoryStats {
  const inLast = (s: Session, days: number, offset = 0) => {
    const t = new Date(s.startedAt).getTime();
    return t > now - (days + offset) * DAY && t <= now - offset * DAY;
  };
  const week = sessions.filter((s) => inLast(s, 7));
  const prev = sessions.filter((s) => inLast(s, 7, 7));
  const avgOf = (list: Session[]) => (list.length ? list.reduce((n, s) => n + s.overall, 0) / list.length : 0);
  const avg = avgOf(week);
  const prevAvg = avgOf(prev);
  const best = sessions.length ? sessions.reduce((b, s) => (s.overall > b.overall ? s : b), sessions[0]) : null;
  return {
    count: sessions.length,
    weekCount: week.length,
    totalMin: Math.round(sessions.reduce((n, s) => n + s.spokenSec, 0) / 60),
    avg: Math.round(avg),
    prevAvg: Math.round(prevAvg),
    trendPct: Math.round(avg - prevAvg),
    best,
  };
}

export interface CoachNote {
  emoji: string;
  headline: string;
  body: string;
  href: string;
  cta: string;
}

export function coachNote(sessions: Session[], now = Date.now()): CoachNote {
  const st = historyStats(sessions, now);
  const recent = sessions.slice(0, 8);
  // weakest dimension across recent sessions
  const agg: Record<string, number[]> = {};
  for (const s of recent) {
    for (const [k, v] of Object.entries(s.dimensionScores)) {
      if (typeof v === 'number' && v >= 0) (agg[k] ??= []).push(v);
    }
  }
  const dims = Object.entries(agg)
    .map(([k, vs]) => ({ k, avg: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => a.avg - b.avg);
  const weakest = dims[0];

  if (st.count === 0) {
    return { emoji: '🌱', headline: 'Your first rep is the hardest — and the most valuable', body: 'Sixty seconds on any topic starts your streak and your data.', href: '/impromptu', cta: 'Do 60 seconds' };
  }
  if (st.weekCount === 0) {
    return { emoji: '🔥', headline: 'A quiet week — one rep restarts the engine', body: 'Momentum compounds; rust doesn’t discriminate. Two minutes is enough.', href: '/impromptu', cta: 'Restart today' };
  }
  if (st.trendPct >= 4) {
    return { emoji: '📈', headline: `Up ${st.trendPct} points week-on-week — it’s working`, body: `Keep the recipe and stretch one dimension: ${weakest?.k ?? 'fluency'} is your next lever.`, href: '/roadmap', cta: 'See the plan' };
  }
  if (st.trendPct <= -4) {
    return { emoji: '🧭', headline: `A soft week (${st.trendPct} pts) — usually fatigue, not skill`, body: `Shorten the reps, not the streak: 5 focused minutes beat 20 tired ones. Focus: ${weakest?.k ?? 'fluency'}.`, href: '/roadmap', cta: 'Get an easy plan' };
  }
  return { emoji: '🎯', headline: `Steady at ${st.avg} — time to aim at ${weakest?.k ?? 'fluency'}`, body: `Your lowest recent dimension is ${weakest?.k ?? 'fluency'} (~${Math.round(weakest?.avg ?? 0)}). One targeted drill a day moves it within two weeks.`, href: '/roadmap', cta: 'Target it now' };
}

export type HistorySort = 'newest' | 'best' | 'longest';

export function sortSessions(list: Session[], sort: HistorySort): Session[] {
  const c = [...list];
  if (sort === 'best') c.sort((a, b) => b.overall - a.overall);
  else if (sort === 'longest') c.sort((a, b) => b.spokenSec - a.spokenSec);
  else c.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return c;
}

export function dayKey(startedAt: string): string {
  return new Date(startedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
