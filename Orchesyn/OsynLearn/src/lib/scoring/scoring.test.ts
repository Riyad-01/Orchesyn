import { describe, it, expect } from 'vitest';
import type { SpeechCapture, SpeakingMode, WordToken } from '@/types';
import {
  analyseSpeech,
  analyseGrammar,
  analysePauses,
  analysePace,
  analyseVocabulary,
  bandToCefr,
  bandToScore,
  correctedTtr,
  countSyllables,
  detectDisfluencies,
  detectFillers,
  fillerHistogram,
  ieltsCriteria,
  isContentWord,
  lemma,
  mtld,
  piecewise,
  scoreFillers,
  scorePace,
  scoreToBand,
  splitSentences,
  tokenize,
} from './index';

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

interface CaptureOpts {
  /** ms of silence inserted after every word */
  gapMs?: number;
  /** per-word duration */
  wordMs?: number;
  /** ASR confidence for every word, -1 = unavailable */
  confidence?: number;
  /** loudness 0..1 */
  loudness?: number;
  /** mark the capture as typed (no audio) */
  typed?: boolean;
}

function makeCapture(text: string, opts: CaptureOpts = {}): SpeechCapture {
  const { gapMs = 120, wordMs = 260, confidence = -1, loudness = 0.09, typed = false } = opts;
  const raw = text.split(/\s+/).filter(Boolean);
  const words: WordToken[] = [];
  let t = 0;
  for (const word of raw) {
    words.push({ word, startMs: t, endMs: t + wordMs, confidence });
    t += wordMs + gapMs;
  }
  const durationMs = typed ? 0 : Math.max(t - gapMs, 0);
  const envelope = typed ? [] : new Array(Math.ceil(durationMs / 100)).fill(loudness);
  return {
    transcript: text,
    words: typed ? [] : words,
    segments: [{ text, startMs: 0, endMs: durationMs, confidence, final: true }],
    audio: {
      durationMs,
      avgLoudness: typed ? -1 : loudness,
      peakLoudness: typed ? -1 : loudness * 2,
      silenceMs: typed ? 0 : gapMs * raw.length,
      envelope,
      clipped: false,
    },
    engine: typed ? 'manual' : 'web-speech',
    latencyMs: 1200,
    typedFallback: typed,
  };
}

function analyse(text: string, mode: SpeakingMode = 'impromptu', opts: CaptureOpts = {}) {
  return analyseSpeech({ sessionId: 'sess-test', mode, capture: makeCapture(text, opts) });
}

/** Build word timings from an explicit gap-after-each-word array. */
function wordsWithGaps(text: string, gaps: number[], wordMs = 260): WordToken[] {
  const out: WordToken[] = [];
  let t = 0;
  text.split(/\s+/).filter(Boolean).forEach((word, i) => {
    out.push({ word, startMs: t, endMs: t + wordMs, confidence: -1 });
    t += wordMs + (gaps[i] ?? 100);
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * text primitives
 * ------------------------------------------------------------------ */

describe('text primitives', () => {
  it('tags sentence boundaries', () => {
    const t = tokenize('I went home. She stayed there!');
    expect(t).toHaveLength(6);
    expect(t[2].endsSentence).toBe(true);
    expect(t[3].startsSentence).toBe(true);
    expect(t[5].endsSentence).toBe(true); // last token closes the utterance
  });

  it('splits sentences', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
    expect(splitSentences('no terminator here')).toEqual(['no terminator here']);
  });

  it('counts syllables sensibly', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('table')).toBe(2);
    expect(countSyllables('beautiful')).toBe(3);
    expect(countSyllables('education')).toBe(4);
    expect(countSyllables('')).toBe(0);
  });

  it('stems regular forms', () => {
    expect(lemma('running')).toBe('run');
    expect(lemma('studies')).toBe('study');
    expect(lemma('went')).toBe('go');
    expect(lemma('children')).toBe('child');
  });

  it('separates content from function words', () => {
    expect(isContentWord('the')).toBe(false);
    expect(isContentWord('of')).toBe(false);
    expect(isContentWord('education')).toBe(true);
    expect(isContentWord('a')).toBe(false);
  });

  it('interpolates piecewise scales', () => {
    expect(piecewise(0, [[0, 100], [10, 0]])).toBe(100);
    expect(piecewise(5, [[0, 100], [10, 0]])).toBe(50);
    expect(piecewise(20, [[0, 100], [10, 0]])).toBe(0); // clamps past the last anchor
  });
});

