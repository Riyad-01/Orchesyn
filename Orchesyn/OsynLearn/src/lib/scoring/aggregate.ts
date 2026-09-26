import type {
  CEFRLevel,
  DimensionKey,
  DimensionScore,
  FeedbackReport,
  SpeechCapture,
  SpeechMetrics,
  SpeakingMode,
  Tip,
} from '@/types';
import { isKnownWord } from '@/lib/data/generated/frequency';
import { tokenize, sentenceCount, splitSentences, round1, clamp, type Token } from './text';
import { analysePauses } from './pauses';
import { analysePace, paceAdvice, IDEAL_WPM_MAX, IDEAL_WPM_MIN } from './pace';
import { detectFillers, fillerHistogram, scoreFillers } from './fillers';
import { analyseVocabulary, suggestedUpgrades } from './vocabulary';
import { analyseGrammar, type GrammarResult } from './grammar';
import { getLanguage } from '@/lib/i18n/languages';
import { analysePronunciation, drillWords, type PhonemeInput } from './pronunciation';
import { detectDisfluencies, scoreClarity, scoreFluency } from './fluency';
import { bandToCefr, ieltsCriteria, scoreToBand, weightedOverall } from './band';

/** How much each dimension contributes to the overall score, per mode. */
export const MODE_WEIGHTS: Record<SpeakingMode, Record<DimensionKey, number>> = {
  impromptu: { pronunciation: 0.2, fluency: 0.2, grammar: 0.15, vocabulary: 0.15, fillers: 0.1, pace: 0.1, clarity: 0.1 },
  coach: { fluency: 0.25, grammar: 0.2, vocabulary: 0.2, pronunciation: 0.15, fillers: 0.1, pace: 0.05, clarity: 0.05 },
  drill: { pronunciation: 0.25, fluency: 0.25, grammar: 0.15, vocabulary: 0.1, fillers: 0.1, pace: 0.1, clarity: 0.05 },
  'ielts-part1': { fluency: 0.25, vocabulary: 0.25, grammar: 0.25, pronunciation: 0.25, fillers: 0, pace: 0, clarity: 0 },
  'ielts-part2': { fluency: 0.25, vocabulary: 0.25, grammar: 0.25, pronunciation: 0.25, fillers: 0, pace: 0, clarity: 0 },
  'ielts-part3': { fluency: 0.25, vocabulary: 0.25, grammar: 0.25, pronunciation: 0.25, fillers: 0, pace: 0, clarity: 0 },
  // ETS-style: fluency + intelligibility dominate, language use supports
  toefl: { fluency: 0.3, pronunciation: 0.25, grammar: 0.2, vocabulary: 0.15, fillers: 0.05, pace: 0.05, clarity: 0 },
  interview: { fluency: 0.25, grammar: 0.25, vocabulary: 0.2, pace: 0.15, fillers: 0.1, pronunciation: 0.05, clarity: 0 },
};

/** Below this duration there is not enough speech to judge reliably. */
export const MIN_RELIABLE_MS = 15000;

export interface AnalyseInput {
  sessionId: string;
  mode: SpeakingMode;
  capture: SpeechCapture;
  topicTitle?: string;
  sampleAnswer?: string;
  /** cloud phoneme data when a paid engine is wired in */
  phonemes?: PhonemeInput[];
  /** emphasise one dimension for targeted drills */
  focusDimension?: DimensionKey;
  /** BCP-47 tag of the spoken language (see lib/i18n/languages) */
  language?: string;
  now?: Date;
}

