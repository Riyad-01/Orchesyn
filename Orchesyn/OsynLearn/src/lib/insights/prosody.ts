import type { PauseEvent, WordToken } from '@/types';

/**
 * Prosody (word stress & intonation) feedback — the specialist layer.
 *
 * Assessment science (ETS SpeechRater, Azure Pronunciation Assessment, CEFR
 * phonological-control scales) scores prosody from stress, rhythm, intonation
 * and pause placement. We measure it on-device:
 *
 *   - pitch contour   : F0 via autocorrelation in the audio meter — the TRUE
 *                       intonation signal (monotone risk, declination, final rise)
 *   - energy variety  : loudness-envelope variation, used as the expression
 *                       fallback when the pitch track is too thin
 *   - pace swing      : rate difference across the answer's thirds ≈ rhythm control
 *   - abrupt breaks   : awkward mid-phrase pauses ≈ Azure's "UnexpectedBreak"
 *
 * Everything degrades gracefully: typed answers or tiny recordings get -1 and
 * the UI explains why instead of inventing a number.
 */

export interface ProsodyFeedback {
  /** 0..100, -1 when unmeasurable */
  score: number;
  /** loudness coefficient of variation (0 = robotically flat) */
  energyVariety: number;
  /** pitch coefficient of variation, -1 when not tracked */
  pitchVariety: number;
  /** median voiced F0 in Hz, 0 when not tracked */
  pitchMedian: number;
  /** contour shape across the answer */
  drift: 'falling' | 'rising' | 'level' | 'unknown';
  monotoneRisk: 'low' | 'medium' | 'high' | 'unknown';
  /** % gap between fastest and slowest third of the answer */
  paceSwing: number;
  awkwardBreaks: number;
  notes: string[];
  tips: string[];
}

export interface ProsodyInput {
  words: WordToken[];
  envelope: number[];
  /** F0 contour in Hz (0 = unvoiced). Optional for reports recorded pre-pitch. */
  pitch?: number[];
  pauses: PauseEvent[];
  durationMs: number;
  typedFallback?: boolean;
}