/* ------------------------------------------------------------------ *
 * fillers
 * ------------------------------------------------------------------ */

describe('filler detection', () => {
  it('counts hard fillers and collapses runs', () => {
    const hits = detectFillers(tokenize('um I went to um um the market'));
    const phrases = hits.map((h) => h.phrase);
    expect(phrases[0]).toBe('um');
    // the trailing "um um" collapses into one occurrence
    expect(hits).toHaveLength(2);
  });

  it('does not penalise "like" used as a verb', () => {
    const hits = detectFillers(tokenize('I like coffee and she likes tea very much'));
    expect(hits.filter((h) => h.phrase === 'like')).toHaveLength(0);
  });

  it('catches quotative "like" before a clause', () => {
    const hits = detectFillers(tokenize('I was like I cannot believe this'));
    expect(hits.some((h) => h.phrase === 'like')).toBe(true);
  });

  it('catches multi-word markers greedily', () => {
    const hits = detectFillers(tokenize('you know what i mean it was fine'));
    expect(hits.some((h) => h.phrase === 'you know what i mean')).toBe(true);
    expect(hits.some((h) => h.phrase === 'you know')).toBe(false);
  });

  it('counts "basically" and "actually" as soft fillers', () => {
    const hits = detectFillers(tokenize('basically it is actually fine'));
    expect(hits).toHaveLength(2);
  });

  it('scores clean speech above filler-heavy speech', () => {
    expect(scoreFillers(0, 60000).score).toBe(100);
    expect(scoreFillers(3, 60000).score).toBeGreaterThan(scoreFillers(18, 60000).score);
  });

  it('builds a histogram', () => {
    const h = fillerHistogram(detectFillers(tokenize('um well um basically um')));
    expect(h[0]).toEqual({ phrase: 'um', count: 3 });
  });
});

/* ------------------------------------------------------------------ *
 * pauses / pace
 * ------------------------------------------------------------------ */

describe('pause and pace analysis', () => {
  const text = 'the quick brown fox jumps over the lazy dog near the river bank';

  it('finds no pauses in continuous speech', () => {
    const words = makeCapture(text, { gapMs: 80 }).words;
    const r = analysePauses(words, tokenize(text));
    expect(r.count).toBe(0);
    expect(r.meanRunLength).toBe(13);
  });

  it('classifies a 1.5s gap as awkward', () => {
    // 13 words -> 12 gaps; a 1500ms gap after the 6th word
    const gaps = new Array(12).fill(80);
    gaps[5] = 1500;
    const r = analysePauses(wordsWithGaps(text, gaps), tokenize(text));
    expect(r.awkwardCount).toBe(1);
    expect(r.longestMs).toBe(1500);
  });

  it('treats a 500ms mid-sentence gap as natural', () => {
    const gaps = new Array(12).fill(80);
    gaps[5] = 500;
    const r = analysePauses(wordsWithGaps(text, gaps), tokenize(text));
    expect(r.count).toBe(1);
    expect(r.awkwardCount).toBe(0);
  });

  it('detects a long pause at the very start', () => {
    const words = makeCapture(text, { gapMs: 80 }).words.map((w) => ({
      ...w, startMs: w.startMs + 4000, endMs: w.endMs + 4000,
    }));
    const r = analysePauses(words, tokenize(text));
    expect(r.latencyToStartMs).toBe(4000);
  });

  it('gives the ideal pace band the top score', () => {
    const ideal = scorePace(135, 140, 4.6, true);
    expect(ideal).toBeGreaterThan(scorePace(60, 62, 2.4, true));
    expect(ideal).toBeGreaterThan(scorePace(230, 235, 7.6, true));
    expect(ideal).toBeGreaterThanOrEqual(90);
  });

  it('measures wpm from timings', () => {
    // 13 words, 260ms each + 120ms gap = 4940ms  -> ~158 wpm
    const cap = makeCapture(text, { gapMs: 120, wordMs: 260 });
    const r = analysePace(tokenize(text), cap.words, cap.audio.durationMs, 0);
    expect(r.wpm).toBeGreaterThan(140);
    expect(r.wpm).toBeLessThan(180);
  });
});

