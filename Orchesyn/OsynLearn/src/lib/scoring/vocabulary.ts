import type { VocabHighlight } from '@/types';
import { wordTier } from '@/lib/data/generated/frequency';
import { clamp, isContentWord, lemma, piecewise, round1, type Token } from './text';

/**
 * Lexical resource: range, precision and density.
 *
 *  - TTR / corrected TTR : how varied the word choice is
 *  - MTLD                : length-independent diversity (McCarthy & Jarvis)
 *  - average tier        : are the content words from a high or low frequency band
 *  - lexical density     : proportion of content words vs. grammatical glue
 */

export const MTLD_THRESHOLD = 0.72;

export interface VocabularyResult {
  uniqueWords: number;
  contentWords: number;
  ttr: number;
  cttr: number;
  mtld: number;
  lexicalDensity: number;
  avgWordTier: number;
  rareWordCount: number;
  highlights: VocabHighlight[];
  repeated: { word: string; count: number }[];
  score: number;
  verdict: string;
}

/** Root TTR — normalises the type/token ratio for transcript length. */
export function correctedTtr(types: number, tokens: number): number {
  if (tokens <= 0) return 0;
  // root TTR: types / sqrt(tokens). ~6+ is strong for a 60-second monologue.
  return round1(types / Math.sqrt(tokens) * 100) / 100;
}

/**
 * MTLD (Measure of Textual Lexical Diversity).
 * Counts the mean length of sequential word strings that keep TTR above the threshold.
 * Higher = more varied. Bidirectional average, as in the original paper.
 */
export function mtld(words: string[]): number {
  if (words.length < 10) return 0;
  const forward = (list: string[]) => {
    let factorCount = 0;
    let factorStart = 0;
    const types = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      types.add(list[i]);
      const ttr = types.size / (i - factorStart + 1);
      if (ttr < MTLD_THRESHOLD) {
        factorCount += 1;
        factorStart = i + 1;
        types.clear();
      }
    }
    const partial = list.length - factorStart;
    if (partial > 0) {
      const ttr = types.size / partial;
      if (ttr < 1) factorCount += (1 - ttr) / (1 - MTLD_THRESHOLD);
    }
    return factorCount > 0 ? list.length / factorCount : list.length;
  };
  const f = forward(words);
  const b = forward([...words].reverse());
  return round1((f + b) / 2);
}