export function prosodyFeedback(input: ProsodyInput): ProsodyFeedback {
  const { words, envelope, pauses, durationMs, typedFallback } = input;

  if (typedFallback || envelope.length < 8 || durationMs < 5000) {
    return {
      score: -1,
      energyVariety: 0,
      pitchVariety: -1,
      pitchMedian: 0,
      drift: 'unknown',
      monotoneRisk: 'unknown',
      paceSwing: 0,
      awkwardBreaks: 0,
      notes: ['Prosody needs audio — record a session to unlock intonation & rhythm feedback.'],
      tips: [],
    };
  }

  /* ---- pitch contour: the true intonation signal ---- */
  const voicedSeq = (input.pitch ?? []).filter((v) => v > 0);
  let pitchVariety = -1;
  let pitchMedian = 0;
  let drift: ProsodyFeedback['drift'] = 'unknown';
  if (voicedSeq.length >= 12) {
    const sorted = [...voicedSeq].sort((a, b) => a - b);
    pitchMedian = sorted[Math.floor(sorted.length / 2)];
    const inliers = voicedSeq.filter((v) => v >= pitchMedian * 0.7 && v <= pitchMedian * 1.45);
    if (inliers.length >= 10) {
      const m = inliers.reduce((a, b) => a + b, 0) / inliers.length;
      const sd = Math.sqrt(inliers.reduce((a, b) => a + (b - m) ** 2, 0) / inliers.length);
      pitchVariety = Number((sd / m).toFixed(3));
      const third = Math.max(4, Math.floor(voicedSeq.length / 3));
      const meanOf = (part: number[]) => part.reduce((a, b) => a + b, 0) / Math.max(1, part.length);
      const first = meanOf(voicedSeq.slice(0, third));
      const last = meanOf(voicedSeq.slice(-third));
      if (first > 0) drift = last < first * 0.94 ? 'falling' : last > first * 1.06 ? 'rising' : 'level';
    }
  }

  /* ---- energy variety (expression / fallback intonation proxy) ---- */
  const mean = envelope.reduce((a, b) => a + b, 0) / envelope.length;
  const variance = envelope.reduce((a, b) => a + (b - mean) ** 2, 0) / envelope.length;
  const cv = mean > 0.01 ? Math.sqrt(variance) / mean : 0;

  /* ---- monotone risk: pitch first, loudness as fallback ---- */
  const varietyForRisk = pitchVariety >= 0 ? pitchVariety : cv;
  const monotoneRisk: ProsodyFeedback['monotoneRisk'] =
    pitchVariety >= 0
      ? varietyForRisk < 0.05 ? 'high' : varietyForRisk < 0.11 ? 'medium' : 'low'
      : mean <= 0.01 ? 'unknown' : cv < 0.15 ? 'high' : cv < 0.28 ? 'medium' : 'low';

  /* ---- pace swing (rhythm proxy) ---- */
  let paceSwing = 0;
  const timed = words.filter((w) => w.endMs > w.startMs);
  if (timed.length >= 9) {
    const span = timed[timed.length - 1].endMs - timed[0].startMs;
    if (span > 3000) {
      const third = timed[0].startMs + span / 3;
      const twoThirds = timed[0].startMs + (2 * span) / 3;
      const counts = [0, 0, 0];
      for (const w of timed) counts[w.startMs < third ? 0 : w.startMs < twoThirds ? 1 : 2] += 1;
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      if (max > 1) paceSwing = Math.round(((max - min) / max) * 100);
    }
  }

  /* ---- abrupt breaks ---- */
  const awkwardBreaks = pauses.filter((p) => p.kind === 'awkward').length;

  /* ---- score ---- */
  let score = 82;
  if (monotoneRisk === 'high') score -= 30;
  else if (monotoneRisk === 'medium') score -= 14;
  else if (monotoneRisk === 'low') score += 8;
  score -= Math.min(20, awkwardBreaks * 5);
  if (paceSwing > 60) score -= 10; // erratic rhythm
  else if (paceSwing < 8 && timed.length >= 9) score -= 6; // metronomic
  score = Math.max(5, Math.min(100, Math.round(score)));

  /* ---- narrative ---- */
  const notes: string[] = [];
  if (pitchMedian > 0 && pitchVariety >= 0) {
    notes.push(
      monotoneRisk === 'high'
        ? `Pitch stayed within ±${Math.round(pitchVariety * 100)}% of ~${pitchMedian} Hz — measured monotone.`
        : monotoneRisk === 'medium'
          ? `Pitch varied ±${Math.round(pitchVariety * 100)}% around ~${pitchMedian} Hz; wider swings carry meaning.`
          : `Healthy intonation: pitch moved ±${Math.round(pitchVariety * 100)}% around ~${pitchMedian} Hz.`,
    );
    if (drift === 'rising') notes.push('Rising contour overall — statements may sound like questions.');
    else if (drift === 'falling') notes.push('Natural statement declination — your voice falls as thoughts close.');
  } else if (monotoneRisk !== 'unknown') {
    notes.push(
      monotoneRisk === 'high'
        ? `Loudness stayed nearly flat (variety ${cv.toFixed(2)}) — sounds monotone.`
        : monotoneRisk === 'medium'
          ? `Moderate expression (variety ${cv.toFixed(2)}); more contrast would carry meaning.`
          : `Good expression range (variety ${cv.toFixed(2)}) — your voice rises and falls naturally.`,
    );
  } else {
    notes.push('Pitch track was too thin this session — score uses loudness variation only.');
  }
  if (timed.length >= 9) {
    notes.push(
      paceSwing > 60
        ? `Pace swung ${paceSwing}% across the answer — rhythm felt uneven.`
        : paceSwing < 8
          ? `Pace barely varied (${paceSwing}%) — slightly metronomic.`
          : `Rhythm held together (pace swing ${paceSwing}%).`,
    );
  }
  if (awkwardBreaks > 0) {
    notes.push(`${awkwardBreaks} abrupt break${awkwardBreaks === 1 ? '' : 's'} mid-thought.`);
  } else if (pauses.length > 0) {
    notes.push('Pauses landed at natural boundaries.');
  }

  const tips: string[] = [];
  if (monotoneRisk === 'high' || monotoneRisk === 'medium') {
    tips.push('Stress the one key word in each sentence — say it louder, higher and a touch longer.');
    tips.push('Let your voice fall at the end of statements and rise only for real questions; record and listen back.');
  }
  if (drift === 'rising') {
    tips.push('Practice ending statements with a clear downward glide so they land as assertions.');
  }
  if (paceSwing > 60) {
    tips.push('Plan thought-groups before speaking so one chunk never races while another stalls.');
  } else if (paceSwing < 8 && timed.length >= 9) {
    tips.push('Speed up slightly for examples, slow down for conclusions — contrast sounds confident.');
  }
  if (awkwardBreaks > 0) {
    tips.push('Pause at clause boundaries, not mid-phrase: finish the thought-group, then breathe.');
  }
  tips.push('English is stress-timed: glide over small words (a, the, of) and give the energy to content words.');

  return {
    score,
    energyVariety: Number(cv.toFixed(2)),
    pitchVariety,
    pitchMedian,
    drift,
    monotoneRisk,
    paceSwing,
    awkwardBreaks,
    notes,
    tips: tips.slice(0, 3),
  };
}
