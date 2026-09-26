import { clamp, lemma, piecewise, round1, type Token } from './text';
import type { PauseResult } from './pauses';
import type { PaceResult } from './pace';
import { HARD_FILLERS } from './fillers';

/**
 * Fluency = continuity of speech.
 *
 * IELTS band 6 is "willing to speak at length, uses a range of connectives,
 * some hesitation"; band 8 is "speaks fluently with only occasional repetition
 * or self-correction". We model exactly those signals:
 *
 *   - run length between pauses
 *   - awkward-pause density
 *   - self-corrections and false starts
 *   - time-to-first-word (planning hesitation)
 *   - steadiness of the delivery rate
 */

export interface Disfluency {
  kind: 'self-correction' | 'restart' | 'false-start';
  wordIndex: number;
  quote: string;
  note: string;
}

const SENTENCE_STARTERS = new Set(['i', 'so', 'well', 'and', 'but', 'then', 'the', 'my', 'it', 'that', 'this']);

/**
 * Detect the three disfluency types:
 *   self-correction : "I go ... I went to the market"
 *   restart         : same sentence opened twice
 *   false start     : a fragment abandoned before the next clause
 */
export function detectDisfluencies(tokens: Token[]): Disfluency[] {
  const out: Disfluency[] = [];
  if (tokens.length < 4) return out;

  // Subject-echo self-correction: "I go ... I went", "she think ... she thinks".
  // Shape is  Subject Verb Subject Verb'  where Verb and Verb' are the same lexeme.
  for (let i = 0; i + 3 < tokens.length; i++) {
    const s1 = tokens[i];
    const v1 = tokens[i + 1];
    const s2 = tokens[i + 2];
    const v2 = tokens[i + 3];
    if (!s1.word || !v1.word || !v2.word) continue;
    const subjectEcho = s1.word === s2.word && (SENTENCE_STARTERS.has(s1.word) || s1.word.length <= 3);
    const verbChange = v1.word !== v2.word && v1.word.length > 1 && lemma(v1.word) === lemma(v2.word);
    if (subjectEcho && verbChange) {
      out.push({
        kind: 'self-correction',
        wordIndex: i + 3,
        quote: tokens.slice(i, i + 4).map((t) => t.raw).join(' '),
        note: `You corrected "${v1.word}" to "${v2.word}" mid-sentence. Decide the verb form before you open the clause.`,
      });
    }
  }

  for (let i = 1; i < tokens.length - 1; i++) {
    const a = tokens[i - 1].word;
    const b = tokens[i].word;
    if (!a || !b) continue;

    // 1. immediate self-correction: "go ... went", "childs ... children"
    if (a !== b && lemma(a) === lemma(b) && a.length > 2) {
      out.push({
        kind: 'self-correction',
        wordIndex: i,
        quote: `${tokens[i - 1].raw} ${tokens[i].raw}`,
        note: `You corrected "${a}" to "${b}" mid-sentence. Plan the verb form before you start the clause.`,
      });
      continue;
    }

    // 2. restart: two consecutive clause openers with little content between them
    if (SENTENCE_STARTERS.has(a) && SENTENCE_STARTERS.has(b) && a === b) {
      out.push({
        kind: 'restart',
        wordIndex: i,
        quote: `${tokens[i - 1].raw} ${tokens[i].raw}`,
        note: `The sentence was restarted at "${b}". Keep the first attempt running — examiners reward continuity.`,
      });
      continue;
    }

    // 3. false start: a hard filler followed by a repeated content word
    if (HARD_FILLERS.includes(a) && tokens[i + 1] && lemma(tokens[i + 1].word) === lemma(b)) {
      out.push({
        kind: 'false-start',
        wordIndex: i,
        quote: `${tokens[i - 1].raw} ${tokens[i].raw} ${tokens[i + 1].raw}`,
        note: `A false start before "${b}". Buy thinking time with a linker ("that said…") instead of restarting.`,
      });
    }
  }

  const seen = new Set<number>();
  return out
    .sort((a, b) => a.wordIndex - b.wordIndex)
    .filter((d) => (seen.has(d.wordIndex) ? false : (seen.add(d.wordIndex), true)));
}

export interface FluencyResult {
  score: number;
  verdict: string;
  disfluencies: Disfluency[];
  selfCorrectionCount: number;
  restartCount: number;
  meanRunLength: number;
  detail: Record<string, number | string>;
}

export interface FluencyInput {
  pauses: PauseResult;
  pace: PaceResult;
  fillerCount: number;
  durationMs: number;
  tokens: Token[];
  disfluencies?: Disfluency[];
}

/** Below this many words there is no run length to measure. */
export const MIN_WORDS_FOR_FLUENCY = 8;

