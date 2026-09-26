import type { FeedbackReport, Session } from '@/types';

/**
 * Mistake Book + spaced revisits.
 *
 * The Mistake Book aggregates every recurring issue across all stored reports
 * (fillers, grammar rules, mispronounced words, basic word choices, long
 * pauses) into a single reviewable book with counts, trends and fix tips.
 *
 * Spaced revisits implement the 1/3/7/14-day spacing schedule: a topic is
 * "due" when enough days have passed since the last attempt, with the
 * interval growing each successful repetition (distributed practice).
 */

export type MistakeKind = 'filler' | 'grammar' | 'pronunciation' | 'vocab' | 'pause';

export interface MistakeEntry {
  id: string;
  kind: MistakeKind;
  title: string;
  /** what the engine observed (quote / pattern) */
  detail: string;
  /** concrete fix the learner can apply next session */
  fix: string;
  count: number;
  firstHalf: number;
  secondHalf: number;
  lastAt: string;
  /** higher = more urgent to work on */
  severity: number;
}

export interface MistakeBook {
  entries: MistakeEntry[];
  totals: Record<MistakeKind, number>;
  reportsScanned: number;
  improving: number;
  worsening: number;
}

const FILLER_FIXES: Record<string, string> = {
  um: 'Swap the "um" for a closed-mouth pause. Silence reads as thinking; "um" reads as doubt.',
  uh: 'Catch the "uh" and stop instead. One second of silence sounds confident.',
  er: 'Replace the hesitation sound with a full stop, then restart the phrase.',
  like: 'Delete "like" before nouns and quotes. Say the fact straight: "It was huge", not "It was, like, huge".',
  'you know': 'Drop "you know" — assume the listener follows. It adds nothing and caps your fluency score.',
  actually: 'Use "actually" only for genuine corrections. As a sentence-starter it is a crutch.',
  basically: 'Cut "basically". If the sentence still works without it (it will), it was filler.',
  so: 'Starting every sentence with "so" sounds rehearsed. Begin with the subject instead.',
  'i mean': 'Say it once at most. Repeating "I mean" signals you do not trust your first wording.',
  'kind of': 'Commit. "It was difficult" beats "it was kind of difficult" every time.',
  'sort of': 'Commit to the adjective. Hedging quietly lowers your grammar impression.',
  right: 'Drop the "right?" check at the end of statements — tell, don’t ask.',
};

const VOCAB_UPGRADES: Record<string, string> = {
  good: 'excellent / compelling / solid',
  bad: 'poor / unacceptable / flawed',
  nice: 'pleasant / delightful / rewarding',
  big: 'substantial / considerable / vast',
  small: 'modest / minimal / slight',
  important: 'crucial / vital / pivotal',
  very: 'remarkably / strikingly / (delete it)',
  think: 'believe / reckon / am convinced',
  happy: 'delighted / thrilled / pleased',
  sad: 'disheartened / downcast / gloomy',
  easy: 'straightforward / effortless / simple',
  hard: 'demanding / gruelling / challenging',
  many: 'numerous / a wealth of / countless',
  get: 'obtain / receive / secure',
  thing: 'aspect / factor / element',
  stuff: 'material / content / details',
};

function fixForFiller(phrase: string): string {
  return FILLER_FIXES[phrase.toLowerCase()] ?? 'Pause instead of voicing it. Record yourself and count occurrences — awareness alone halves most fillers within a week.';
}

interface Bucket {
  count: number;
  firstHalf: number;
  secondHalf: number;
  lastAt: string;
}

function bump(map: Map<string, Bucket>, key: string, half: 0 | 1, at: string) {
  const b = map.get(key) ?? { count: 0, firstHalf: 0, secondHalf: 0, lastAt: at };
  b.count += 1;
  if (half === 0) b.firstHalf += 1;
  else b.secondHalf += 1;
  if (at > b.lastAt) b.lastAt = at;
  map.set(key, b);
}

