import { describe, expect, it } from 'vitest';
import { analyseGrammar } from './grammar';
import { tokenize } from './text';

const run = (text: string) => analyseGrammar(tokenize(text)).issues;

describe('past-time-marker rule', () => {
  it('flags base verb with a past time word', () => {
    const issues = run('I go to market yesterday with my friend.');
    const hit = issues.find((i) => i.ruleId === 'past-time-marker');
    expect(hit).toBeTruthy();
    expect(hit!.correction).toBe('I went');
  });

  it('handles irregular and regular verbs', () => {
    expect(run('They eat biryani last night.').find((i) => i.ruleId === 'past-time-marker')?.correction).toBe('They ate');
    expect(run('We watch a movie two days ago.').find((i) => i.ruleId === 'past-time-marker')?.correction).toBe('We watched');
    expect(run('They study english last year.').find((i) => i.ruleId === 'past-time-marker')?.correction).toBe('They studied');
  });

  it('does not flag present habits', () => {
    expect(run('I go to market every day.').filter((i) => i.ruleId === 'past-time-marker')).toHaveLength(0);
    expect(run('They play cricket on weekends.').filter((i) => i.ruleId === 'past-time-marker')).toHaveLength(0);
  });

  it('catches a leading time marker', () => {
    expect(run('Yesterday I see my teacher.').find((i) => i.ruleId === 'past-time-marker')?.correction).toBe('I saw');
  });
});
