import type { WordToken } from '@/types';
import { clamp, countSyllables, piecewise, round1, type Token } from './text';

/**
 * Pace & delivery rate.
 *
 * Research and IELTS band descriptors put a strong, comprehensible monologue at
 * roughly 110-165 words per minute. Below ~95 sounds laboured; above ~190 the
 * listener loses the thread. Syllables-per-second is the cross-accent comparable
 * measure (native range ≈ 4.0-5.5 sps).
 */

export const IDEAL_WPM_MIN = 110;
export const IDEAL_WPM_MAX = 165;
export const IDEAL_SPS_MIN = 3.9;
export const IDEAL_SPS_MAX = 5.6;

/** Below this many words a words-per-minute figure is meaningless. */
export const MIN_WORDS_FOR_PACE = 5;

export interface PaceResult {
  wpm: number;
  /** words per minute with pauses removed */
  artRate: number;
  syllablesPerSec: number;
  totalSyllables: number;
  score: number;
  verdict: string;
  /** direction the learner should push, for the tip text */
  direction: 'slower' | 'faster' | 'steady';
}

export function analysePace(
  tokens: Token[],
  words: WordToken[],
  durationMs: number,
  totalPauseMs: number,
  band?: readonly [number, number],
): PaceResult {
  const spokenWords = tokens.filter((t) => t.word).length;
  const minutes = durationMs / 60000;
  const wpm = minutes > 0 ? round1(spokenWords / minutes) : 0;
  // Too few words to establish a rate: report unmeasurable rather than "0 wpm = failed".
  if (spokenWords < MIN_WORDS_FOR_PACE || durationMs <= 0) {
    return { wpm, artRate: 0, syllablesPerSec: 0, totalSyllables: 0, score: -1, verdict: 'Not enough speech', direction: 'steady' };
  }

  const speakingSec = Math.max((durationMs - totalPauseMs) / 1000, 0.001);
  const artRate = round1((spokenWords / speakingSec) * 60);

  const totalSyllables = tokens.reduce((a, t) => a + countSyllables(t.word), 0);
  const syllablesPerSec = round1(totalSyllables / speakingSec);

  const score = scorePace(wpm, artRate, syllablesPerSec, words.length > 0, band);
  const [bLo, bHi] = band ?? [IDEAL_WPM_MIN, IDEAL_WPM_MAX];
  const direction: PaceResult['direction'] =
    wpm < bLo ? 'faster' : wpm > bHi ? 'slower' : 'steady';
  const verdict = verdictFor(wpm, score, band);

  return { wpm, artRate, syllablesPerSec, totalSyllables, score, verdict, direction };
}

export function scorePace(
  wpm: number,
  artRate: number,
  syllablesPerSec: number,
  hasTimings: boolean,
  /** per-language comfortable band (see i18n catalogue); English default */
  band?: readonly [number, number],
): number {
  const [lo, hi] = band ?? [IDEAL_WPM_MIN, IDEAL_WPM_MAX];
  // Primary: overall WPM against the ideal band.
  let score: number;
  if (wpm <= 0) return 0;
  if (wpm < lo) {
    score = piecewise(wpm, [[Math.max(20, lo - 70), 20], [lo - 40, 45], [lo - 15, 72], [lo, 92]]);
  } else if (wpm <= hi) {
    // inside the ideal band: mid-band is best
    const mid = (lo + hi) / 2;
    score = piecewise(Math.abs(wpm - mid), [[0, 100], [Math.max(5, mid - lo), 92]]);
  } else {
    score = piecewise(wpm, [[hi, 92], [hi + 20, 76], [hi + 40, 62], [hi + 65, 45], [hi + 95, 30]]);
  }

  // Secondary: articulation rate that is far above WPM means long silent gaps,
  // so the learner is fast-but-choppy rather than fluent.
  if (hasTimings && artRate > 0) {
    const ratio = artRate / Math.max(wpm, 1);
    if (ratio > 1.6) score -= Math.min(14, (ratio - 1.6) * 18);
    // syllable rate sanity check
    if (syllablesPerSec > IDEAL_SPS_MAX + 1.2) score -= 8;
    else if (syllablesPerSec > 0 && syllablesPerSec < IDEAL_SPS_MIN - 0.9) score -= 6;
  }

  return clamp(Math.round(score));
}

function verdictFor(wpm: number, score: number, band?: readonly [number, number]): string {
  const [lo, hi] = band ?? [IDEAL_WPM_MIN, IDEAL_WPM_MAX];
  if (wpm <= 0) return 'No speech detected';
  if (score >= 88) return 'Natural pace';
  if (wpm < 85) return 'Very slow';
  if (wpm < lo) return 'Slightly slow';
  if (wpm > 205) return 'Far too fast';
  if (wpm > hi) return 'Rushed';
  return 'Acceptable pace';
}

/** Human-readable pace guidance used in the tips list. */
export function paceAdvice(result: PaceResult): string {
  if (result.wpm <= 0) return 'Try to speak continuously — the timer needs a few sentences to judge pace.';
  if (result.direction === 'faster') {
    return `You spoke ${result.wpm} wpm. Native monologue sits at ${IDEAL_WPM_MIN}-${IDEAL_WPM_MAX} wpm — link short phrases together and cut the pauses between them.`;
  }
  if (result.direction === 'slower') {
    return `You spoke ${result.wpm} wpm, above the ${IDEAL_WPM_MIN}-${IDEAL_WPM_MAX} wpm comfort zone. Pause at commas instead of speeding through the sentence.`;
  }
  return `${result.wpm} wpm is inside the natural ${IDEAL_WPM_MIN}-${IDEAL_WPM_MAX} wpm band. Keep it there under exam pressure too.`;
}