export function buildMistakeBook(reportsIn: FeedbackReport[]): MistakeBook {
  const reports = [...reportsIn].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const mid = Math.floor(reports.length / 2);

  const fillers = new Map<string, Bucket & { example: string }>();
  const grammar = new Map<string, Bucket & { quote: string; correction: string; explanation: string; category: string }>();
  const pron = new Map<string, Bucket & { worst: number; reason: string; expected?: string; heard?: string }>();
  const vocab = new Map<string, Bucket>();
  const pauses: Bucket & { totalMs: number; worstMs: number } = {
    count: 0,
    firstHalf: 0,
    secondHalf: 0,
    lastAt: '',
    totalMs: 0,
    worstMs: 0,
  };

  reports.forEach((r, i) => {
    const half: 0 | 1 = i < mid ? 0 : 1;
    for (const f of r.fillers) {
      const key = f.phrase.toLowerCase();
      bump(fillers as Map<string, Bucket>, key, half, r.createdAt);
      const e = fillers.get(key)!;
      if (!('example' in e)) (e as { example: string }).example = f.phrase;
    }
    for (const g of r.grammarIssues) {
      const key = g.ruleId || g.category;
      bump(grammar as Map<string, Bucket>, key, half, r.createdAt);
      const e = grammar.get(key)!;
      e.quote = g.quote;
      e.correction = g.correction;
      e.explanation = g.explanation;
      e.category = g.category;
    }
    for (const p of r.pronunciationFlags) {
      const key = p.word.toLowerCase();
      bump(pron as Map<string, Bucket>, key, half, r.createdAt);
      const e = pron.get(key)!;
      e.worst = Math.min(e.worst ?? 100, p.score);
      e.reason = p.reason;
      e.expected = p.expected ?? e.expected;
      e.heard = p.heard ?? e.heard;
    }
    for (const v of r.vocabHighlights) {
      if (v.tier <= 2) bump(vocab, v.word.toLowerCase(), half, r.createdAt);
    }
    for (const pz of r.pauses) {
      if (pz.kind === 'long' || pz.kind === 'awkward') {
        pauses.count += 1;
        if (half === 0) pauses.firstHalf += 1;
        else pauses.secondHalf += 1;
        pauses.lastAt = r.createdAt > pauses.lastAt ? r.createdAt : pauses.lastAt;
        pauses.totalMs += pz.durationMs;
        pauses.worstMs = Math.max(pauses.worstMs, pz.durationMs);
      }
    }
  });

  const entries: MistakeEntry[] = [];

  for (const [phrase, b] of fillers) {
    entries.push({
      id: `filler:${phrase}`,
      kind: 'filler',
      title: `“${phrase}”`,
      detail: `Said ${b.count}× across your sessions${b.count >= 3 ? ' — a habit, not an accident' : ''}.`,
      fix: fixForFiller(phrase),
      count: b.count,
      firstHalf: b.firstHalf,
      secondHalf: b.secondHalf,
      lastAt: b.lastAt,
      severity: b.count,
    });
  }

  for (const [ruleId, b] of grammar) {
    entries.push({
      id: `grammar:${ruleId}`,
      kind: 'grammar',
      title: b.category === 'repetition' ? 'Self-repetition' : `Grammar · ${b.category}`,
      detail: `“${b.quote}” → “${b.correction}”. ${b.explanation}`,
      fix: `Re-say the corrected sentence out loud 3 times now: “${b.correction}”. Muscle memory beats memorising rules.`,
      count: b.count,
      firstHalf: b.firstHalf,
      secondHalf: b.secondHalf,
      lastAt: b.lastAt,
      severity: b.count * 2,
    });
  }

  for (const [word, b] of pron) {
    const heardBit = b.heard && b.expected ? ` Heard “${b.heard}”, expected “${b.expected}”.` : '';
    entries.push({
      id: `pron:${word}`,
      kind: 'pronunciation',
      title: `“${word}”`,
      detail: `Flagged ${b.count}× (worst clarity ${Math.round(b.worst)}/100).${heardBit}`,
      fix: `Slow it to syllables, exaggerate, then say it at speed: ${word.split(/(?<=[aeiouy])/i).join('-').toLowerCase()} → “${word}”. Three reps before your next session.`,
      count: b.count,
      firstHalf: b.firstHalf,
      secondHalf: b.secondHalf,
      lastAt: b.lastAt,
      severity: b.count * 2 + (100 - b.worst) / 25,
    });
  }

  const basicWords = [...vocab.entries()].sort((a, b) => b[1].count - a[1].count);
  if (basicWords.length > 0) {
    const top = basicWords.slice(0, 6);
    entries.push({
      id: 'vocab:basic',
      kind: 'vocab',
      title: 'Basic word choices',
      detail: `Most-repeated simple words: ${top.map(([w, b]) => `“${w}” ×${b.count}`).join(', ')}.`,
      fix: `Upgrade one per session: ${top
        .slice(0, 3)
        .map(([w]) => `${w} → ${VOCAB_UPGRADES[w] ?? 'a more precise synonym'}`)
        .join(' · ')}.`,
      count: top.reduce((n, [, b]) => n + b.count, 0),
      firstHalf: top.reduce((n, [, b]) => n + b.firstHalf, 0),
      secondHalf: top.reduce((n, [, b]) => n + b.secondHalf, 0),
      lastAt: top.reduce((m, [, b]) => (b.lastAt > m ? b.lastAt : m), ''),
      severity: 3,
    });
  }

  if (pauses.count > 0) {
    entries.push({
      id: 'pause:long',
      kind: 'pause',
      title: 'Long / awkward pauses',
      detail: `${pauses.count} pauses over 2s (worst ${(pauses.worstMs / 1000).toFixed(1)}s, avg ${(pauses.totalMs / Math.max(1, pauses.count) / 1000).toFixed(1)}s).`,
      fix: 'When you feel the blank, use a stall phrase instead of silence: “That’s an interesting point — let me think for a second.”',
      count: pauses.count,
      firstHalf: pauses.firstHalf,
      secondHalf: pauses.secondHalf,
      lastAt: pauses.lastAt,
      severity: pauses.count,
    });
  }

  entries.sort((a, b) => b.severity - a.severity);

  const totals: Record<MistakeKind, number> = { filler: 0, grammar: 0, pronunciation: 0, vocab: 0, pause: 0 };
  for (const e of entries) totals[e.kind] += e.count;

  const improving = entries.filter((e) => e.secondHalf < e.firstHalf).length;
  const worsening = entries.filter((e) => e.secondHalf > e.firstHalf).length;

  return { entries, totals, reportsScanned: reports.length, improving, worsening };
}

