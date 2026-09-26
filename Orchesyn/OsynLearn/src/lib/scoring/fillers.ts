import type { FillerOccurrence, WordToken } from '@/types';
import { clamp, piecewise, round1, type Token } from './text';

/**
 * Filler detection.
 *
 * Two classes:
 *  - HARD fillers  : non-lexical vocalisations ("um", "uh", "er"). Always counted.
 *  - SOFT markers  : real words used as padding ("like", "basically", "you know").
 *                    Counted only when the surrounding context shows they carry no meaning,
 *                    so "I like coffee" is never penalised.
 */

export const HARD_FILLERS = [
  'um', 'uh', 'er', 'erm', 'ah', 'eh', 'hmm', 'huh', 'mm', 'mmm', 'mhm', 'uhh', 'umm', 'aha',
];

export const SOFT_FILLERS = [
  'basically', 'actually', 'literally', 'obviously', 'honestly', 'seriously', 'definitely',
  'ya', 'na', 'thingy',
];

/**
 * Multi-word markers, longest first so greedy matching wins.
 * Deliberately excludes legitimate hedges ("I think", "I would say", "at the same time")
 * — flagging those would penalise exactly the discourse competence we want to reward.
 */
export const MULTI_FILLERS = [
  'at the end of the day', 'to be honest with you', 'you know what i mean', 'and all that stuff',
  'i mean to say', 'kind of like', 'sort of like', 'or something like that', 'and so on and so forth',
  'you know like', 'and stuff like that', 'or something', 'and stuff', 'you see', 'i mean',
  'kind of', 'sort of', 'you know', "isn't it", 'is not it',
];

const FILLER_SET = new Set([...HARD_FILLERS, ...SOFT_FILLERS]);

/** Words that are only padding when they appear in specific positions. */
const CONTEXTUAL = new Set(['like', 'so', 'well', 'just', 'really', 'very', 'totally', 'pretty']);

const CLAUSE_STARTERS = new Set([
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'there', 'that', 'this', 'what', 'when', 'where', 'who',
  'how', 'why', 'people', 'everyone', 'something', 'nothing', 'everything',
]);

export interface FillerResult {
  occurrences: FillerOccurrence[];
  count: number;
  ratePerMin: number;
  score: number;
  verdict: string;
  summary: string;
}

