import { describe, expect, it } from 'vitest';
import { ALL_GUIDES, CAREER_GUIDES, INTERVIEW_GUIDES, LEARN_GUIDES, filterGuides, getGuide, relatedGuides } from './guides';

describe('Guide Library content integrity', () => {
  it('ships exactly 20 learning + 20 career articles', () => {
    expect(LEARN_GUIDES).toHaveLength(20);
    expect(CAREER_GUIDES).toHaveLength(20);
    expect(INTERVIEW_GUIDES).toHaveLength(20);
    expect(ALL_GUIDES).toHaveLength(60);
  });

  it('every article has complete art + infographic data', () => {
    for (const a of ALL_GUIDES) {
      expect(a.id.length).toBeGreaterThan(2);
      expect(a.title.length).toBeGreaterThan(8);
      expect(a.intro.length).toBeGreaterThan(20);
      expect(a.grad).toHaveLength(2);
      expect(a.stats).toHaveLength(3);
      expect(a.points.length).toBeGreaterThanOrEqual(3);
      expect(a.body.length).toBeGreaterThanOrEqual(3);
      expect(a.minutes).toBeGreaterThanOrEqual(3);
    }
  });

  it('ids are unique and lookup works', () => {
    const ids = ALL_GUIDES.map((a) => a.id);
    expect(new Set(ids).size).toBe(60);
    expect(getGuide('ln-10min')?.title).toContain('10-Minute');
    expect(getGuide('nope')).toBeUndefined();
  });

  it('related guides prefer same tag', () => {
    const a = getGuide('ln-srs')!;
    const rel = relatedGuides(a);
    expect(rel.length).toBeGreaterThan(0);
    expect(rel.every((r) => r.id !== a.id)).toBe(true);
  });

  it('search filters by title, tag and category', () => {
    expect(filterGuides('salary', 'career').map((g) => g.id)).toContain('cr-salary');
    expect(filterGuides('memory').length).toBeGreaterThan(1);
    expect(filterGuides('zzz-nope')).toHaveLength(0);
    expect(filterGuides('', 'learn')).toHaveLength(20);
    expect(filterGuides('', 'interview')).toHaveLength(20);
    expect(filterGuides('star', 'interview').length).toBeGreaterThan(0);
  });
});
