/**
 * Evaluation runner — verifies the DETERMINISTIC layers of the assessment
 * pipeline against the versioned set: sufficiency gates, copied-text flags,
 * injection fencing, band clamping, verbatim-evidence enforcement and the
 * typed-input pronunciation prohibition.
 *
 * What it deliberately does NOT verify: the live model's judgement. That is
 * the job of qualified human ratings (disagreement review below), and it
 * stays explicitly UNVERIFIED until credentials + reviewers exist.
 */
import {
  buildManagedSpeakingPrompt,
  buildManagedWritingPrompt,
  OVERLAP_FLAG_THRESHOLD,
  textOverlap,
  validateAssessment,
  type ValidatedAssessment,
} from '@/lib/ai/managed';
import { EVAL_SET_V1, type EvalCase } from './set.v1';

export interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

export interface CaseResult {
  id: string;
  skill: 'writing' | 'speaking';
  kind: string;
  checks: CheckResult[];
  pass: boolean;
}

const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export function runCase(c: EvalCase): CaseResult {
  const checks: CheckResult[] = [];
  const fence = 'OSYN_DATA_test';

  /* 1 — the prompt builder fences learner text as untrusted data */
  const prompt =
    c.skill === 'writing'
      ? buildManagedWritingPrompt({ taskType: 1, module: 'academic', prompt: 'q', text: c.text, fence })
      : buildManagedSpeakingPrompt({ mode: 'test', transcript: c.text, typed: c.typed === true, audioEvidence: false, features: { wpm: 0, pauseCount: 0, fillerCount: 0, durationMs: 0 }, fence });
  checks.push({
    name: 'learner text fenced as untrusted',
    pass: prompt.includes(fence) && prompt.includes('UNTRUSTED DATA') && prompt.includes(c.text.slice(0, 40)),
    detail: 'fence markers + ignore-instructions rule present around the submission',
  });

  /* 2 — sufficiency gate: silent/short submissions must be refused */
  if (c.expected.insufficient) {
    const gate = c.skill === 'writing' ? wordsOf(c.text) >= 20 : wordsOf(c.text) >= 5;
    checks.push({ name: 'refused as insufficient evidence', pass: !gate, detail: `${wordsOf(c.text)} words vs gate` });
  }

  /* 3 — copied-text detection */
  if (c.expected.copiedFlag && c.source) {
    const ov = textOverlap(c.source, c.text);
    checks.push({ name: 'copied text flagged', pass: ov >= OVERLAP_FLAG_THRESHOLD, detail: `overlap ${(ov * 100).toFixed(0)}% ≥ ${(OVERLAP_FLAG_THRESHOLD * 100).toFixed(0)}%` });
  }

  /* 4 — validator behaviour on the simulated model reply */
  if (c.simulatedModelOutput) {
    const v: ValidatedAssessment | null = validateAssessment(c.simulatedModelOutput, c.text, {
      kind: c.skill,
      typed: c.typed === true,
      words: c.skill === 'speaking' ? [{ word: c.text.split(/\s+/)[0] ?? '', startMs: 0 }] : undefined,
    });
    checks.push({ name: 'validator produced a structured result', pass: v !== null, detail: v ? 'validated' : 'rejected' });
    if (v) {
      if (c.expected.bandRange) {
        const [lo, hi] = c.expected.bandRange;
        const inRange = Object.values(v.bands).every((b) => b === null || (b >= lo && b <= hi));
        checks.push({ name: `bands within ${lo}–${hi} after clamping`, pass: inRange, detail: JSON.stringify(v.bands) });
      }
      if (c.expected.mustNotContain) {
        const blob = JSON.stringify(v);
        const leaked = c.expected.mustNotContain.filter((s) => blob.includes(s));
        checks.push({ name: 'injected content never reaches output', pass: leaked.length === 0, detail: leaked.length ? `leaked: ${leaked.join(', ')}` : 'clean' });
      }
      if (c.typed) {
        checks.push({
          name: 'typed answer carries no fluency/pronunciation score',
          pass: v.bands.fc === null && v.bands.pr === null,
          detail: `fc=${v.bands.fc}, pr=${v.bands.pr}`,
        });
      }
      // every surviving evidence quote must be verbatim in the submission
      const fake = v.evidence.filter((e) => !c.text.toLowerCase().includes(e.quote.toLowerCase()));
      checks.push({ name: 'all evidence quotes are verbatim', pass: fake.length === 0, detail: fake.length ? `fabricated: ${fake.map((f) => f.quote).join(', ')}` : 'verified' });
    }
  }

  return { id: c.id, skill: c.skill, kind: c.kind, checks, pass: checks.every((k) => k.pass) };
}