export function analyseSpeech(input: AnalyseInput): FeedbackReport {
  const started = Date.now();
  const { capture, mode } = input;
  const lang = getLanguage(input.language);
  const tokens: Token[] = tokenize(capture.transcript);
  const spokenTokens = tokens.filter((t) => t.word);
  // Script intelligence: deep analysis follows what was ACTUALLY spoken, not
  // just the saved preference. A Bangla-set profile answering in English still
  // gets English grammar; an English-set session answered in Bangla does not
  // get Latin rules forced onto it.
  const latinRatio = spokenTokens.length
    ? spokenTokens.filter((t) => /[a-z]/i.test(t.word)).length / spokenTokens.length
    : 0;
  const grammarOn = spokenTokens.length ? latinRatio > 0.5 : lang.grammarReady;

  /* ---- metrics ---- */
  const pauses = analysePauses(capture.words, tokens);
  const pace = analysePace(tokens, capture.words, capture.audio.durationMs, pauses.totalMs, lang.paceBand);
  const fillerHits = detectFillers(tokens, capture.words, lang.fillers);
  // A typed answer has no clock, so estimate one at 130 wpm to keep the filler
  // rate meaningful instead of reporting "unmeasurable" for everything.
  const effectiveMs = capture.typedFallback
    ? Math.max(capture.audio.durationMs, (spokenTokens.length / 130) * 60000)
    : capture.audio.durationMs;
  const fillerScore = scoreFillers(fillerHits.length, effectiveMs);
  const vocabulary = analyseVocabulary(tokens, capture.words);
  // Deep grammar rules are English-first: for other languages we report the
  // dimension as unmeasurable (-1) and re-normalise weights instead of faking it.
  const neutralGrammar: GrammarResult = {
    issues: [], errorCount: 0, errorsPer100Words: 0, byCategory: {}, score: -1,
    verdict: 'Grammar deep-check is English-first — scored on fluency, pace, fillers and clarity instead.',
  };
  const grammar = grammarOn ? analyseGrammar(tokens) : neutralGrammar;
  const pronunciation = analysePronunciation(tokens, capture.words, input.phonemes ?? [], capture.audio.avgLoudness);
  const disfluencies = detectDisfluencies(tokens);
  const fluency = scoreFluency({
    pauses, pace, fillerCount: fillerHits.length,
    durationMs: capture.audio.durationMs, tokens, disfluencies,
  });
  const unknownRatio = grammarOn && spokenTokens.length
    ? spokenTokens.filter((t) => !isKnownWord(t.word) && t.word.length > 3).length / spokenTokens.length
    : 0;
  const clarity = scoreClarity({
    avgAsrConfidence: avgConfidence(capture.words),
    avgLoudness: capture.audio.avgLoudness,
    peakLoudness: capture.audio.peakLoudness,
    artRate: pace.artRate,
    unknownWordRatio: unknownRatio,
    clipped: capture.audio.clipped,
    wordCount: spokenTokens.length,
  });

  const sentences = splitSentences(capture.transcript);
  const wordCount = spokenTokens.length;
  const avgConf = avgConfidence(capture.words);
  const minutes = Math.max(capture.audio.durationMs / 60000, 1 / 60);

  const metrics: SpeechMetrics = {
    wordCount,
    durationMs: Math.round(capture.audio.durationMs),
    wpm: pace.wpm,
    artRate: pace.artRate,
    syllablesPerSec: pace.syllablesPerSec,
    fillerCount: fillerHits.length,
    fillerRatePerMin: fillerScore.ratePerMin,
    pauseCount: pauses.count,
    awkwardPauseCount: pauses.awkwardCount,
    longestPauseMs: pauses.longestMs,
    totalPauseMs: pauses.totalMs,
    meanRunLength: pauses.meanRunLength,
    uniqueWords: vocabulary.uniqueWords,
    ttr: vocabulary.ttr,
    cttr: vocabulary.cttr,
    mtld: vocabulary.mtld,
    lexicalDensity: vocabulary.lexicalDensity,
    avgWordTier: vocabulary.avgWordTier,
    rareWordCount: vocabulary.rareWordCount,
    selfCorrectionCount: fluency.selfCorrectionCount,
    restartCount: fluency.restartCount,
    avgSentenceLength: sentences.length ? round1(wordCount / sentences.length) : 0,
    sentenceCount: sentenceCount(capture.transcript),
    errorCount: grammar.errorCount,
    errorsPer100Words: grammar.errorsPer100Words,
    avgAsrConfidence: avgConf,
    avgLoudness: round1(capture.audio.avgLoudness * 100) / 100,
    latencyToStartMs: pauses.latencyToStartMs,
  };

  /* ---- dimensions ---- */
  const raw: Record<DimensionKey, number> = {
    pronunciation: pronunciation.score,
    fluency: fluency.score,
    grammar: grammar.score,
    vocabulary: vocabulary.score,
    fillers: fillerScore.score,
    pace: pace.score,
    clarity: clarity.score,
  };

  // Too little speech: cap everything so a 5-second answer cannot score 95.
  const tooShort = capture.audio.durationMs < MIN_RELIABLE_MS;
  if (tooShort) {
    const cap = Math.round(clamp(45 + (capture.audio.durationMs / MIN_RELIABLE_MS) * 35, 0, 80));
    for (const key of Object.keys(raw) as DimensionKey[]) raw[key] = Math.min(raw[key], cap);
  }
  // Nothing was said: every dimension is unmeasurable and the overall is zero.
  const noSpeech = spokenTokens.length === 0;
  if (noSpeech) {
    for (const key of Object.keys(raw) as DimensionKey[]) raw[key] = -1;
  }
  // Typed fallback has no acoustic signal at all — neutralise those dimensions.
  if (capture.typedFallback) {
    raw.pronunciation = -1;
    raw.pace = -1;
    raw.clarity = -1;
    raw.fillers = Math.min(raw.fillers, 95);
  }

  const dimensions: DimensionScore[] = buildDimensions({
    raw, mode, tokens, metrics, pauses, pace, fillerHits, fillerScore,
    vocabulary, grammar, pronunciation, fluency, clarity, tooShort,
    typedFallback: capture.typedFallback, focusDimension: input.focusDimension,
  });

  /* ---- overall / band ---- */
  const isIelts = mode.startsWith('ielts');
  const usableDims: Record<string, number> = {};
  for (const d of dimensions) if (d.score >= 0) usableDims[d.key] = d.score;

  let overall: number;
  let band: number;
  if (isIelts) {
    const c = ieltsCriteria(usableDims);
    band = c.overallBand;
    overall = Math.round((c.fc + c.lr + c.gra + c.pra) / 4);
  } else {
    const weights = { ...MODE_WEIGHTS[mode] };
    if (input.focusDimension) weights[input.focusDimension] = (weights[input.focusDimension] ?? 0.1) + 0.25;
    // drop unavailable dimensions and re-normalise
    for (const key of Object.keys(weights) as DimensionKey[]) {
      if (usableDims[key] === undefined) weights[key] = 0;
    }
    overall = weightedOverall({ dimensions: usableDims, weights });
    band = scoreToBand(overall);
  }
  const cefr: CEFRLevel = bandToCefr(band);

  /* ---- narrative ---- */
  const strongPoints = pickStrongPoints(dimensions, metrics);
  const focusAreas = pickFocusAreas(dimensions, metrics);
  const nextDrills = buildNextDrills(dimensions, mode);

  const coachNote = buildCoachNote({
    band, overall, mode, metrics, dimensions, topicTitle: input.topicTitle, tooShort,
    typedFallback: capture.typedFallback,
  });

  return {
    id: `rpt_${input.sessionId}`,
    sessionId: input.sessionId,
    mode,
    createdAt: (input.now ?? new Date()).toISOString(),
    engine: capture.engine,
    typedFallback: capture.typedFallback,
    language: input.language,
    overall,
    band,
    cefr,
    dimensions,
    metrics,
    transcript: capture.transcript,
    words: capture.words,
    fillers: fillerHits,
    grammarIssues: grammar.issues,
    vocabHighlights: grammarOn ? vocabulary.highlights : [],
    pronunciationFlags: pronunciation.flags,
    pauses: pauses.pauses,
    audioEnvelope: (capture.audio.envelope ?? []).slice(-200),
    audioPitch: (capture.audio.pitch ?? []).slice(-200),
    strongPoints,
    focusAreas,
    sampleAnswer: input.sampleAnswer,
    coachNote,
    nextDrills,
    analysisMs: Date.now() - started,
  };
}

