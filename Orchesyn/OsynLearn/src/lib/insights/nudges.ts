/**
 * Live coaching nudges — real-time feedback WHILE the learner speaks
 * (competitor parity: ELSA / Loora "corrections appear in conversation").
 *
 * Two detectors:
 *  - filler nudge: the live transcript just ended on a filler word
 *  - silence nudge: no new words for a while during an active recording
 *
 * Pure and synchronous so it is trivially unit-testable and cheap to run
 * on every interim update.
 */

export interface Nudge {
  id: string;
  text: string;
  tone: 'warn' | 'good';
  at: number;
}

const FILLER_NUDGES: [RegExp, string][] = [
  [/\b(u+m+|u+h+|er+)\s*$/i, 'Silence beats "um" — pause, don\'t hum.'],
  [/\byou know\s*$/i, 'Drop "you know" — they\'re following you.'],
  [/\blike\s*$/i, 'Skip the "like" — say the fact straight.'],
  [/\bbasically\s*$/i, 'Cut "basically" — start with the point.'],
  [/\bactually\s*$/i, '"Actually" only for real corrections.'],
  [/\bi mean\s*$/i, 'Trust your first wording — skip "I mean".'],
  [/\bkind of\s*$/i, 'Commit — no "kind of".'],
  [/\bsort of\s*$/i, 'Commit — no "sort of".'],
];

/** If the live transcript currently ends in a filler, return a nudge. */
export function detectFillerNudge(interim: string, at = Date.now()): Nudge | null {
  const t = interim.trim();
  if (!t) return null;
  for (const [re, text] of FILLER_NUDGES) {
    if (re.test(t)) return { id: `filler:${re.source}`, text, tone: 'warn', at };
  }
  return null;
}

export const SILENCE_THRESHOLD_MS = 4000;

/** When the speaker goes quiet mid-session, suggest a stall phrase. */
export function detectSilenceNudge(silenceMs: number, at = Date.now()): Nudge | null {
  if (silenceMs < SILENCE_THRESHOLD_MS) return null;
  return {
    id: 'silence',
    text: 'Blank? Stall like a pro: "That\'s an interesting point — let me think for a second…"',
    tone: 'warn',
    at,
  };
}

/** Nudges expire so the chip never lingers over old advice. */
export const NUDGE_TTL_MS = 4000;

export function isFresh(n: Nudge, now = Date.now()): boolean {
  return now - n.at < NUDGE_TTL_MS;
}
