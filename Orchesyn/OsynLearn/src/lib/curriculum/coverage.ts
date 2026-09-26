import type { Skill } from './types';

/**
 * Curriculum coverage matrix — an HONEST map of what OsynLearn implements
 * today, what is partial, and what is missing. Shown in the Content Studio;
 * gaps here are the authoring queue, not marketing.
 */

export type CoverageStatus = 'implemented' | 'partial' | 'missing';

export interface CoverageCell {
  skill: Skill;
  questionType: string;
  status: CoverageStatus;
  note: string;
}

export const COVERAGE_MATRIX: CoverageCell[] = [
  // listening
  { skill: 'listening', questionType: 'Multiple choice (sections 1–3)', status: 'implemented', note: 'Device-TTS practice audio, labelled; once-only playback in Exam mode' },
  { skill: 'listening', questionType: 'Form / note completion', status: 'partial', note: 'Seeded as MCQ; true text-entry completion not yet built' },
  { skill: 'listening', questionType: 'Map / plan labelling', status: 'missing', note: 'Needs an interactive visual — on the authoring queue' },
  { skill: 'listening', questionType: 'Sentence completion', status: 'missing', note: 'Authoring queue' },
  // reading
  { skill: 'reading', questionType: 'True / False / Not given', status: 'implemented', note: 'With per-item explanations' },
  { skill: 'reading', questionType: 'Multiple choice', status: 'implemented', note: 'Incl. headings practice' },
  { skill: 'reading', questionType: 'Matching headings', status: 'implemented', note: 'Seeded in R2' },
  { skill: 'reading', questionType: 'Matching information / features', status: 'partial', note: 'R3 drafted (AI) — awaiting expert review' },
  { skill: 'reading', questionType: 'Writer\'s views & claims', status: 'missing', note: 'Authoring queue' },
  // writing
  { skill: 'writing', questionType: 'Academic Task 1 (graph/bar)', status: 'implemented', note: 'SVG visual seeded; heuristic + AI feedback' },
  { skill: 'writing', questionType: 'GT Task 1 letters', status: 'implemented', note: 'Formal / informal tone checks (W2)' },
  { skill: 'writing', questionType: 'Task 2 essay', status: 'implemented', note: 'Position/concession structure checks (W3)' },
  { skill: 'writing', questionType: 'Process / map Task 1', status: 'missing', note: 'Needs diagram visuals — authoring queue' },
  // speaking
  { skill: 'speaking', questionType: 'Part 1 interview', status: 'implemented', note: 'S1 + full mock Part 1' },
  { skill: 'speaking', questionType: 'Part 2 long turn', status: 'implemented', note: 'Cue cards + timed recording' },
  { skill: 'speaking', questionType: 'Part 3 discussion', status: 'implemented', note: 'S3 + mock Part 3' },
];

export const coverageBySkill = (skill: Skill) => COVERAGE_MATRIX.filter((c) => c.skill === skill);