function isHardFiller(word: string): boolean {
  return HARD_FILLERS.includes(word.replace(/[^a-z']/g, ''));
}

/**
 * Decide whether a contextual word is acting as padding.
 * Uses the transcript tokens plus the pause gap that follows the word.
 */
function isContextualFiller(tokens: Token[], i: number, gapAfterMs: number): boolean {
  const word = tokens[i].word;
  const prev = tokens[i - 1];
  const next = tokens[i + 1];

  switch (word) {
    case 'like': {
      // "like" at the start of a sentence, or followed by a clause starter, is padding
      if (tokens[i].startsSentence) return true;
      if (next && CLAUSE_STARTERS.has(next.word)) return true;
      // a long pause right after "like" is the classic filler pause
      if (gapAfterMs >= 250) return true;
      // "just like", "was like", "and like", "it's like" — quotative padding
      if (prev && ['just', 'was', 'were', 'and', 'but', 'so', 'it\'s', 'that\'s', 'really'].includes(prev.word)) return true;
      return false;
    }
    case 'so':
      // sentence-initial "so" + pause = discourse padding; "so tired" is an intensifier
      return tokens[i].startsSentence && (gapAfterMs >= 200 || !next || CLAUSE_STARTERS.has(next.word));
    case 'well':
      return tokens[i].startsSentence || gapAfterMs >= 300;
    case 'just':
      // "I just want to say" carries meaning; a sentence-initial "just",
      // or "just" stranded before a long pause, is padding.
      if (tokens[i].startsSentence) return true;
      return gapAfterMs >= 350;
    case 'really':
    case 'very':
    case 'totally':
    case 'pretty':
      // intensifier chains: "very very", "really really"
      return !!next && next.word === word;
    default:
      return false;
  }
}

/**
 * Detect fillers. `tokens` and `words` must describe the same utterance in the same order;
 * when word timings are unavailable pass `words = []` and pause-aware rules degrade gracefully.
 */
export function detectFillers(
  tokens: Token[],
  words: WordToken[] = [],
  /** per-language padding words (see lib/i18n/languages) on top of the English lists */
  extraFillers: string[] = [],
): FillerOccurrence[] {
  const out: FillerOccurrence[] = [];
  const n = tokens.length;
  const extraMulti = extraFillers.filter((f) => f.includes(' '));
  const extraSingle = new Set(extraFillers.filter((f) => !f.includes(' ')));
  const gapAfter = (i: number): number => {
    const cur = words[i];
    const nxt = words[i + 1];
    if (!cur || !nxt) return -1;
    return Math.max(0, nxt.startMs - cur.endMs);
  };

  for (let i = 0; i < n; i++) {
    const word = tokens[i].word;
    if (!word) continue;

    // 1. multi-word markers, longest match first (per-language phrases first)
    let matched = false;
    for (const phrase of [...extraMulti, ...MULTI_FILLERS]) {
      const parts = phrase.split(' ');
      if (i + parts.length > n) continue;
      let ok = true;
      for (let k = 0; k < parts.length; k++) {
        if (tokens[i + k].word !== parts[k]) { ok = false; break; }
      }
      if (ok) {
        out.push({ phrase, index: out.length, wordIndex: i, atMs: words[i]?.startMs ?? -1 });
        i += parts.length - 1;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2. hard fillers
    if (isHardFiller(word)) {
      // collapse runs of "um um" into one occurrence
      const prevOcc = out[out.length - 1];
      if (prevOcc && prevOcc.wordIndex === i - 1 && isHardFiller(prevOcc.phrase)) {
        prevOcc.phrase = `${prevOcc.phrase} ${word}`;
        continue;
      }
      out.push({ phrase: word, index: out.length, wordIndex: i, atMs: words[i]?.startMs ?? -1 });
      continue;
    }

    // 2b. per-language padding words — raw match so non-Latin scripts count too
    if (extraSingle.has(word)) {
      out.push({ phrase: word, index: out.length, wordIndex: i, atMs: words[i]?.startMs ?? -1 });
      continue;
    }

    // 3. soft markers always count
    if (SOFT_FILLERS.includes(word)) {
      out.push({ phrase: word, index: out.length, wordIndex: i, atMs: words[i]?.startMs ?? -1 });
      continue;
    }

    // 4. contextual words
    if (CONTEXTUAL.has(word) && isContextualFiller(tokens, i, gapAfter(i))) {
      out.push({ phrase: word, index: out.length, wordIndex: i, atMs: words[i]?.startMs ?? -1 });
    }
  }

  return out.map((o, idx) => ({ ...o, index: idx }));
}

/** Native-speaker baseline is roughly 1-3 fillers per minute of monologue. */
/** Below this much audio a filler rate is not meaningful. */
export const MIN_MS_FOR_FILLERS = 8000;

export function scoreFillers(count: number, durationMs: number): { score: number; ratePerMin: number; verdict: string } {
  const minutes = Math.max(durationMs / 60000, 1 / 60);
  if (durationMs < MIN_MS_FOR_FILLERS) {
    return { score: -1, ratePerMin: round1(count / minutes), verdict: 'Not enough speech' };
  }
  const ratePerMin = round1(count / minutes);
  const score = piecewise(ratePerMin, [
    [0, 100],
    [1, 97],
    [2.5, 90],
    [4, 80],
    [6, 70],
    [9, 55],
    [13, 40],
    [18, 25],
    [25, 12],
  ]);
  const verdict =
    score >= 90 ? 'Very clean' : score >= 78 ? 'A few fillers' : score >= 60 ? 'Noticeable fillers'
      : score >= 40 ? 'Filler-heavy' : 'Dominated by fillers';
  return { score: Math.round(score), ratePerMin, verdict };
}

/** Group occurrences by phrase so the UI can show "um × 7, like × 4". */
export function fillerHistogram(occurrences: FillerOccurrence[]): { phrase: string; count: number }[] {
  const map = new Map<string, number>();
  for (const o of occurrences) {
    const key = o.phrase.split(/\s+/).filter((w) => HARD_FILLERS.includes(w) || SOFT_FILLERS.includes(w)).join(' ') || o.phrase;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);
}

export function fillerScoreFloor(): number {
  return clamp(100);
}
