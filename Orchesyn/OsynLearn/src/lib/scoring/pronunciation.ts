import type { PronunciationFlag, WordToken } from '@/types';
import { countSyllables, clamp, piecewise, type Token } from './text';
import { isKnownWord } from '@/lib/data/generated/frequency';

/**
 * Pronunciation scoring.
 *
 * Without a phoneme-level engine we cannot score individual sounds, so we use the
 * signals a browser ASR does give us, and say so honestly in the UI:
 *
 *   1. word-level ASR confidence (Chrome exposes it) — low confidence usually means
 *      the acoustic model could not match the audio to the intended word
 *   2. duration per syllable — a multi-syllable word crushed into <90ms/syllable is
 *      swallowed; a word dragged beyond ~500ms/syllable is over-articulated
 *   3. out-of-vocabulary tokens — words the recogniser invented are frequently
 *      mispronunciations (it heard *something*, just not an English word)
 *   4. immediate self-repair — speaker says a word, stops, says it again differently
 *
 * When a cloud phoneme engine is plugged in, `phonemeScores` overrides this.
 */

const MIN_MS_PER_SYLLABLE = 85;
const MAX_MS_PER_SYLLABLE = 620;
const LOW_CONFIDENCE = 0.55;

export interface PronunciationResult {
  flags: PronunciationFlag[];
  score: number;
  verdict: string;
  /** true when the estimate is heuristic rather than phoneme-based */
  estimated: boolean;
  /** how many words had usable signal */
  measuredWords: number;
}

export interface PhonemeInput {
  word: string;
  wordIndex: number;
  accuracyScore: number; // 0..1 from the cloud engine
  phonemes: { phone: string; score: number }[];
}

/** Below this many words pronunciation cannot be estimated at all. */
export const MIN_WORDS_FOR_PRONUNCIATION = 5;

