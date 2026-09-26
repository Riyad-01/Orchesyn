/**
 * Domain model for the whole app.
 * Every screen, the scoring engine and the persistence layer speak these types.
 */

/* ------------------------------------------------------------------ *
 * Speaking modes
 * ------------------------------------------------------------------ */

export type SpeakingMode =
  | 'impromptu' // 60-second topic speech
  | 'coach' // free conversation with the AI coach
  | 'drill' // short targeted exercise (pronunciation / fluency drills)
  | 'ielts-part1'
  | 'ielts-part2'
  | 'ielts-part3'
  | 'toefl' // TOEFL iBT Speaking: Listen-&-Repeat + Interview tasks
  | 'interview'; // live AI interview system

export type IeltsPart = 1 | 2 | 3;

export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Goal =
  | 'ielts'
  | 'career'
  | 'interview'
  | 'study-abroad'
  | 'travel'
  | 'confidence'
  | 'general';

export type AccentTarget = 'neutral' | 'us' | 'uk' | 'au';

/* ------------------------------------------------------------------ *
 * Speech capture primitives
 * ------------------------------------------------------------------ */

export interface WordToken {
  word: string;
  /** ms from start of recording */
  startMs: number;
  endMs: number;
  /** 0..1 — ASR confidence. -1 when the engine cannot provide it. */
  confidence: number;
}

export interface TranscriptSegment {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  final: boolean;
}

export interface AudioStats {
  /** ms of captured audio */
  durationMs: number;
  /** RMS loudness 0..1 averaged over the capture */
  avgLoudness: number;
  peakLoudness: number;
  /** ms where the signal was below the silence threshold */
  silenceMs: number;
  /** per-frame loudness curve for the waveform UI (0..1) */
  envelope: number[];
  /** F0 contour in Hz (0 = unvoiced frame), on-device autocorrelation */
  pitch?: number[];
  /** true when the mic produced no usable signal */
  clipped: boolean;
}

export interface SpeechCapture {
  transcript: string;
  words: WordToken[];
  segments: TranscriptSegment[];
  audio: AudioStats;
  /** which engine produced this capture */
  engine: EngineKind;
  /** ms from "stop" to "transcript ready" */
  latencyMs: number;
  /** true when the user fell back to typing (no mic / unsupported browser) */
  typedFallback: boolean;
  /** ISO 639-1 language the cloud ASR actually heard (script intelligence) */
  detectedLanguage?: string;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export type DimensionKey =
  | 'pronunciation'
  | 'fluency'
  | 'grammar'
  | 'vocabulary'
  | 'fillers'
  | 'pace'
  | 'clarity';

export type EngineKind = 'web-speech' | 'cloud' | 'manual' | 'none';

export interface EvidenceItem {
  /** short quote from the transcript */
  quote: string;
  /** what is wrong / notable about it */
  note: string;
  /** severity drives colour in the UI */
  severity: 'info' | 'warn' | 'bad';
  /** word index the evidence points at, if known */
  wordIndex?: number;
}

export interface Tip {
  title: string;
  detail: string;
  /** e.g. 'grammar' | 'fillers' — lets the roadmap target weak dimensions */
  dimension: DimensionKey;
  /** an exercise the learner can repeat right now */
  drill?: string;
}

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  /** 0..100 */
  score: number;
  /** one-line verdict shown on the card header */
  verdict: string;
  summary: string;
  evidence: EvidenceItem[];
  tips: Tip[];
  /** raw numbers the UI can surface in an "insights" drawer */
  metrics: Record<string, number | string>;
}

export interface FillerOccurrence {
  phrase: string;
  index: number;
  wordIndex: number;
  atMs: number;
}

export interface GrammarIssue {
  ruleId: string;
  category: 'article' | 'agreement' | 'tense' | 'word-form' | 'preposition' | 'style' | 'repetition';
  quote: string;
  correction: string;
  explanation: string;
  severity: 'warn' | 'bad';
  wordIndex: number;
}

export interface VocabHighlight {
  word: string;
  tier: 1 | 2 | 3 | 4 | 5;
  wordIndex: number;
  atMs: number;
}

export interface PronunciationFlag {
  word: string;
  wordIndex: number;
  atMs: number;
  reason: string;
  /** 0..100, lower = worse */
  score: number;
  expected?: string;
  heard?: string;
  phonemes?: { phone: string; score: number }[];
}

export interface PauseEvent {
  atMs: number;
  durationMs: number;
  afterWordIndex: number;
  kind: 'natural' | 'long' | 'awkward';
}