/* ------------------------------------------------------------------ *
 * dimension builders
 * ------------------------------------------------------------------ */

interface BuildArgs {
  raw: Record<DimensionKey, number>;
  mode: SpeakingMode;
  tokens: Token[];
  metrics: SpeechMetrics;
  pauses: ReturnType<typeof analysePauses>;
  pace: ReturnType<typeof analysePace>;
  fillerHits: ReturnType<typeof detectFillers>;
  fillerScore: ReturnType<typeof scoreFillers>;
  vocabulary: ReturnType<typeof analyseVocabulary>;
  grammar: ReturnType<typeof analyseGrammar>;
  pronunciation: ReturnType<typeof analysePronunciation>;
  fluency: ReturnType<typeof scoreFluency>;
  clarity: ReturnType<typeof scoreClarity>;
  tooShort: boolean;
  typedFallback: boolean;
  focusDimension?: DimensionKey;
}

const LABELS: Record<DimensionKey, string> = {
  pronunciation: 'Pronunciation',
  fluency: 'Fluency',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  fillers: 'Fillers',
  pace: 'Pace',
  clarity: 'Clarity',
};

function buildDimensions(a: BuildArgs): DimensionScore[] {
  const short = a.tooShort
    ? [{ title: 'Speak longer', detail: 'You spoke for under 15 seconds. Scores need at least 20-30 seconds of speech to be meaningful.', dimension: 'fluency' as DimensionKey }]
    : [];
  const typedNote = a.typedFallback
    ? [{ title: 'Use your microphone', detail: 'This answer was typed, so pronunciation, pace and clarity could not be measured.', dimension: 'pronunciation' as DimensionKey }]
    : [];

  const dims: DimensionScore[] = [];

  // ---- pronunciation ----
  dims.push({
    key: 'pronunciation',
    label: LABELS.pronunciation,
    score: a.raw.pronunciation,
    verdict: a.typedFallback ? 'Not measured' : a.pronunciation.verdict,
    summary: a.typedFallback
      ? 'No audio was captured, so individual sounds could not be assessed.'
      : a.pronunciation.estimated
        ? `Estimated from recogniser confidence and syllable timing on ${a.pronunciation.measuredWords || 'a few'} words. ${a.pronunciation.flags.length} word${a.pronunciation.flags.length === 1 ? '' : 's'} need attention.`
        : `Phoneme-level accuracy measured across ${a.pronunciation.measuredWords} words.`,
    evidence: a.pronunciation.flags.slice(0, 5).map((f) => ({
      quote: f.word, note: f.reason, severity: f.score < 50 ? ('bad' as const) : ('warn' as const), wordIndex: f.wordIndex,
    })),
    tips: [
      ...typedNote,
      ...(a.pronunciation.flags.length
        ? [{
            title: `Drill: ${drillWords(a.pronunciation).slice(0, 4).join(', ')}`,
            detail: 'Say each word slowly, exaggerating the stressed syllable, then at natural speed. Record and compare.',
            dimension: 'pronunciation' as DimensionKey,
            drill: 'pronunciation-minimal-pairs',
          }]
        : []),
    ],
    metrics: { measuredWords: a.pronunciation.measuredWords, flagged: a.pronunciation.flags.length, estimated: a.pronunciation.estimated ? 'yes' : 'no' },
  });

  // ---- fluency ----
  dims.push({
    key: 'fluency',
    label: LABELS.fluency,
    score: a.raw.fluency,
    verdict: a.fluency.verdict,
    summary: `Average ${a.fluency.meanRunLength} words spoken per run. ${a.pauses.awkwardCount} awkward pause${a.pauses.awkwardCount === 1 ? '' : 's'}${a.fluency.disfluencies.length ? ` and ${a.fluency.disfluencies.length} false start${a.fluency.disfluencies.length === 1 ? '' : 's'}` : ''}.`,
    evidence: a.fluency.disfluencies.slice(0, 5).map((d) => ({
      quote: d.quote, note: d.note, severity: 'warn' as const, wordIndex: d.wordIndex,
    })),
    tips: [
      ...short,
      ...(a.pauses.awkwardCount > 1
        ? [{
            title: 'Fill the gap with a linker',
            detail: 'When you lose the thread, say "that said", "on the other hand" or "what I mean is" instead of going silent. It keeps the run going and buys thinking time.',
            dimension: 'fluency' as DimensionKey,
            drill: 'linker-bridges',
          }]
        : []),
      ...(a.pauses.latencyToStartMs > 2500
        ? [{
            title: 'Start with a stock opener',
            detail: `You waited ${(a.pauses.latencyToStartMs / 1000).toFixed(1)}s before your first word. Open with "Well, I would say that…" while you plan the rest.`,
            dimension: 'fluency' as DimensionKey,
            drill: 'openers',
          }]
        : []),
    ],
    metrics: a.fluency.detail,
  });

  // ---- grammar ----
  const upgrades = suggestedUpgrades(a.tokens);
  dims.push({
    key: 'grammar',
    label: LABELS.grammar,
    score: a.raw.grammar,
    verdict: a.grammar.verdict,
    summary: a.grammar.errorCount === 0
      ? 'No grammatical errors were detected in this answer.'
      : `${a.grammar.errorCount} issue${a.grammar.errorCount === 1 ? '' : 's'} (${a.grammar.errorsPer100Words} per 100 words), across ${Object.keys(a.grammar.byCategory).length} categor${Object.keys(a.grammar.byCategory).length === 1 ? 'y' : 'ies'}.`,
    evidence: a.grammar.issues.slice(0, 6).map((g) => ({
      quote: g.quote,
      note: `${g.explanation} → "${g.correction}"`,
      severity: g.severity === 'bad' ? ('bad' as const) : ('warn' as const),
      wordIndex: g.wordIndex,
    })),
    tips: a.grammar.issues.length
      ? topRuleTips(a.grammar.byCategory)
      : [{
          title: 'Add a complex sentence',
          detail: 'Error-free is good; now add range. Try one conditional ("If I had more time, I would…") and one relative clause in your next answer.',
          dimension: 'grammar' as DimensionKey,
          drill: 'complex-structures',
        }],
    metrics: { errors: a.grammar.errorCount, per100Words: a.grammar.errorsPer100Words, ...a.grammar.byCategory },
  });

  // ---- vocabulary ----
  dims.push({
    key: 'vocabulary',
    label: LABELS.vocabulary,
    score: a.raw.vocabulary,
    verdict: a.vocabulary.verdict,
    summary: `${a.vocabulary.uniqueWords} distinct words, ${a.vocabulary.lexicalDensity}% of them content words. MTLD ${a.vocabulary.mtld}.`,
    evidence: [
      ...a.vocabulary.repeated.slice(0, 3).map((r) => ({
        quote: r.word,
        note: `Used ${r.count} times — swap in a synonym to widen your range.`,
        severity: 'warn' as const,
      })),
      ...a.vocabulary.highlights.slice(0, 3).map((h) => ({
        quote: h.word,
        note: `Less common word used well (frequency tier ${h.tier}).`,
        severity: 'info' as const,
        wordIndex: h.wordIndex,
      })),
    ],
    tips: upgrades.slice(0, 3).map((u) => ({
      title: `Instead of "${u.instead}"`,
      detail: `${u.use} — ${u.why}`,
      dimension: 'vocabulary' as DimensionKey,
      drill: 'lexical-upgrades',
    })),
    metrics: {
      uniqueWords: a.vocabulary.uniqueWords, contentWords: a.vocabulary.contentWords,
      ttr: a.vocabulary.ttr, cttr: a.vocabulary.cttr, mtld: a.vocabulary.mtld,
      lexicalDensity: a.vocabulary.lexicalDensity, avgTier: a.vocabulary.avgWordTier,
      rareWords: a.vocabulary.rareWordCount,
    },
  });

  // ---- fillers ----
  const histogram = fillerHistogram(a.fillerHits);
  dims.push({
    key: 'fillers',
    label: 'Filler words',
    score: a.raw.fillers,
    verdict: a.fillerScore.verdict,
    summary: a.fillerHits.length === 0
      ? 'No filler words detected — very clean delivery.'
      : `${a.fillerHits.length} filler${a.fillerHits.length === 1 ? '' : 's'} (${a.fillerScore.ratePerMin} per minute). Top: ${histogram.slice(0, 3).map((h) => `${h.phrase} ×${h.count}`).join(', ')}.`,
    evidence: histogram.slice(0, 6).map((h) => ({
      quote: h.phrase,
      note: h.count === 1 ? 'Used once.' : `Used ${h.count} times.`,
      severity: h.count >= 4 ? ('bad' as const) : ('warn' as const),
    })),
    tips: [
      ...typedNote,
      ...(a.fillerHits.length > 2
        ? [{
            title: `Silence beats "${histogram[0]?.phrase ?? 'um'}"`,
            detail: `You said "${histogram[0]?.phrase ?? 'um'}" ${histogram[0]?.count ?? 0} times. A 1-second pause sounds thoughtful; a filler sounds unsure. Practise pausing on purpose.`,
            dimension: 'fillers' as DimensionKey,
            drill: 'filler-free-60',
          }]
        : []),
    ],
    metrics: { count: a.fillerHits.length, perMinute: a.fillerScore.ratePerMin, ...Object.fromEntries(histogram.map((h) => [h.phrase, h.count])) },
  });

  // ---- pace ----
  dims.push({
    key: 'pace',
    label: 'Pace',
    score: a.raw.pace,
    verdict: a.typedFallback ? 'Not measured' : a.pace.verdict,
    summary: a.typedFallback
      ? 'No audio, so speaking rate could not be measured.'
      : `${a.pace.wpm} words/min overall, ${a.pace.artRate} words/min of actual speaking, ${a.pace.syllablesPerSec} syllables/sec. Natural band is ${IDEAL_WPM_MIN}-${IDEAL_WPM_MAX} wpm.`,
    evidence: [],
    tips: a.typedFallback ? [] : [{ title: 'Pace check', detail: paceAdvice(a.pace), dimension: 'pace' as DimensionKey, drill: 'pace-metronome' }],
    metrics: { wpm: a.pace.wpm, articulationRate: a.pace.artRate, syllablesPerSec: a.pace.syllablesPerSec, syllables: a.pace.totalSyllables },
  });

  // ---- clarity ----
  dims.push({
    key: 'clarity',
    label: 'Clarity',
    score: a.raw.clarity,
    verdict: a.typedFallback ? 'Not measured' : a.clarity.verdict,
    summary: a.typedFallback
      ? 'No audio, so clarity could not be measured.'
      : `Blend of recogniser confidence, volume and word-recognition accuracy. Volume: ${String(a.clarity.detail.volume ?? 'not measured')}.`,
    evidence: [],
    tips: [
      ...typedNote,
      ...(a.clarity.detail.volume === 'quiet' || a.clarity.detail.volume === 'too quiet'
        ? [{ title: 'Project more', detail: 'Your average level was low. Hold the phone 15-20cm away and speak as if addressing someone across a table.', dimension: 'clarity' as DimensionKey, drill: 'projection' }]
        : []),
    ],
    metrics: a.clarity.detail,
  });

  // filter out dimensions that this mode does not score
  const weights = MODE_WEIGHTS[a.mode];
  return dims.filter((d) => d.score >= 0 && (weights[d.key] ?? 0) > 0);
}

