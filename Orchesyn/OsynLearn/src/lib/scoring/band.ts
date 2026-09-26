import type { CEFRLevel } from '@/types';
import { clamp } from './text';

/**
 * Score -> IELTS Speaking band.
 *
 * Anchored on the published IELTS Speaking band descriptors:
 *   5 = "maintains speech at length, hesitation is usually language-related"
 *   6 = "willing to speak at length, some fluency, some effective vocabulary"
 *   7 = "speaks at length without noticeable effort, some error-free sentences"
 *   8 = "fluent with only occasional repetition, wide vocabulary, errors rare"
 *
 * We interpolate between anchors so small score moves give small band moves,
 * then snap to the half-band grid the exam actually reports.
 */

const ANCHORS: [number, number][] = [
  [0, 1.0],
  [18, 2.5],
  [28, 3.5],
  [38, 4.0],
  [46, 4.5],
  [54, 5.0],
  [61, 5.5],
  [68, 6.0],
  [74, 6.5],
  [80, 7.0],
  [86, 7.5],
  [91, 8.0],
  [96, 8.5],
  [100, 9.0],
];

export function scoreToBand(score: number): number {
  const s = clamp(score);
  let band = ANCHORS[ANCHORS.length - 1][1];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [x0, y0] = ANCHORS[i];
    const [x1, y1] = ANCHORS[i + 1];
    if (s >= x0 && s <= x1) {
      band = x1 === x0 ? y0 : y0 + ((s - x0) * (y1 - y0)) / (x1 - x0);
      break;
    }
  }
  return Math.round(band * 2) / 2;
}

export function bandToScore(band: number): number {
  // inverse lookup for goal-setting UI
  const target = clamp(band, 1, 9);
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const [x0, y0] = ANCHORS[i];
    const [x1, y1] = ANCHORS[i + 1];
    if (target >= y0 && target <= y1) {
      return Math.round(y1 === y0 ? x0 : x0 + ((target - y0) * (x1 - x0)) / (y1 - y0));
    }
  }
  return 100;
}

export function bandLabel(band: number): string {
  if (band >= 8.5) return 'Expert';
  if (band >= 7.5) return 'Very good';
  if (band >= 6.5) return 'Good';
  if (band >= 5.5) return 'Modest';
  if (band >= 4.5) return 'Limited';
  if (band >= 3.5) return 'Extremely limited';
  return 'Non-user';
}

/** Rough CEFR alignment used by IELTS itself. */
export function bandToCefr(band: number): CEFRLevel {
  if (band >= 8.5) return 'C2';
  if (band >= 7.0) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4.0) return 'B1';
  return 'A2';
}

/**
 * The official IELTS Speaking score is the mean of four equally-weighted criteria.
 * We fold our seven dimensions into those four when the mode is an exam mock.
 */
export interface IeltsCriteria {
  /** Fluency & Coherence */
  fc: number;
  /** Lexical Resource */
  lr: number;
  /** Grammatical Range & Accuracy */
  gra: number;
  /** Pronunciation */
  pra: number;
  overallBand: number;
}

export function ieltsCriteria(dims: Record<string, number>): IeltsCriteria {
  const get = (k: string) => dims[k] ?? 0;
  const fc = Math.round(get('fluency') * 0.55 + get('fillers') * 0.2 + get('pace') * 0.25);
  const lr = Math.round(get('vocabulary'));
  const gra = Math.round(get('grammar'));
  const pra = Math.round(get('pronunciation') * 0.8 + get('clarity') * 0.2);
  const mean = (fc + lr + gra + pra) / 4;
  // IELTS rounds the mean of the four criteria to the nearest half band
  const overallBand = Math.round(scoreToBand(mean) * 2) / 2;
  return { fc, lr, gra, pra, overallBand };
}

/** Overall 0-100 used for streaks, trends and the non-exam modes. */
export interface WeightedInput {
  dimensions: Record<string, number>;
  weights: Record<string, number>;
}

export function weightedOverall(input: WeightedInput): number {
  let sum = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(input.weights)) {
    const value = input.dimensions[key];
    if (typeof value !== 'number') continue;
    sum += value * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(clamp(sum / totalWeight));
}