export function scoreFluency(input: FluencyInput): FluencyResult {
  const disfluencies = input.disfluencies ?? detectDisfluencies(input.tokens);
  const wordCount = input.tokens.filter((t) => t.word).length;
  if (wordCount < MIN_WORDS_FOR_FLUENCY) {
    return {
      score: -1, verdict: 'Not enough speech', disfluencies,
      selfCorrectionCount: disfluencies.filter((d) => d.kind === 'self-correction').length,
      restartCount: disfluencies.filter((d) => d.kind !== 'self-correction').length,
      meanRunLength: wordCount,
      detail: { wordCount, meanRunLength: wordCount },
    };
  }
  const selfCorrectionCount = disfluencies.filter((d) => d.kind === 'self-correction').length;
  const restartCount = disfluencies.filter((d) => d.kind !== 'self-correction').length;
  const minutes = Math.max(input.durationMs / 60000, 1 / 60);

  // Base: how long the learner can keep talking without breaking.
  let score = piecewise(input.pauses.meanRunLength, [[2, 35], [4, 55], [6, 70], [9, 82], [13, 90], [18, 97]]);

  // Awkward pauses per minute.
  const awkwardPerMin = input.pauses.awkwardCount / minutes;
  score -= clamp(awkwardPerMin * 9, 0, 26);

  // Disfluency density.
  const disPerMin = disfluencies.length / minutes;
  score -= clamp(disPerMin * 7, 0, 20);

  // Filler spill-over (fillers already have their own dimension, so weight lightly).
  const fillerPerMin = input.fillerCount / minutes;
  score -= clamp(Math.max(0, fillerPerMin - 2) * 1.6, 0, 10);

  // Planning hesitation at the top.
  if (input.pauses.latencyToStartMs > 3000) {
    score -= clamp((input.pauses.latencyToStartMs - 3000) / 400, 0, 10);
  }

  // Note: delivery-rate unevenness is already penalised in the pace dimension,
  // so it is deliberately not double-counted here.

  // Very short answers can't demonstrate fluency.
  if (input.durationMs < 12000) score = Math.min(score, 68);

  score = clamp(Math.round(score));
  const verdict =
    score >= 90 ? 'Effortless flow'
      : score >= 80 ? 'Fluent with minor breaks'
      : score >= 68 ? 'Sustained but hesitant'
      : score >= 52 ? 'Noticeable hesitation'
      : score >= 35 ? 'Frequent breakdown'
      : 'Speech breaks down often';

  return {
    score,
    verdict,
    disfluencies,
    selfCorrectionCount,
    restartCount,
    meanRunLength: input.pauses.meanRunLength,
    detail: {
      meanRunLength: input.pauses.meanRunLength,
      awkwardPauses: input.pauses.awkwardCount,
      awkwardPerMin: round1(awkwardPerMin),
      selfCorrections: selfCorrectionCount,
      restarts: restartCount,
      latencyToStartMs: input.pauses.latencyToStartMs,
      artRate: input.pace.artRate,
      wpm: input.pace.wpm,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Clarity — can the listener actually understand you?
 * ------------------------------------------------------------------ */

export interface ClarityResult {
  score: number;
  verdict: string;
  detail: Record<string, number | string>;
}

export interface ClarityInput {
  avgAsrConfidence: number; // -1 when unavailable
  avgLoudness: number; // 0..1, -1 when unavailable
  peakLoudness: number;
  artRate: number;
  unknownWordRatio: number;
  clipped: boolean;
  wordCount: number;
}

export function scoreClarity(input: ClarityInput): ClarityResult {
  let score = 70;
  const detail: Record<string, number | string> = {};

  if (input.wordCount < 5 || (input.avgAsrConfidence < 0 && input.avgLoudness < 0)) {
    return { score: -1, verdict: 'Not enough speech', detail: { wordCount: input.wordCount } };
  }

  if (input.avgAsrConfidence >= 0) {
    score = piecewise(input.avgAsrConfidence, [[0.4, 32], [0.6, 55], [0.75, 72], [0.85, 85], [0.93, 94], [1, 100]]);
    detail.asrConfidence = round1(input.avgAsrConfidence * 100) / 100;
  }

  // Unknown-token ratio is the strongest available proxy for slurred speech.
  const unknownPart = piecewise(input.unknownWordRatio, [[0, 100], [0.05, 95], [0.1, 85], [0.18, 70], [0.3, 50], [0.45, 32]]);
  score = score * 0.6 + unknownPart * 0.4;
  detail.unknownWordRatio = round1(input.unknownWordRatio * 100) / 100;

  if (input.avgLoudness >= 0) {
    detail.avgLoudness = round1(input.avgLoudness * 100) / 100;
    if (input.avgLoudness < 0.012) { score -= 16; detail.volume = 'too quiet'; }
    else if (input.avgLoudness < 0.03) { score -= 7; detail.volume = 'quiet'; }
    else if (input.avgLoudness > 0.55) { score -= 5; detail.volume = 'too loud'; }
    else detail.volume = 'good';
  }

  if (input.artRate > 210) { score -= 8; detail.delivery = 'too fast to parse'; }
  if (input.clipped) { score -= 6; detail.clipping = 'yes'; }

  score = clamp(Math.round(score));
  const verdict =
    score < 0 ? 'Not enough speech'
      : score >= 88 ? 'Crystal clear'
      : score >= 76 ? 'Easy to follow'
      : score >= 62 ? 'Understandable'
      : score >= 45 ? 'Strains the listener'
      : 'Frequently unclear';

  return { score, verdict, detail };
}