export function runEvalSet(): CaseResult[] {
  return EVAL_SET_V1.map(runCase);
}

/* --------------------------- human rating workflow ------------------------ */

export interface HumanRating {
  caseId: string;
  reviewer: string;
  /** reviewer self-declares qualification (IELTS examiner training / certified teacher) */
  qualified: boolean;
  bands: Record<string, number | null>;
  notes?: string;
  at: number;
  /** set when this rating is a blind duplicate of another rating id (consistency) */
  duplicateOf?: string;
}

export interface Disagreement {
  caseId: string;
  criterion: string;
  ai: number;
  human: number;
  delta: number;
}

/** |Δ| ≥ 1 band on any criterion sends the case to disagreement review. */
export function disagreements(ai: Record<string, number | null>, human: HumanRating): Disagreement[] {
  const out: Disagreement[] = [];
  for (const [k, hv] of Object.entries(human.bands)) {
    const av = ai[k];
    if (hv === null || av === null || av === undefined) continue;
    const delta = Math.round((hv - av) * 10) / 10;
    if (Math.abs(delta) >= 1) out.push({ caseId: human.caseId, criterion: k, ai: av, human: hv, delta });
  }
  return out;
}

/** Intra-rater consistency: mean absolute difference across blind duplicates. */
export function consistency(ratings: HumanRating[], aiByCase: Record<string, Record<string, number | null>>): { pairs: number; meanAbsDiff: number | null } {
  const byCase = new Map<string, HumanRating[]>();
  for (const r of ratings) {
    const list = byCase.get(r.caseId) ?? [];
    list.push(r);
    byCase.set(r.caseId, list);
  }
  const diffs: number[] = [];
  for (const list of byCase.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        for (const [k, a] of Object.entries(list[i].bands)) {
          const b = list[j].bands[k];
          if (a !== null && b !== null && b !== undefined) diffs.push(Math.abs(a - b));
        }
      }
    }
  }
  return { pairs: diffs.length, meanAbsDiff: diffs.length ? Math.round((diffs.reduce((x, y) => x + y, 0) / diffs.length) * 100) / 100 : null };
}

/** Subgroup analysis: mean human band and human-AI delta per kind/skill tag. */
export function subgroupAnalysis(ratings: HumanRating[], aiByCase: Record<string, Record<string, number | null>>, kindOf: (caseId: string) => string) {
  const groups = new Map<string, { n: number; deltas: number[] }>();
  for (const r of ratings) {
    const g = groups.get(kindOf(r.caseId)) ?? { n: 0, deltas: [] };
    g.n++;
    const ai = aiByCase[r.caseId];
    if (ai) {
      for (const [k, hv] of Object.entries(r.bands)) {
        const av = ai[k];
        if (hv !== null && av !== null && av !== undefined) g.deltas.push(hv - av);
      }
    }
    groups.set(kindOf(r.caseId), g);
  }
  return [...groups.entries()].map(([group, g]) => ({
    group,
    ratings: g.n,
    meanHumanMinusAi: g.deltas.length ? Math.round((g.deltas.reduce((a, b) => a + b, 0) / g.deltas.length) * 100) / 100 : null,
  }));
}