/* ------------------------------------------------------------------ *
 * vocabulary
 * ------------------------------------------------------------------ */

describe('vocabulary analysis', () => {
  it('rates varied language above repetitive language', () => {
    const varied = analyseVocabulary(tokenize(
      'Renewable energy transforms agriculture because irrigation demands reliable electricity across remote villages',
    ));
    const repetitive = analyseVocabulary(tokenize(
      'good good good good good good good good good good good good thing thing thing thing',
    ));
    expect(varied.score).toBeGreaterThan(repetitive.score);
    expect(varied.lexicalDensity).toBeGreaterThan(60);
  });

  it('flags repeated content words', () => {
    const r = analyseVocabulary(tokenize('work work work work work and more work'));
    expect(r.repeated.some((x) => x.word === 'work')).toBe(true);
  });

  it('computes MTLD above zero for real text', () => {
    expect(mtld('the cat sat on the mat and the dog ran round the garden quickly'.split(' '))).toBeGreaterThan(0);
    expect(mtld(['a', 'b'])).toBe(0);
  });

  it('root TTR rises with variety', () => {
    expect(correctedTtr(10, 20)).toBeGreaterThan(correctedTtr(4, 20));
  });
});

/* ------------------------------------------------------------------ *
 * grammar
 * ------------------------------------------------------------------ */