function topRuleTips(byCategory: Record<string, number>): Tip[] {
  const order = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const map: Record<string, Tip> = {
    article: { title: 'Run the a/an drill', detail: 'Article errors are the most common slip for Indian, Bengali and Chinese L1 speakers. Say "an" before a vowel sound, "a" before a consonant sound.', dimension: 'grammar', drill: 'articles-a-an' },
    agreement: { title: 'Subject-verb agreement', detail: 'Third-person singular takes -s: "she works", "the government wants". Re-say your last answer focusing only on verb endings.', dimension: 'grammar', drill: 'subject-verb' },
    tense: { title: 'Base form after auxiliaries', detail: 'After did/didn\'t/can/should the verb never takes a past ending: "didn\'t go", not "didn\'t went".', dimension: 'grammar', drill: 'auxiliary-base-form' },
    'word-form': { title: 'Countable vs uncountable', detail: 'Words like information, advice, furniture, luggage and equipment have no plural. Say "a piece of information".', dimension: 'grammar', drill: 'countable-uncountable' },
    preposition: { title: 'Prepositions of time', detail: '"on" + day, "in" + month/year, "at" + clock time. No preposition before yesterday/today/tomorrow.', dimension: 'grammar', drill: 'time-prepositions' },
    style: { title: 'Watch the register', detail: 'Redundancies like "discuss about" and "return back" cost marks in IELTS and sound informal in interviews.', dimension: 'grammar', drill: 'register-clean-up' },
    repetition: { title: 'Avoid doubled words', detail: 'Repeating a word mid-sentence reads as a false start. Slow the start of each clause slightly.', dimension: 'fluency', drill: 'false-starts' },
  };
  return order.slice(0, 3).map(([cat]) => map[cat]).filter(Boolean);
}