export interface SpeechMetrics {
  wordCount: number;
  durationMs: number;
  /** words per minute over the whole capture */
  wpm: number;
  /** words per minute excluding pauses — articulation rate */
  artRate: number;
  /** words per second of syllables is more comparable across accents */
  syllablesPerSec: number;
  fillerCount: number;
  fillerRatePerMin: number;
  pauseCount: number;
  awkwardPauseCount: number;
  longestPauseMs: number;
  totalPauseMs: number;
  /** mean length of a spoken run between pauses, in words */
  meanRunLength: number;
  uniqueWords: number;
  /** type-token ratio */
  ttr: number;
  /** corrected TTR (root TTR) to limit length bias */
  cttr: number;
  /** lexical diversity over a moving window */
  mtld: number;
  /** % content words */
  lexicalDensity: number;
  /** average frequency tier of content words, 1 = most common */
  avgWordTier: number;
  rareWordCount: number;
  selfCorrectionCount: number;
  restartCount: number;
  avgSentenceLength: number;
  sentenceCount: number;
  errorCount: number;
  errorsPer100Words: number;
  /** 0..100 average ASR confidence; -1 when unavailable */
  avgAsrConfidence: number;
  /** 0..1 */
  avgLoudness: number;
  /** ms from start of recording to first spoken word */
  latencyToStartMs: number;
}

export interface FeedbackReport {
  id: string;
  sessionId: string;
  mode: SpeakingMode;
  createdAt: string;
  engine: EngineKind;
  typedFallback: boolean;
  /** BCP-47 tag of the language this session was spoken in */
  language?: string;

  /** 0..100 blended across the active dimensions */
  overall: number;
  /** IELTS-style 0..9 band, one decimal */
  band: number;
  /** CEFR estimate derived from the band + vocabulary signals */
  cefr: CEFRLevel;

  dimensions: DimensionScore[];
  metrics: SpeechMetrics;

  transcript: string;
  words: WordToken[];
  fillers: FillerOccurrence[];
  grammarIssues: GrammarIssue[];
  vocabHighlights: VocabHighlight[];
  pronunciationFlags: PronunciationFlag[];
  pauses: PauseEvent[];
  /** loudness curve (0..1) kept for prosody / intonation analysis */
  audioEnvelope?: number[];
  /** measured F0 contour (Hz, 0 = unvoiced) for true intonation feedback */
  audioPitch?: number[];
  /** ISO 639-1 language the cloud ASR actually heard */
  detectedLanguage?: string;
  /** LLM-augmented understanding layer (null-safe: absent = local engine only) */
  llm?: {
    improvements: string[];
    organization?: string;
    vocabulary?: string[];
    cefr?: string;
    model?: string;
  };

  strongPoints: string[];
  focusAreas: string[];
  /** model answer written for the exact prompt */
  sampleAnswer?: string;
  /** coach's own words — generated summary paragraph */
  coachNote: string;
  /** dimension keys the roadmap should prioritise next */
  nextDrills: { dimension: DimensionKey; drillId: string; title: string }[];
  /** ms the analysis took, shown as "< 20s" in the UI */
  analysisMs: number;
}

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

export interface Topic {
  id: string;
  title: string;
  category: string;
  difficulty: 1 | 2 | 3;
  /** seconds of prep before recording */
  prepSec: number;
  /** target speaking length */
  targetSec: number;
  prompts: string[];
  sampleAnswer: string;
  /** vocabulary the learner is nudged toward */
  keyVocab: string[];
  tags?: string[];
}

export interface CoachTheme {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  color: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  starter: string;
  followUps: string[];
  sampleAnswer: string;
  keyVocab: string[];
}

export interface Scenario {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  setting: string;
  goal: string;
  openingLine: string;
  beats: { role: 'coach' | 'user'; text: string; hint?: string }[];
  keyPhrases: string[];
  difficulty: 1 | 2 | 3;
}

export interface IeltsQuestion {
  id: string;
  part: IeltsPart;
  topic: string;
  question: string;
  /** Part 2 cue-card bullets */
  bullets?: string[];
  prepSec?: number;
  speakSec?: number;
  sampleAnswer?: string;
  bandDescriptors?: string[];
}

export interface IeltsMock {
  id: string;
  title: string;
  durationMin: number;
  part1: IeltsQuestion[];
  part2: IeltsQuestion;
  part3: IeltsQuestion[];
}

export interface Drill {
  id: string;
  title: string;
  dimension: DimensionKey;
  level: CEFRLevel | 'any';
  seconds: number;
  instruction: string;
  prompt: string;
  successCriterion: string;
  category: string;
}

export interface RoadmapDay {
  day: number;
  title: string;
  focus: DimensionKey;
  minutes: number;
  items: { kind: 'drill' | 'impromptu' | 'coach' | 'ielts' | 'review'; id: string; label: string }[];
  tip: string;
}

/* ------------------------------------------------------------------ *
 * Sessions / progress
 * ------------------------------------------------------------------ */