/* ------------------------------------------------------------------ *
 * Spaced revisits (distributed practice)
 * ------------------------------------------------------------------ */

export interface DueItem {
  id: string;
  title: string;
  attempts: number;
  lastAt: string;
  intervalDays: number;
  overdueDays: number;
  href: string;
}

const INTERVALS = [1, 3, 7, 14];

export function computeDueReviews(sessions: Session[], now = new Date()): DueItem[] {
  const done = sessions.filter((s) => s.status === 'completed');
  const byTitle = new Map<string, Session[]>();
  for (const s of done) {
    const key = s.title.replace(/^Sample · /, '').replace(/ · R\d$/, '');
    byTitle.set(key, [...(byTitle.get(key) ?? []), s]);
  }
  const due: DueItem[] = [];
  for (const [title, list] of byTitle) {
    const attempts = list.length;
    const last = list.reduce((m, s) => (s.startedAt > m ? s.startedAt : m), '');
    const intervalDays = INTERVALS[Math.min(attempts - 1, INTERVALS.length - 1)];
    const daysSince = (now.getTime() - new Date(last).getTime()) / 86_400_000;
    if (daysSince >= intervalDays) {
      const latest = list.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
      due.push({
        id: title,
        title,
        attempts,
        lastAt: last,
        intervalDays,
        overdueDays: Math.floor(daysSince - intervalDays),
        href: latest.drillId
          ? `/impromptu?drill=${latest.drillId}`
          : latest.topicId
            ? `/impromptu?topic=${latest.topicId}`
            : '/impromptu',
      });
    }
  }
  return due.sort((a, b) => b.overdueDays - a.overdueDays);
}

/* ------------------------------------------------------------------ *
 * One key takeaway (Loora parity): collapse a whole report into the
 * single fix that matters most today.
 * ------------------------------------------------------------------ */

export function oneKeyTakeaway(r: FeedbackReport): string {
  if (r.grammarIssues.length) {
    const g = r.grammarIssues[0];
    return `Say “${g.correction}” instead of “${g.quote}”.`;
  }
  if (r.fillers.length) {
    return `Replace “${r.fillers[0].phrase}” with a one-second silent pause.`;
  }
  const weakest = [...r.dimensions].sort((a, b) => a.score - b.score)[0];
  if (weakest) return `Today's focus: ${weakest.label.toLowerCase()} — ${weakest.verdict}`;
  return 'Keep the streak alive — consistency beats intensity.';
}
