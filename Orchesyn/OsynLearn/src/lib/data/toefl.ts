/**
 * TOEFL iBT Speaking practice (2026 format): two task types.
 *
 *  - Listen & Repeat : the app speaks a sentence (browser TTS, offline-capable),
 *                      the learner repeats it; scored like ETS's fluency +
 *                      intelligibility rubric (pronunciation-weighted).
 *  - Interview       : an open question answered in 45 s, scored on fluency,
 *                      language use and topic development.
 *
 * Content is data-only (~2 KB) — the scoring engine and SessionFlow do the rest.
 */

export interface ToeflTask {
  id: string;
  kind: 'repeat' | 'interview';
  /** the sentence to repeat, or the question to answer */
  prompt: string;
  prepSec: number;
  targetSec: number;
  tip: string;
}

export const TOEFL_TASKS: ToeflTask[] = [
  {
    id: 'toefl-r1',
    kind: 'repeat',
    prompt: 'The library will remain open until midnight during final exam week.',
    prepSec: 0,
    targetSec: 15,
    tip: 'Copy the rhythm: stress LIBRARY, OPEN, MIDNIGHT.',
  },
  {
    id: 'toefl-r2',
    kind: 'repeat',
    prompt: 'Students who register before Friday receive a twenty percent discount.',
    prepSec: 0,
    targetSec: 15,
    tip: 'Keep the relative clause attached — no pause after "students".',
  },
  {
    id: 'toefl-r3',
    kind: 'repeat',
    prompt: 'Unfortunately, the field trip was postponed because of the storm warning.',
    prepSec: 0,
    targetSec: 15,
    tip: 'Let your voice fall on "postponed" — it is the news of the sentence.',
  },
  {
    id: 'toefl-r4',
    kind: 'repeat',
    prompt: 'The professor asked the class to submit the essay by the end of the week.',
    prepSec: 0,
    targetSec: 15,
    tip: 'Glide over "the / to / of"; hit PROFESSOR, SUBMIT, ESSAY.',
  },
  {
    id: 'toefl-i1',
    kind: 'interview',
    prompt: 'Some people prefer to study alone; others prefer to study in groups. Which do you prefer, and why?',
    prepSec: 5,
    targetSec: 45,
    tip: 'Position → reason → example → close, in under 45 seconds.',
  },
  {
    id: 'toefl-i2',
    kind: 'interview',
    prompt: 'Do you agree or disagree: it is better to live in a small town than in a big city.',
    prepSec: 5,
    targetSec: 45,
    tip: 'One clear side, two reasons, one concrete example.',
  },
  {
    id: 'toefl-i3',
    kind: 'interview',
    prompt: 'Describe a skill you learned outside of school and explain how it helps you now.',
    prepSec: 5,
    targetSec: 45,
    tip: 'Name the skill in your first sentence; spend the rest on the "how".',
  },
  {
    id: 'toefl-i4',
    kind: 'interview',
    prompt: 'Your university wants to add a new café or a new gym. Which should it choose, and why?',
    prepSec: 5,
    targetSec: 45,
    tip: 'Pick fast, justify with who benefits and how often.',
  },
];

export function getToeflTask(id: string): ToeflTask | undefined {
  return TOEFL_TASKS.find((t) => t.id === id);
}