export type SessionStatus = 'in-progress' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  userId: string;
  mode: SpeakingMode;
  topicId?: string;
  themeId?: string;
  scenarioId?: string;
  drillId?: string;
  mockId?: string;
  title: string;
  status: SessionStatus;
  startedAt: string;
  finishedAt?: string;
  /** seconds actually spoken */
  spokenSec: number;
  overall: number;
  band: number;
  /** only the dimensions that were actually measurable this session */
  dimensionScores: Partial<Record<DimensionKey, number>>;
  reportId: string;
  streakDay?: number;
  /** created by the demo seeder so it can be identified / cleared */
  demo?: boolean;
}

export interface DailyProgress {
  /** yyyy-mm-dd in the learner's locale */
  date: string;
  spokenSec: number;
  sessions: number;
  goalSec: number;
  bestOverall: number;
  dimensions: Partial<Record<DimensionKey, number>>;
}

export interface StreakInfo {
  current: number;
  longest: number;
  /** yyyy-mm-dd list of qualifying days */
  days: string[];
  /** minutes per day the learner committed to */
  dailyGoalMin: number;
  /** true when today's goal is met */
  goalMetToday: boolean;
  /** true when the streak is still savable today */
  atRisk: boolean;
  freezeCount: number;
}

export interface SkillTrendPoint {
  date: string;
  overall: number;
  byDimension: Record<DimensionKey, number>;
}

/* ------------------------------------------------------------------ *
 * Profile / account / billing
 * ------------------------------------------------------------------ */

export type Plan = 'free' | 'plus' | 'pro';

export interface Profile {
  id: string;
  userId: string;
  name: string;
  email?: string;
  avatarColor: string;
  level: CEFRLevel;
  goal: Goal;
  accentTarget: AccentTarget;
  dailyGoalMin: number;
  /** minutes/day the learner realistically has */
  availableMinPerDay: number;
  nativeLanguage?: string;
  /** BCP-47 tag of the language the learner practices in (see lib/i18n/languages) */
  practiceLanguage?: string;
  examDate?: string;
  /** IELTS flavour chosen at onboarding */
  ieltsModule?: 'academic' | 'general';
  /** target overall band (0.5 steps) */
  targetOverall?: number;
  /** target speaking band */
  targetSpeaking?: number;
  /** per-section targets (0.5 steps) — personalisation for mocks & pacing */
  targetSections?: Partial<Record<'listening' | 'reading' | 'writing' | 'speaking', number>>;
  /** interface language ('en' | 'bn') — see lib/i18n */
  uiLanguage?: 'en' | 'bn';
  /** 0–100 per skill from diagnostics; labelled provisional until confirmed */
  sectionLevels?: Partial<Record<'listening' | 'reading' | 'writing' | 'speaking', number>>;
  plan: Plan;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface SubscriptionState {
  plan: Plan;
  /** true when the trial is running */
  trialing: boolean;
  renewsAt?: string;
  /** features gated by plan */
  limits: {
    dailySessions: number | 'unlimited';
    ieltsMocksPerMonth: number | 'unlimited';
    detailedReport: boolean;
    roadmap: boolean;
    exportPdf: boolean;
    coachVoiceCallsPerDay: number | 'unlimited';
  };
}

export interface ChatMessage {
  id: string;
  role: 'coach' | 'user' | 'system';
  text: string;
  at: string;
  /** user turns can carry their own feedback chips */
  feedback?: {
    overall: number;
    fillers: number;
    wpm: number;
    errorCount: number;
    corrections: string[];
  };
  /** true while the coach is "speaking" */
  speaking?: boolean;
}

export interface CoachSession {
  id: string;
  userId: string;
  themeId?: string;
  scenarioId?: string;
  title: string;
  messages: ChatMessage[];
  startedAt: string;
  lastAt: string;
  totals: {
    turns: number;
    spokenSec: number;
    overall: number;
    fillers: number;
    errors: number;
  };
}

export interface IeltsMockResult {
  id: string;
  userId: string;
  mockId: string;
  date: string;
  band: number;
  parts: {
    part: IeltsPart;
    band: number;
    fluency: number;
    lexical: number;
    grammar: number;
    pronunciation: number;
    spokenSec: number;
  }[];
  overall: number;
  reportIds: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earnedAt?: string;
  progress?: { value: number; target: number };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: 'streak' | 'report' | 'plan' | 'system';
}

/* ------------------------------------------------------------------ *
 * Engine capabilities
 * ------------------------------------------------------------------ */

export interface EngineCapabilities {
  kind: EngineKind;
  available: boolean;
  /** why it is unavailable, for the settings screen */
  reason?: string;
  liveInterim: boolean;
  wordTimings: boolean;
  wordConfidence: boolean;
  phonemeScores: boolean;
  language: string;
  /** true when capture is on-device only */
  offline: boolean;
}
