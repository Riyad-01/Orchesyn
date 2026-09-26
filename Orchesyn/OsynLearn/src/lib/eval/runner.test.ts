import { describe, it, expect } from 'vitest';
import { runEvalSet, runCase, disagreements, consistency, subgroupAnalysis, type HumanRating } from './runner';
import { EVAL_SET_V1, EVAL_SET_VERSION } from './set.v1';

describe('evaluation set v1', () => {
  it('is versioned and covers the required submission classes', () => {
    expect(EVAL_SET_VERSION).toBe('eval-set-v1');
    const kinds = new Set<string>(EVAL_SET_V1.map((c) => c.kind));
    for (const k of ['good', 'short', 'irrelevant', 'copied', 'silent', 'noisy', 'adversarial', 'typed']) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it('every case passes every deterministic pipeline check', () => {
    const results = runEvalSet();
    for (const r of results) {
      for (const c of r.checks) {
        expect(c.pass, `${r.id} :: ${c.name} :: ${c.detail}`).toBe(true);
      }
    }
  });

  it('silent and short cases are refused before any model call', () => {
    const silent = runCase(EVAL_SET_V1.find((c) => c.id === 's-silent-1')!);
    expect(silent.checks.some((k) => k.name.includes('insufficient') && k.pass)).toBe(true);
  });
});

describe('human rating workflow math', () => {
  const ai = { c1: 6, cc: 6, lr: 6, gra: 6 };

  it('flags disagreements of a full band or more', () => {
    const rating: HumanRating = { caseId: 'x', reviewer: 'r', qualified: true, bands: { c1: 7, cc: 6, lr: 7.5, gra: 5 }, at: 0 };
    const d = disagreements(ai, rating);
    expect(d.map((x) => x.criterion).sort()).toEqual(['c1', 'gra', 'lr']);
  });

  it('ignores criteria the human did not score', () => {
    const rating: HumanRating = { caseId: 'x', reviewer: 'r', qualified: true, bands: { c1: null, cc: 6 }, at: 0 };
    expect(disagreements(ai, rating)).toEqual([]);
  });

  it('measures blind-duplicate consistency', () => {
    const ratings: HumanRating[] = [
      { caseId: 'x', reviewer: 'r1', qualified: true, bands: { c1: 6, cc: 6.5 }, at: 0 },
      { caseId: 'x', reviewer: 'r1', qualified: true, bands: { c1: 6.5, cc: 6.5 }, at: 1, duplicateOf: 'first' },
    ];
    const c = consistency(ratings, {});
    expect(c.pairs).toBe(2);
    expect(c.meanAbsDiff).toBe(0.25);
  });

  it('groups subgroups and averages human-minus-AI deltas', () => {
    const ratings: HumanRating[] = [
      { caseId: 'a', reviewer: 'r', qualified: true, bands: { c1: 7 }, at: 0 },
      { caseId: 'b', reviewer: 'r', qualified: true, bands: { c1: 5 }, at: 0 },
    ];
    const s = subgroupAnalysis(ratings, { a: { c1: 6 }, b: { c1: 6 } }, (id) => (id === 'a' ? 'good' : 'adversarial'));
    expect(s.find((g) => g.group === 'good')?.meanHumanMinusAi).toBe(1);
    expect(s.find((g) => g.group === 'adversarial')?.meanHumanMinusAi).toBe(-1);
  });
});
