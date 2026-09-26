import { wordTier, normalise } from '@/lib/data/generated/frequency';

/** A word plus its position in the transcript, so UI can underline evidence. */
export interface Token {
  raw: string;
  word: string;
  /** index into the space-separated word list */
  index: number;
  /** true when this token ends a sentence */
  endsSentence: boolean;
  /** true when this token starts a sentence */
  startsSentence: boolean;
}

const SENTENCE_END = /[.!?]["')\]]?$/;

/** Split a transcript into word tokens, tagging sentence boundaries. */
export function tokenize(text: string): Token[] {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const rawWords = cleaned.split(' ');
  let startsSentence = true;
  return rawWords.map((raw, index) => {
    // Unicode-aware so Bangla/Arabic/Chinese transcripts survive tokenisation.
    // \p{M} keeps combining marks (Bengali/Devanagari vowel signs, Arabic harakat).
    const word = raw.toLowerCase().replace(/^[^\p{L}\p{M}\p{N}'’-]+|[^\p{L}\p{M}\p{N}'’-]+$/gu, '');
    const endsSentence = SENTENCE_END.test(raw) || index === rawWords.length - 1;
    const token: Token = { raw, word, index, endsSentence, startsSentence };
    startsSentence = endsSentence;
    return token;
  });
}

export function sentenceCount(text: string): number {
  const matches = (text || '').match(/[.!?]+["')\]]?(\s|$)/g);
  const n = matches ? matches.length : 0;
  // a transcript with content but no terminator still counts as one sentence
  return text && text.trim() ? Math.max(1, n) : 0;
}

export function splitSentences(text: string): string[] {
  return (text || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * English syllable estimate. Good enough for articulation-rate work:
 * collapses vowel digraphs/trigraphs that make one sound, strips silent -e,
 * and counts the remaining vowel groups.
 */
export function countSyllables(input: string): number {
  const raw = input.toLowerCase().replace(/[^a-z]/g, '');
  if (!raw) return 0;
  if (raw.length <= 3) return 1;

  const w = raw
    // vowel trigraphs that form a single sound: beau-ti-ful, not be-a-u-ti-ful
    .replace(/eau|ieu|eou/g, '\u0001')
    // silent -e
    .replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '')
    .replace(/^y/, '');

  const groups = w.match(/[aeiouy\u0001]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Closed-class words removed when measuring lexical range / density. */
const FUNCTION_WORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both
   but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further
   had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's
   i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on
   once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some
   such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've
   this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when
   when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've
   your yours yourself yourselves also just get got like one two three first still even well much many`
    .split(/\s+/)
    .filter(Boolean),
);

export function isFunctionWord(word: string): boolean {
  return FUNCTION_WORDS.has(normalise(word));
}

/** A content word is an open-class word that carries meaning. */
export function isContentWord(word: string): boolean {
  const n = normalise(word);
  if (!n || n.length < 2) return false;
  if (isFunctionWord(n)) return false;
  return true;
}

/** Very small stemmer: enough to merge "run/runs/running", "study/studied/studies". */
export function lemma(input: string): string {
  let w = normalise(input);
  if (w.length <= 3) return w;
  const irregular: Record<string, string> = {
    went: 'go', gone: 'go', goes: 'go', going: 'go',
    was: 'be', were: 'be', is: 'be', are: 'be', am: 'be', been: 'be',
    had: 'have', has: 'have', having: 'have',
    did: 'do', does: 'do', doing: 'do',
    said: 'say', made: 'make', took: 'take', taken: 'take',
    saw: 'see', seen: 'see', came: 'come', got: 'get',
    better: 'good', best: 'good', worse: 'bad',
    children: 'child', people: 'person', men: 'man', women: 'woman',
    taught: 'teach', bought: 'buy', thought: 'think',
  };
  if (irregular[w]) return irregular[w];
  if (/ies$/.test(w) && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/sses$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w) && !/ss$/.test(w) && !/us$/.test(w)) w = w.slice(0, -1);
  if (/(.)\1ing$/.test(w)) w = w.slice(0, -4);
  else if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3);
  if (/(.)\1ed$/.test(w)) w = w.slice(0, -3);
  else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
  if (/ly$/.test(w) && w.length > 5) w = w.slice(0, -2);
  return w;
}

/** Clamp helper used across the scoring modules. */
export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Piecewise-linear scale: map a raw measurement to 0..100 using anchor points.
 * anchors are [rawValue, score] pairs, ascending by rawValue.
 */
export function piecewise(value: number, anchors: [number, number][], invert = false): number {
  if (anchors.length === 0) return 100;
  const pts = [...anchors].sort((a, b) => a[0] - b[0]);
  let score: number;
  if (value <= pts[0][0]) score = pts[0][1];
  else if (value >= pts[pts.length - 1][0]) score = pts[pts.length - 1][1];
  else {
    score = pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      if (value >= x0 && value <= x1) {
        score = x1 === x0 ? y0 : y0 + ((value - x0) * (y1 - y0)) / (x1 - x0);
        break;
      }
    }
  }
  return clamp(invert ? 100 - score : score);
}

export { wordTier, normalise };