function avgConfidence(words: { confidence: number }[]): number {
  const usable = words.filter((w) => w.confidence >= 0);
  if (!usable.length) return -1;
  return round1((usable.reduce((a, w) => a + w.confidence, 0) / usable.length) * 100) / 100;
}

/* ------------------------------------------------------------------ *
 * narrative
 * ------------------------------------------------------------------ */

function pickStrongPoints(dims: DimensionScore[], metrics: SpeechMetrics): string[] {
  const out: string[] = [];
  const measurable = dims.filter((d) => d.score >= 0);
  if (measurable.length === 0) return [];
  const sorted = [...measurable].sort((a, b) => b.score - a.score);
  for (const d of sorted.slice(0, 2)) {
    if (d.score >= 72) out.push(`${d.label}: ${d.verdict.toLowerCase()} (${d.score}/100).`);
  }
  // rate-based praise needs enough speech to be a real observation
  if (metrics.wordCount >= 15 && metrics.fillerCount <= 1) out.push('Almost no filler words — your delivery sounds confident.');
  if (metrics.errorCount === 0 && metrics.wordCount > 25) out.push('No grammatical errors across the whole answer.');
  if (metrics.durationMs >= 15000 && metrics.wpm >= 110 && metrics.wpm <= 165) {
    out.push(`Your pace of ${metrics.wpm} wpm is right in the natural range.`);
  }
  if (metrics.rareWordCount >= 4) out.push(`You reached for ${metrics.rareWordCount} less common words — good lexical ambition.`);
  return out.length ? out.slice(0, 3) : ['You completed the answer — showing up is the first win.'];
}

