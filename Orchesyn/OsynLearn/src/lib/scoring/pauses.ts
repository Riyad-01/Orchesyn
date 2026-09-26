import type { PauseEvent, WordToken } from '@/types';
import { clamp, piecewise, round1, type Token } from './text';

/**
 * Pause analysis from word-level timings.
 *
 *   gap < 400ms      -> not a pause (normal inter-word spacing)
 *   400 - 650ms      -> natural (clause / punctuation boundary)
 *   650 - 1200ms     -> long
 *   > 1200ms         -> awkward
 *
 * A 650ms+ gap in the *middle* of a sentence is one step worse than the same
 * gap at a boundary, because it breaks a thought that was not finished.
 */

export const PAUSE_MIN_MS = 400;
export const NATURAL_MAX_MS = 650;
export const LONG_MAX_MS = 1200;
export const START_HESITATION_MS = 2500;

export interface PauseResult {
  pauses: PauseEvent[];
  count: number;
  awkwardCount: number;
  longestMs: number;
  totalMs: number;
  /** words spoken per uninterrupted run — a fluency signal */
  meanRunLength: number;
  latencyToStartMs: number;
  score: number;
  verdict: string;
}

function classify(gapMs: number, atBoundary: boolean): PauseEvent['kind'] {
  if (gapMs > LONG_MAX_MS) return 'awkward';
  if (gapMs > NATURAL_MAX_MS) return atBoundary ? 'long' : 'awkward';
  return 'natural';
}

export function analysePauses(words: WordToken[], tokens: Token[] = []): PauseResult {
  const empty: PauseResult = {
    pauses: [], count: 0, awkwardCount: 0, longestMs: 0, totalMs: 0,
    meanRunLength: tokens.length, latencyToStartMs: -1, score: -1, verdict: 'Not measured',
  };
  if (words.length < 2) return empty;

  const pauses: PauseEvent[] = [];
  let totalMs = 0;
  let longestMs = 0;
  let awkwardCount = 0;
  const runLengths: number[] = [];
  let run = 1;

  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].startMs - words[i].endMs;
    if (gap < PAUSE_MIN_MS) { run += 1; continue; }

    const atBoundary = tokens[i]?.endsSentence === true || tokens[i + 1]?.startsSentence === true;
    const kind = classify(gap, atBoundary);
    pauses.push({ atMs: words[i].endMs, durationMs: Math.round(gap), afterWordIndex: i, kind });
    totalMs += gap;
    longestMs = Math.max(longestMs, gap);
    if (kind === 'awkward') awkwardCount += 1;
    runLengths.push(run);
    run = 1;
  }
  runLengths.push(run);

  const meanRunLength = round1(runLengths.reduce((a, b) => a + b, 0) / Math.max(runLengths.length, 1));
  const latencyToStartMs = Math.max(0, Math.round(words[0].startMs));
  const score = scorePauses(pauses, awkwardCount, latencyToStartMs);
  const verdict =
    score < 0 ? 'Not measured'
      : score >= 88 ? 'Smooth delivery'
      : score >= 75 ? 'Mostly smooth'
      : score >= 60 ? 'Some hesitation'
      : score >= 40 ? 'Frequent hesitation'
      : 'Very halting';

  return {
    pauses, count: pauses.length, awkwardCount, longestMs: Math.round(longestMs),
    totalMs: Math.round(totalMs), meanRunLength, latencyToStartMs, score, verdict,
  };
}

function scorePauses(pauses: PauseEvent[], awkwardCount: number, latencyToStartMs: number): number {
  const totalPauseSec = pauses.reduce((a, p) => a + p.durationMs, 0) / 1000;
  const longPauses = pauses.filter((p) => p.kind !== 'natural').length;

  // too little pausing is also unnatural — machine-gun delivery
  let score = piecewise(longPauses, [[0, 100], [1, 94], [2, 88], [3, 80], [5, 68], [8, 52], [12, 38], [18, 22]]);
  score -= Math.min(18, awkwardCount * 4.5);
  score -= Math.min(10, Math.max(0, (latencyToStartMs - 2000) / 500));
  if (totalPauseSec > 0 && pauses.length > 0) {
    const avgSec = totalPauseSec / pauses.length;
    if (avgSec < 0.32 && pauses.length >= 4) score -= 6; // rushed, no breathing room
  }
  return clamp(Math.round(score));
}

/** Convert a pause timeline into a waveform-style marker array for the UI. */
export function pauseMarkers(result: PauseResult, durationMs: number): { at: number; kind: PauseEvent['kind'] }[] {
  if (durationMs <= 0) return [];
  return result.pauses.map((p) => ({ at: p.atMs / durationMs, kind: p.kind }));
}