describe('grammar rules', () => {
  const issuesFor = (text: string) => analyseGrammar(tokenize(text)).issues;
  const ids = (text: string) => issuesFor(text).map((i) => i.ruleId);

  it('catches "a" before a vowel sound', () => {
    const i = issuesFor('I saw a apple on the table');
    expect(ids('I saw a apple on the table')).toContain('article-a-before-vowel');
    expect(i[0].correction).toBe('an apple');
  });

  it('does not flag "a university" (yoo sound)', () => {
    expect(ids('I study at a university')).not.toContain('article-a-before-vowel');
  });

  it('catches "an" before a consonant sound', () => {
    expect(ids('He is an teacher')).toContain('article-an-before-consonant');
  });

  it('does not flag "an hour"', () => {
    expect(ids('It took an hour')).not.toContain('article-an-before-consonant');
  });

  it('catches third-person agreement', () => {
    const i = issuesFor('She go to school every day');
    expect(ids('She go to school every day')).toContain('agreement-third-person');
    expect(i.find((x) => x.ruleId === 'agreement-third-person')?.correction).toBe('She goes');
  });

  it('catches "he don\'t"', () => {
    expect(ids("He don't know the answer")).toContain('agreement-third-person');
  });

  it('catches plural-subject agreement', () => {
    expect(ids('They is coming tomorrow')).toContain('agreement-plural-subject');
    expect(ids('You was late')).toContain('agreement-plural-subject');
  });

  it('catches past form after an auxiliary', () => {
    const i = issuesFor("I didn't went to the market");
    expect(ids("I didn't went to the market")).toContain('past-after-auxiliary');
    expect(i[0].correction).toBe("didn't go");
  });

  it('does not flag "did" as a main verb', () => {
    expect(ids('I did my homework yesterday')).not.toContain('past-after-auxiliary');
  });

  it('catches "I am agree"', () => {
    expect(ids('I am agree with you')).toContain('stative-progressive');
  });

  it('catches stative -ing', () => {
    expect(ids('I am knowing the answer')).toContain('stative-progressive');
  });

  it('catches uncountable plurals with the right singular', () => {
    const i = issuesFor('He gave me many informations');
    const rule = i.find((x) => x.ruleId === 'uncountable-plural');
    expect(rule).toBeDefined();
    expect(rule?.correction).toBe('information');
  });

  it('catches double comparatives', () => {
    expect(ids('This is more better than that')).toContain('double-comparative');
    expect(ids('It was very unique')).toContain('double-comparative');
  });

  it('catches since/for mix-ups', () => {
    expect(ids('I have lived here since 5 years')).toContain('since-vs-for');
    expect(ids('I have worked for Monday')).toContain('since-vs-for');
  });

  it('catches redundancies', () => {
    expect(ids('We will discuss about the plan')).toContain('redundant-partner-words');
    expect(ids('Please revert back to me')).toContain('redundant-partner-words');
    expect(ids('She is married with a doctor')).toContain('redundant-partner-words');
  });

  it('catches time prepositions', () => {
    expect(ids('I saw him on yesterday')).toContain('time-prepositions');
    expect(ids('See you in Monday')).toContain('time-prepositions');
    expect(ids('It happened at 2019')).toContain('time-prepositions');
    expect(ids('I study in night')).toContain('time-prepositions');
  });

  it('catches double negatives', () => {
    expect(ids("I don't have no money")).toContain('double-negative');
  });

  it('catches "should of"', () => {
    const i = issuesFor('I should of called you');
    expect(ids('I should of called you')).toContain('modal-of');
    expect(i[0].correction).toBe('should have');
  });

  it('catches much/many errors', () => {
    expect(ids('There are much students here')).toContain('much-countable');
    expect(ids('I need many information')).toContain('much-countable');
  });

  it('catches "one of my friend"', () => {
    const i = issuesFor('He is one of my friend');
    expect(ids('He is one of my friend')).toContain('one-of-plural');
    expect(i[0].correction).toBe('one of my friends');
  });

  it('catches "there is many reasons"', () => {
    expect(ids('There is many reasons for this')).toContain('there-is-plural');
  });

  it('does not flag "there is news"', () => {
    expect(ids('There is news about the exam')).not.toContain('there-is-plural');
  });

  it('flags informal register', () => {
    expect(ids('I gonna tell you something')).toContain('informal-contraction');
  });

  it('flags doubled words but not intentional emphasis', () => {
    expect(ids('I went went to the shop')).toContain('repeated-word');
    expect(ids('I had had enough of it')).not.toContain('repeated-word');
  });

  it('flags "me and my friend"', () => {
    expect(ids('Me and my friend went out')).toContain('me-and-x');
  });

  it('returns nothing for a clean sentence', () => {
    expect(issuesFor('I have been learning English for three years and I enjoy it')).toEqual([]);
  });

  it('scores clean text above error-dense text', () => {
    const clean = analyseGrammar(tokenize(
      'I have been learning English for three years and I enjoy reading novels every evening',
    ));
    const messy = analyseGrammar(tokenize(
      "He don't went to a university and she is having many informations about it since 5 years",
    ));
    expect(clean.score).toBeGreaterThan(messy.score);
    expect(clean.errorCount).toBe(0);
    expect(messy.errorCount).toBeGreaterThanOrEqual(4);
  });

  it('attaches a word index to every issue', () => {
    for (const issue of issuesFor("She go to a university and he don't like it")) {
      expect(issue.wordIndex).toBeGreaterThanOrEqual(0);
    }
  });
});

/* ------------------------------------------------------------------ *
 * fluency
 * ------------------------------------------------------------------ */