export function analyseVocabulary(tokens: Token[], words: { startMs: number }[] = []): VocabularyResult {
  const all = tokens.filter((t) => t.word);
  const content = all.filter((t) => isContentWord(t.word));
  const lemmasAll = all.map((t) => lemma(t.word));
  const lemmasContent = content.map((t) => lemma(t.word));

  const uniqueWords = new Set(lemmasAll).size;
  const uniqueContent = new Set(lemmasContent);
  const ttr = all.length ? round1((uniqueWords / all.length) * 100) : 0;
  const cttr = correctedTtr(uniqueWords, all.length);
  const mtldScore = mtld(lemmasAll);

  const lexicalDensity = all.length ? round1((content.length / all.length) * 100) : 0;

  // Tier 5 (outside the top 10k) covers both genuinely advanced words and ASR
  // noise, so it is folded into tier 4 rather than dropped — dropping it would
  // hide exactly the ambitious vocabulary we want to reward.
  const tiers = content
    .map((t) => wordTier(t.word))
    .filter((t) => t > 0)
    .map((t) => Math.min(t, 4) as 1 | 2 | 3 | 4);
  const avgWordTier = tiers.length ? round1(tiers.reduce((a, b) => a + b, 0) / tiers.length) : 3;
  const rareWords = content.filter((t) => wordTier(t.word) >= 3);

  const highlights: VocabHighlight[] = rareWords
    .slice(0, 24)
    .map((t) => ({
      word: t.word,
      tier: wordTier(t.word),
      wordIndex: t.index,
      atMs: words[t.index]?.startMs ?? -1,
    }));

  // words reused a lot, ignoring grammatical glue
  const freq = new Map<string, number>();
  for (const l of lemmasContent) freq.set(l, (freq.get(l) ?? 0) + 1);
  const repeated = [...freq.entries()]
    .filter(([, c]) => c >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  const score = scoreVocabulary({
    contentTokens: content.length,
    cttr,
    mtld: mtldScore,
    avgWordTier,
    rareCount: rareWords.length,
    uniqueContent: uniqueContent.size,
    repetitionCount: repeated.reduce((a, r) => a + r.count, 0),
  });

  const verdict =
    score < 0 ? 'Not enough speech'
      : score >= 88 ? 'Rich vocabulary' : score >= 76 ? 'Good range' : score >= 62 ? 'Adequate range'
      : score >= 45 ? 'Limited range' : 'Very repetitive';

  return {
    uniqueWords,
    contentWords: content.length,
    ttr, cttr, mtld: mtldScore, lexicalDensity, avgWordTier,
    rareWordCount: rareWords.length,
    highlights, repeated, score, verdict,
  };
}

interface VocabInputs {
  contentTokens: number;
  cttr: number;
  mtld: number;
  avgWordTier: number;
  rareCount: number;
  uniqueContent: number;
  repetitionCount: number;
}

/** Below this many content words there is no basis for a lexical-resource score. */
export const MIN_CONTENT_WORDS_FOR_VOCAB = 5;

export function scoreVocabulary(v: VocabInputs): number {
  if (v.contentTokens < MIN_CONTENT_WORDS_FOR_VOCAB) return -1;

  // Variety (root TTR, length-corrected). 6.0+ is already strong for a 60s monologue.
  let score = piecewise(v.cttr, [[2.2, 30], [3.2, 50], [4.2, 65], [5.2, 78], [6.2, 88], [7.5, 96]]);

  // MTLD saturates on short samples (a 40-word answer can never fall below the
  // 0.72 threshold), so it is anchored higher and weighted below root TTR.
  const mtldPart = piecewise(v.mtld, [[15, 30], [25, 50], [35, 65], [45, 78], [60, 88], [80, 96]]);
  score = score * 0.6 + mtldPart * 0.4;

  // Range: pulling words from less common bands.
  const tierPart = piecewise(v.avgWordTier, [[2.6, 40], [2.2, 62], [1.9, 78], [1.6, 90]], true);
  score = score * 0.82 + tierPart * 0.18;

  // Precise, lower-frequency word choices.
  score += clamp(v.rareCount * 0.9, 0, 7);

  // Penalise leaning on the same few words.
  if (v.repetitionCount > 0) {
    const perHundred = (v.repetitionCount / Math.max(v.contentTokens, 1)) * 100;
    score -= clamp(perHundred * 0.5, 0, 14);
  }
  if (v.uniqueContent < 12) score -= 8;

  return clamp(Math.round(score));
}

/** Words worth teaching back to the learner, newest-first. */
export function suggestedUpgrades(tokens: Token[]): { instead: string; use: string; why: string }[] {
  const text = tokens.map((t) => t.word).join(' ');
  const swaps: { instead: string; use: string; why: string }[] = [
    { instead: 'very good', use: 'excellent / outstanding', why: 'A single precise adjective beats "very" + a common one.' },
    { instead: 'very bad', use: 'terrible / appalling', why: 'Upgrade the intensifier into the adjective itself.' },
    { instead: 'very big', use: 'enormous / substantial', why: 'Collocation variety lifts the lexical-resource band.' },
    { instead: 'very important', use: 'crucial / essential', why: 'Examiners reward less common vocabulary used accurately.' },
    { instead: 'a lot of', use: 'numerous / a great deal of', why: 'Quantifier variety reads as more academic.' },
    { instead: 'get', use: 'obtain / receive / become', why: '"Get" is the most overused verb in learner English.' },
    { instead: 'think', use: 'believe / reckon / am convinced', why: 'Varying stance verbs shows control of register.' },
    { instead: 'good thing', use: 'benefit / advantage', why: 'Noun precision beats adjective + "thing".' },
    { instead: 'bad thing', use: 'drawback / downside', why: 'Noun precision beats adjective + "thing".' },
    { instead: 'in my opinion', use: 'from my perspective / as far as I am concerned', why: 'Vary opinion openers across an answer.' },
    { instead: 'because', use: 'since / given that / owing to', why: 'Subordinator variety improves the grammar band too.' },
    { instead: 'but', use: 'however / nevertheless / yet', why: 'Contrast linkers structure a longer turn.' },
    { instead: 'also', use: 'moreover / furthermore / on top of that', why: 'Additive linkers extend the turn coherently.' },
    { instead: 'so', use: 'therefore / as a result / consequently', why: 'Causal linkers signal structured argument.' },
    { instead: 'nowadays', use: 'in recent years / these days', why: 'Time framing sounds more natural in Part 3.' },
  ];
  return swaps.filter((s) => text.includes(s.instead)).slice(0, 6);
}