function pickFocusAreas(dims: DimensionScore[], metrics: SpeechMetrics): string[] {
  const out: string[] = [];
  const sorted = [...dims].filter((d) => d.score >= 0).sort((a, b) => a.score - b.score);
  for (const d of sorted.slice(0, 3)) {
    if (d.score < 78) out.push(`${d.label}: ${d.verdict.toLowerCase()} (${d.score}/100) — ${d.tips[0]?.detail ?? 'targeted practice needed.'}`);
  }
  if (metrics.wordCount > 0 && metrics.wordCount < 20) {
    out.push('You spoke fewer than 20 words. Length is itself a fluency skill — try to keep going for 45 seconds.');
  }
  if (metrics.awkwardPauseCount >= 3) out.push(`You broke off ${metrics.awkwardPauseCount} times mid-thought. Bridge gaps with linkers.`);
  // never leave the learner without a next step
  if (!out.length) {
    if (metrics.wordCount === 0) {
      out.push('No speech was captured — check mic permission, move closer, and make sure your network allows live captions; then retry the same topic.');
    } else {
      out.push('Strong session. Raise the bar: extend to 60+ seconds, add one linker per idea, or take a harder Impromptu topic.');
    }
  }
  return out.slice(0, 3);
}

function buildNextDrills(dims: DimensionScore[], mode: SpeakingMode) {
  const weakest = [...dims].filter((d) => d.score >= 0).sort((a, b) => a.score - b.score).slice(0, 3);
  return weakest.map((d) => {
    const drill = d.tips.find((t) => t.drill)?.drill ?? `improve-${d.key}`;
    return {
      dimension: d.key,
      drillId: drill,
      title: d.tips.find((t) => t.drill)?.title ?? `Improve ${d.label.toLowerCase()}`,
    };
  }).concat(mode.startsWith('ielts') ? [{ dimension: 'fluency' as DimensionKey, drillId: 'ielts-part2-longturn', title: 'Practise a 2-minute cue card' }] : []);
}

