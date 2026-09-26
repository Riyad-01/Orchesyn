/**
 * Personalisation math — pure functions over the learner's real state.
 * Everything here is evidence-driven: countdowns use the exam date the
 * learner gave us, gaps compare their measured band to their own target,
 * and the start-rail order follows their weakest measured dimension.
 */

export interface ExamCountdown {
  days: number;
  /** ≤ 21 days → urgency copy */
  urgent: boolean;
}

export function examCountdown(examDate: string | undefined, now = Date.now()): ExamCountdown | null {
  if (!examDate) return null;
  const t = new Date(examDate).getTime();
  if (Number.isNaN(t)) return null;
  const days = Math.ceil((t - now) / 86_400_000);
  if (days < 0) return null; // exam passed — don't nag about the past
  return { days, urgent: days <= 21 };
}

/** measured band (0–9) vs the learner's own target → signed gap, 1 dp */
export function targetGap(currentBand: number | null, target: number | undefined): number | null {
  if (currentBand == null || target == null) return null;
  return Math.round((target - currentBand) * 10) / 10;
}

/**
 * Honest pacing advice: how many band points per week the gap requires
 * between now and the exam. Returns null when there is nothing to say.
 */
export function paceAdvice(gap: number | null, countdown: ExamCountdown | null): string | null {
  if (gap == null || gap <= 0) return null;
  if (!countdown) return `You're ${gap} band point${gap === 1 ? '' : 's'} under target — the roadmap closes gaps like this.`;
  if (countdown.days === 0) return 'Exam day — trust the reps, not the nerves.';
  const weeks = Math.max(1, countdown.days / 7);
  const perWeek = Math.round((gap / weeks) * 100) / 100;
  return `${gap} band point${gap === 1 ? '' : 's'} in ${countdown.days} days ≈ +${perWeek}/week — doable with daily reps.`;
}

/**
 * Start-rail order, personalised: the surface that trains your weakest
 * measured dimension comes first. Falls back to the canonical order.
 */
export type StartHref = '/impromptu' | '/coach' | '/ielts' | '/ai' | '/lab';

export const CANONICAL_START_ORDER: StartHref[] = ['/impromptu', '/coach', '/ielts', '/ai', '/lab'];

const WEAKNESS_FIRST: Record<string, StartHref[]> = {
  grammar: ['/coach', '/ai', '/impromptu', '/ielts', '/lab'],
  vocabulary: ['/ai', '/coach', '/impromptu', '/ielts', '/lab'],
  fillers: ['/impromptu', '/coach', '/lab', '/ai', '/ielts'],
  fluency: ['/impromptu', '/lab', '/coach', '/ai', '/ielts'],
  pace: ['/lab', '/impromptu', '/coach', '/ai', '/ielts'],
  pronunciation: ['/ielts', '/lab', '/impromptu', '/coach', '/ai'],
  clarity: ['/coach', '/lab', '/impromptu', '/ai', '/ielts'],
};

export function personalStartOrder(weakest: string | null | undefined): StartHref[] {
  if (!weakest) return CANONICAL_START_ORDER;
  return WEAKNESS_FIRST[weakest] ?? CANONICAL_START_ORDER;
}