export function analysePronunciation(
  tokens: Token[],
  words: WordToken[],
  phonemes: PhonemeInput[] = [],
  avgLoudness = -1,
): PronunciationResult {
  if (phonemes.length > 0) return fromPhonemes(tokens, phonemes);
  if (tokens.filter((t) => t.word).length < MIN_WORDS_FOR_PRONUNCIATION) {
    return { flags: [], score: -1, verdict: 'Not enough speech', estimated: true, measuredWords: 0 };
  }

  const flags: PronunciationFlag[] = [];
  let signalWords = 0;
  let total = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].word;
    if (!t || t.length < 2) continue;
    const timing = words[i];
    const confidence = timing?.confidence ?? -1;
    const durationMs = timing ? timing.endMs - timing.startMs : -1;
    const syllables = countSyllables(t);

    let wordScore = 100;
    let reason: string | null = null;
    let measured = false;

    if (confidence >= 0) {
      measured = true;
      signalWords += 1;
      if (confidence < LOW_CONFIDENCE) {
        wordScore = Math.min(wordScore, piecewise(confidence, [[0.1, 20], [0.3, 45], [LOW_CONFIDENCE, 80]]));
        reason = 'The recogniser was unsure of this word — check the vowel sounds and stress.';
      }
      total += confidence;
    }

    if (durationMs > 0 && syllables >= 2) {
      measured = true;
      const perSyllable = durationMs / syllables;
      if (perSyllable < MIN_MS_PER_SYLLABLE) {
        wordScore = Math.min(wordScore, 45);
        reason = `"${t}" (${syllables} syllables) took only ${Math.round(durationMs)}ms — the syllables are being swallowed.`;
      } else if (perSyllable > MAX_MS_PER_SYLLABLE) {
        wordScore = Math.min(wordScore, 72);
        reason = `"${t}" was stretched over ${Math.round(durationMs)}ms — it sounds spelled-out rather than natural.`;
      }
    }

    // An out-of-vocabulary token only counts against pronunciation when the
    // recogniser was also unsure — otherwise we would punish advanced vocabulary.
    const lowConfidenceSignal = confidence >= 0 && confidence < 0.75;
    if (!isKnownWord(t) && t.length > 3 && !/^[A-Z]/.test(tokens[i].raw) && (confidence < 0 || lowConfidenceSignal)) {
      wordScore = Math.min(wordScore, 60);
      reason = reason ?? `"${t}" is not a common English word and was not recognised confidently — likely a misheard pronunciation.`;
    }

    // self-repair: same word repeated then replaced
    const next = tokens[i + 1]?.word;
    if (next && next === t && tokens[i + 2] && tokens[i + 2].word !== t) {
      wordScore = Math.min(wordScore, 78);
      reason = reason ?? `You restarted on "${t}" — a sign the first attempt did not come out clearly.`;
    }

    if (reason && wordScore < 90) {
      flags.push({
        word: t,
        wordIndex: i,
        atMs: timing?.startMs ?? -1,
        reason,
        score: Math.round(wordScore),
      });
    }
  }

  let score: number;
  if (signalWords > 0) {
    const avgConfidence = total / signalWords;
    score = piecewise(avgConfidence, [[0.35, 30], [0.55, 55], [0.7, 72], [0.82, 85], [0.92, 95], [0.99, 100]]);
  } else {
    // no confidence data at all: derive purely from flag density
    const flagRate = flags.length / Math.max(tokens.length, 1);
    score = piecewise(flagRate, [[0, 96], [0.03, 88], [0.07, 76], [0.12, 64], [0.2, 48], [0.32, 32]]);
  }
  // deduct for flag density regardless of the confidence base
  const flagRate = flags.length / Math.max(tokens.length, 1);
  score -= clamp(flagRate * 55, 0, 22);
  if (avgLoudness >= 0 && avgLoudness < 0.02) score -= 10; // near-inaudible

  score = clamp(Math.round(score));
  const verdict =
    signalWords === 0 && flags.length === 0 ? 'Not measured'
      : score >= 88 ? 'Clear articulation'
      : score >= 76 ? 'Mostly clear'
      : score >= 62 ? 'Some unclear words'
      : score >= 45 ? 'Hard to follow at times'
      : 'Often unintelligible';

  return {
    flags: flags.slice(0, 30),
    score,
    verdict,
    estimated: true,
    measuredWords: signalWords,
  };
}

/** Cloud path: real phoneme accuracy from a speech-assessment API. */
function fromPhonemes(tokens: Token[], phonemes: PhonemeInput[]): PronunciationResult {
  const flags: PronunciationFlag[] = [];
  let sum = 0;
  for (const p of phonemes) {
    sum += p.accuracyScore;
    if (p.accuracyScore < 0.7) {
      const worst = [...p.phonemes].sort((a, b) => a.score - b.score)[0];
      flags.push({
        word: p.word,
        wordIndex: p.wordIndex,
        atMs: -1,
        reason: worst
          ? `The /${worst.phone}/ sound scored ${Math.round(worst.score * 100)}/100 — isolate and repeat it.`
          : 'Overall accuracy on this word was low.',
        score: Math.round(p.accuracyScore * 100),
        phonemes: p.phonemes.map((x) => ({ phone: x.phone, score: Math.round(x.score * 100) })),
      });
    }
  }
  const mean = phonemes.length ? sum / phonemes.length : 0;
  const score = clamp(Math.round(piecewise(mean, [[0.4, 30], [0.6, 55], [0.75, 72], [0.85, 85], [0.93, 94], [1, 100]])));
  return {
    flags: flags.slice(0, 30),
    score,
    verdict: score >= 85 ? 'Native-like accuracy' : score >= 70 ? 'Good accuracy' : score >= 55 ? 'Accent affecting clarity' : 'Needs phoneme work',
    estimated: false,
    measuredWords: phonemes.length,
  };
}

/** Words the learner should drill, taken from the flags. */
export function drillWords(result: PronunciationResult): string[] {
  return [...new Set(result.flags.filter((f) => f.score < 70).map((f) => f.word))].slice(0, 8);
}

export { countSyllables };
export type { Token };
