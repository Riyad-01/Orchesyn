/**
 * IELTS receptive-skill band conversion + local writing analysis.
 *
 * Band tables follow the published IELTS Academic conversions, scaled to the
 * size of our practice sets (percentage -> 40-question equivalent -> band).
 */

/** Academic Reading raw-score (out of 40) -> band table */
const READING_TABLE: readonly [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];

/** Academic Listening raw-score (out of 40) -> band table */
const LISTENING_TABLE: readonly [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5],
];

function tableBand(correct: number, total: number, table: readonly [number, number][]): number {
  if (total <= 0) return 0;
  const scaled = Math.round((correct / total) * 40);
  for (const [min, band] of table) if (scaled >= min) return band;
  // below the published table: IELTS band 1 is "non-user"; keep it honest
  return scaled === 0 ? 1 : 2;
}

export function readingBand(correct: number, total: number): number {
  return tableBand(correct, total, READING_TABLE);
}

export function listeningBand(correct: number, total: number): number {
  return tableBand(correct, total, LISTENING_TABLE);
}

export function bandVerdict(band: number): string {
  if (band >= 8) return 'Very good user';
  if (band >= 7) return 'Good user';
  if (band >= 6) return 'Competent user';
  if (band >= 5) return 'Modest user';
  if (band >= 4) return 'Limited user';
  return 'Developing user';
}

/* ------------------------------------------------------------------ */
/* Local writing analysis (the honest floor; the LLM examiner is the   */
/* "understanding" layer on top — same architecture as speaking).      */
/* ------------------------------------------------------------------ */

export interface WritingStats {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceLen: number;
  longSentenceRatio: number; // sentences > 25 words
  connectiveCount: number;
  uniqueWordRatio: number; // lexical diversity
  commaPerSentence: number;
  hasIntroConcession: boolean;
}

const CONNECTIVES = [
  'however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 'although', 'because',
  'while', 'whereas', 'consequently', 'thus', 'additionally', 'in conclusion', 'for example',
  'for instance', 'on the other hand', 'in contrast', 'as a result', 'firstly', 'secondly',
  'finally', 'overall', 'in summary', 'despite', 'meanwhile', 'specifically', 'indeed',
];

export function writingStats(text: string): WritingStats {
  const clean = text.trim();
  if (!clean) {
    return { words: 0, sentences: 0, paragraphs: 0, avgSentenceLen: 0, longSentenceRatio: 0, connectiveCount: 0, uniqueWordRatio: 0, commaPerSentence: 0, hasIntroConcession: false };
  }
  const words = clean.split(/\s+/).filter(Boolean);
  const sentences = clean.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().split(/\s+/).length >= 3);
  const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const lens = sentences.map((s) => s.trim().split(/\s+/).length);
  const long = lens.filter((n) => n > 25).length;
  const lower = ' ' + clean.toLowerCase() + ' ';
  const connectives = CONNECTIVES.reduce((n, c) => n + (lower.includes(c) ? 1 : 0), 0);
  const uniq = new Set(words.map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, ''))).size;
  const commas = (clean.match(/,/g) ?? []).length;
  return {
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgSentenceLen: sentences.length ? words.length / sentences.length : 0,
    longSentenceRatio: sentences.length ? long / sentences.length : 0,
    connectiveCount: connectives,
    uniqueWordRatio: words.length ? uniq / words.length : 0,
    commaPerSentence: sentences.length ? commas / sentences.length : 0,
    hasIntroConcession: /however|nevertheless|although|admittedly|on the other hand/.test(lower),
  };
}

/**
 * Local band ESTIMATE (used when no AI examiner is configured, and always shown
 * as the objective layer). Deliberately conservative — never overclaims.
 */
export function estimateWritingBands(s: WritingStats): { ta: number; cc: number; lr: number; gra: number; overall: number } {
  if (s.words === 0) return { ta: 0, cc: 0, lr: 0, gra: 0, overall: 0 };
  const task = s.words >= 250 ? 7 : s.words >= 180 ? 6 : s.words >= 120 ? 5 : 4;
  const cc = s.paragraphs >= 3 && s.connectiveCount >= 4 ? 7 : s.paragraphs >= 2 && s.connectiveCount >= 2 ? 6 : s.paragraphs >= 1 ? 5 : 4;
  const lr = s.uniqueWordRatio >= 0.55 && s.words >= 150 ? 7 : s.uniqueWordRatio >= 0.45 ? 6 : s.uniqueWordRatio >= 0.3 ? 5 : 4;
  const gra = s.avgSentenceLen > 8 && s.avgSentenceLen < 30 && s.longSentenceRatio < 0.45 && s.commaPerSentence > 0.3 ? 7
    : s.avgSentenceLen > 5 && s.commaPerSentence > 0.15 ? 6 : 5;
  const overall = Math.round(((task + cc + lr + gra) / 4) * 2) / 2;
  return { ta: task, cc, lr, gra, overall };
}