describe('disfluency detection', () => {
  it('finds a self-correction', () => {
    const d = detectDisfluencies(tokenize('I go I went to the market'));
    expect(d.some((x) => x.kind === 'self-correction')).toBe(true);
  });

  it('finds a restart', () => {
    const d = detectDisfluencies(tokenize('So so the main point is this'));
    expect(d.some((x) => x.kind === 'restart')).toBe(true);
  });

  it('ignores ordinary speech', () => {
    expect(detectDisfluencies(tokenize('The government announced a new policy last week'))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * band mapping
 * ------------------------------------------------------------------ */

describe('band mapping', () => {
  it('is monotonic and snapped to half bands', () => {
    let prev = 0;
    for (let s = 0; s <= 100; s += 1) {
      const band = scoreToBand(s);
      expect(band).toBeGreaterThanOrEqual(prev);
      prev = band;
      expect(Math.abs(band * 2 - Math.round(band * 2))).toBeLessThan(1e-9);
    }
  });

  it('maps the documented anchors', () => {
    expect(scoreToBand(54)).toBe(5.0);
    expect(scoreToBand(68)).toBe(6.0);
    expect(scoreToBand(80)).toBe(7.0);
    expect(scoreToBand(100)).toBe(9.0);
  });

  it('inverts approximately', () => {
    for (const band of [5, 6, 7, 8]) {
      expect(Math.abs(scoreToBand(bandToScore(band)) - band)).toBeLessThanOrEqual(0.5);
    }
  });

  it('aligns CEFR levels', () => {
    expect(bandToCefr(4.5)).toBe('B1');
    expect(bandToCefr(6.5)).toBe('B2');
    expect(bandToCefr(7.5)).toBe('C1');
    expect(bandToCefr(9)).toBe('C2');
  });

  it('folds seven dimensions into the four IELTS criteria', () => {
    const c = ieltsCriteria({ fluency: 80, fillers: 80, pace: 80, vocabulary: 70, grammar: 60, pronunciation: 75, clarity: 70 });
    expect(c.fc).toBe(80); // 80*.55 + 80*.2 + 80*.25
    expect(c.lr).toBe(70);
    expect(c.gra).toBe(60);
    expect(c.pra).toBe(74);
    expect(c.overallBand).toBeGreaterThan(5);
    expect(c.overallBand).toBeLessThan(8);
  });
});

/* ------------------------------------------------------------------ *
 * end-to-end
 * ------------------------------------------------------------------ */

describe('analyseSpeech end to end', () => {
  const strong = `Well, I would say that renewable energy has completely transformed my village.
    Earlier we depended on kerosene lamps, which were expensive and hazardous.
    Now that solar panels have been installed, children can study after sunset and
    small businesses operate throughout the evening. The government should certainly
    subsidise these installations, because the initial cost remains prohibitive for
    most households. Personally, I believe the environmental benefit is equally significant.`;

  const weak = `um so basically I think that like technology is very very good and um
    it is like you know it help peoples a lot and I am agree with this and
    we are having many informations about it since 5 years`;

  it('scores the strong answer well above the weak one', () => {
    const a = analyse(strong, 'impromptu', { gapMs: 150, confidence: 0.93 });
    const b = analyse(weak, 'impromptu', { gapMs: 420, confidence: 0.62 });
    expect(a.overall).toBeGreaterThan(b.overall);
    expect(a.band).toBeGreaterThan(b.band);
    expect(a.metrics.fillerCount).toBeLessThan(b.metrics.fillerCount);
    expect(a.metrics.errorCount).toBeLessThan(b.metrics.errorCount);
  });

  it('produces a complete report shape', () => {
    const r = analyse(strong, 'impromptu', { confidence: 0.9 });
    expect(r.id).toBe('rpt_sess-test');
    expect(r.dimensions.length).toBeGreaterThanOrEqual(6);
    expect(r.strongPoints.length).toBeGreaterThan(0);
    expect(r.coachNote.length).toBeGreaterThan(40);
    expect(r.metrics.wordCount).toBeGreaterThan(40);
    expect(r.metrics.wpm).toBeGreaterThan(0);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
    expect(r.analysisMs).toBeGreaterThanOrEqual(0);
    for (const d of r.dimensions) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(100);
      expect(d.verdict.length).toBeGreaterThan(0);
      expect(d.summary.length).toBeGreaterThan(0);
    }
  });

  it('reports IELTS criteria for exam modes', () => {
    const r = analyse(strong, 'ielts-part2', { confidence: 0.9 });
    expect(r.mode).toBe('ielts-part2');
    // exam modes score the four official criteria, not fillers/pace/clarity
    expect(r.dimensions.map((d) => d.key)).toEqual(
      expect.arrayContaining(['fluency', 'vocabulary', 'grammar', 'pronunciation']),
    );
    expect(r.dimensions.map((d) => d.key)).not.toContain('fillers');
  });

  it('caps scores when the speech is too short', () => {
    const short = analyse('Yes it is good', 'impromptu', { gapMs: 100, confidence: 0.95 });
    expect(short.metrics.durationMs).toBeLessThan(15000);
    expect(short.overall).toBeLessThanOrEqual(80);
    expect(short.coachNote).toMatch(/provisional/);
  });

  it('neutralises acoustic dimensions for typed answers', () => {
    const r = analyse(strong, 'impromptu', { typed: true });
    expect(r.typedFallback).toBe(true);
    const keys = r.dimensions.map((d) => d.key);
    expect(keys).not.toContain('pronunciation');
    expect(keys).not.toContain('pace');
    expect(keys).not.toContain('clarity');
    expect(r.coachNote).toMatch(/typed/);
  });

  it('handles an empty transcript without crashing', () => {
    const r = analyse('', 'impromptu');
    expect(r.metrics.wordCount).toBe(0);
    expect(r.overall).toBe(0);
    expect(r.dimensions.length).toBeGreaterThanOrEqual(0);
  });

  it('detects fillers in a real transcript', () => {
    const r = analyse(weak, 'impromptu', { gapMs: 300, confidence: 0.6 });
    const phrases = r.fillers.map((f) => f.phrase);
    expect(phrases).toContain('um');
    expect(phrases).toContain('basically');
    expect(r.dimensions.find((d) => d.key === 'fillers')!.score).toBeLessThan(90);
  });

  it('finds grammar issues and explains them', () => {
    const r = analyse(weak, 'impromptu', { gapMs: 300, confidence: 0.6 });
    expect(r.grammarIssues.length).toBeGreaterThan(0);
    for (const g of r.grammarIssues) {
      expect(g.explanation.length).toBeGreaterThan(10);
      expect(g.correction.length).toBeGreaterThan(0);
    }
  });

  it('attaches a drill to the weakest dimensions', () => {
    const r = analyse(weak, 'impromptu', { gapMs: 300, confidence: 0.6 });
    expect(r.nextDrills.length).toBeGreaterThan(0);
    for (const d of r.nextDrills) {
      expect(d.drillId.length).toBeGreaterThan(0);
      expect(d.title.length).toBeGreaterThan(0);
    }
  });

  it('measures a pause-heavy answer as less fluent', () => {
    const smooth = analyse(strong, 'impromptu', { gapMs: 90, confidence: 0.92 });
    const choppy = analyse(strong, 'impromptu', { gapMs: 1400, confidence: 0.92 });
    const fluencyOf = (r: typeof smooth) => r.dimensions.find((d) => d.key === 'fluency')!.score;
    expect(fluencyOf(smooth)).toBeGreaterThan(fluencyOf(choppy));
    expect(choppy.metrics.awkwardPauseCount).toBeGreaterThan(0);
  });

  it('reports dimensions as unmeasurable, not failed, for very short speech', () => {
    const r = analyse('Yes it is good', 'impromptu', { gapMs: 900 });
    // four words is not enough to score anything — the UI must show "speak longer",
    // not a wall of red zeros
    expect(r.dimensions.filter((d) => d.score >= 0)).toHaveLength(0);
    expect(r.overall).toBe(0);
    expect(r.coachNote).toMatch(/not enough speech/i);
    expect(r.focusAreas.some((f) => /fewer than 20 words/.test(f))).toBe(true);
  });

  it('does not praise a four-word answer for filler control', () => {
    const r = analyse('Yes it is good', 'impromptu', { gapMs: 900 });
    expect(r.strongPoints.join(' ')).not.toMatch(/confident/);
  });

  it('marks the filler rate unmeasurable under 8 seconds of audio', () => {
    expect(scoreFillers(0, 4000).score).toBe(-1);
    expect(scoreFillers(0, 60000).score).toBe(100);
  });

  it('scores a typed answer on language alone', () => {
    const r = analyse(weak, 'impromptu', { typed: true });
    const keys = r.dimensions.map((d) => d.key);
    // fillers and grammar are textual, so they survive; acoustics do not
    expect(keys).toContain('fillers');
    expect(keys).toContain('grammar');
    expect(r.metrics.fillerRatePerMin).toBeGreaterThan(0);
  });

  it('runs fast enough for the <20s feedback promise', () => {
    const t0 = performance.now();
    analyse(strong, 'impromptu', { confidence: 0.9 });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(400);
  });
});