function buildCoachNote(a: {
  band: number; overall: number; mode: SpeakingMode; metrics: SpeechMetrics;
  dimensions: DimensionScore[]; topicTitle?: string; tooShort: boolean; typedFallback: boolean;
}): string {
  const topic = a.topicTitle ? ` on "${a.topicTitle}"` : '';
  const parts: string[] = [];
  parts.push(
    `You scored ${a.overall}/100 (IELTS band ${a.band.toFixed(1)})${topic}.`,
  );
  if (a.tooShort) {
    parts.push(`You only spoke for ${Math.round(a.metrics.durationMs / 1000)} seconds, so these scores are provisional — aim for at least 45 seconds next time.`);
  }
  if (a.typedFallback) {
    parts.push('This answer was typed rather than spoken, so pronunciation, pace and clarity were skipped.');
  }
  if (a.dimensions.length === 0) {
    parts.push('There was not enough speech to score. Speak for at least 20 seconds and I can give you a full breakdown.');
    return parts.join(' ');
  }
  const best = [...a.dimensions].sort((x, y) => y.score - x.score)[0];
  const worst = [...a.dimensions].sort((x, y) => x.score - y.score)[0];
  if (best && worst && best.key !== worst.key) {
    parts.push(`Your strongest area was ${best.label.toLowerCase()} (${best.score}), while ${worst.label.toLowerCase()} (${worst.score}) is where the next point lives.`);
  }
  const numbers = `${a.metrics.wordCount} words at ${a.metrics.wpm} wpm, ${a.metrics.fillerCount} filler${a.metrics.fillerCount === 1 ? '' : 's'} and ${a.metrics.errorCount} grammar issue${a.metrics.errorCount === 1 ? '' : 's'}.`;
  parts.push(numbers);
  return parts.join(' ');
}

export { MODE_WEIGHTS as WEIGHTS };
