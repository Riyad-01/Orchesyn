/**
 * Curriculum domain model.
 *
 * A lesson is the unit of instruction; it carries its own objectives,
 * prerequisites, difficulty, question types, duration and the evidence that
 * counts as mastery. Content items move through a review workflow
 * (draft → review → published, with corrections) — see studio.ts.
 */

export type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

export type QuestionKind =
  | 'mcq' // multiple choice
  | 'tfng' // true / false / not given
  | 'typed' // constructed response, heuristically checked
  | 'spoken'; // spoken attempt captured via the recorder (typed fallback)

export interface ExerciseItem {
  id: string;
  kind: QuestionKind;
  skill: Skill;
  prompt: string;
  /** for mcq/tfng */
  options?: string[];
  answer: string;
  /** why — every item ships an explanation */
  explanation: string;
  /** guided-phase hint */
  hint?: string;
  /** transcript handed to device TTS; ALWAYS labelled practice audio */
  tts?: string;
}

export interface WorkedExample {
  prompt: string;
  solution: string;
  notes: string;
}

export type ContentStatus = 'draft' | 'review' | 'published';

export interface CurriculumLesson {
  id: string;
  skill: Skill;
  module: string;
  title: string;
  objectives: string[];
  prereqs: string[];
  /** 1–5 */
  difficulty: number;
  questionTypes: QuestionKind[];
  minutes: number;
  /** what counts as mastery: independent-phase accuracy */
  mastery: { metric: 'independent-accuracy'; threshold: number };
  explain: string;
  worked: WorkedExample;
  guided: ExerciseItem[];
  independent: ExerciseItem[];
  /** ielts flavour this lesson applies to; 'both' = shared */
  path: 'academic' | 'general' | 'both';
  status: ContentStatus;
  version: number;
  aiGenerated: boolean;
  source?: string;
  rights?: string;
}

export interface LessonAttempt {
  lessonId: string;
  phase: 'guided' | 'independent';
  correct: number;
  total: number;
  at: number;
}

export interface LessonProgress {
  lessonId: string;
  attempts: LessonAttempt[];
  masteredAt?: number;
}
