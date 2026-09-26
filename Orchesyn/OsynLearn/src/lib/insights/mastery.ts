/**
 * Progress that means something: repeated performance on UNSEEN material.
 * Streaks and minutes are motivation; this is the evidence.
 *
 * Every diagnostic/lesson independent attempt is a first (and only first)
 * exposure to that item — accuracy on first tries per skill is the learner's
 * true current level, and its movement over time is true progress.
 */

import type { Skill } from '@/lib/curriculum/types';

const LS = 'stim:mastery';

interface Bucket {
  firstTry: number;
  firstTryCorrect: number;
  total: number;
  correct: number;
}

type Store = Partial<Record<Skill, Bucket>>;

function read(): Store {
  try {
    return JSON.parse(window.localStorage.getItem(LS) ?? '{}') as Store;
  } catch {
    return {};
  }
}

export function recordUnseenAttempt(skill: Skill, correct: boolean, firstTry: boolean): void {
  const s = read();
  const b = (s[skill] ??= { firstTry: 0, firstTryCorrect: 0, total: 0, correct: 0 });
  b.total += 1;
  if (correct) b.correct += 1;
  if (firstTry) {
    b.firstTry += 1;
    if (correct) b.firstTryCorrect += 1;
  }
  window.localStorage.setItem(LS, JSON.stringify(s));
}

/** 0–100 accuracy on unseen material for a skill, or null with no evidence */
export function unseenAccuracy(skill: Skill): number | null {
  const b = read()[skill];
  if (!b || b.firstTry === 0) return null;
  return Math.round((b.firstTryCorrect / b.firstTry) * 100);
}

export function overallUnseenAccuracy(): number | null {
  const s = read();
  let n = 0;
  let c = 0;
  for (const b of Object.values(s)) {
    if (!b) continue;
    n += b.firstTry;
    c += b.firstTryCorrect;
  }
  return n ? Math.round((c / n) * 100) : null;
}
