/**
 * Content-integrity QC gate.
 *
 * The app promises "50 topics, 20+ themes, scenario practice, 6 full IELTS mocks,
 * a day-wise roadmap". These tests assert the shipped data actually delivers that,
 * so a truncated or half-filled dataset can never pass CI silently.
 */
import { describe, expect, it } from 'vitest';
import { TOPICS, TOPIC_CATEGORIES } from './topics';
import { THEMES, SCENARIOS } from './themes';
import { IELTS_MOCKS, PART1_BANK, PART2_BANK, PART3_BANK, BAND_DESCRIPTORS } from './ielts';
import { DRILLS, buildRoadmap } from './drills';

describe('topics', () => {
  it('ships 50 topics, every one complete', () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(50);
    for (const t of TOPICS) {
      expect(t.title.length, t.id).toBeGreaterThan(3);
      expect(t.prompts.length, t.id).toBeGreaterThanOrEqual(1);
      expect(t.sampleAnswer.length, t.id).toBeGreaterThan(40);
      expect(t.keyVocab.length, t.id).toBeGreaterThanOrEqual(2);
      expect(TOPIC_CATEGORIES.map((c) => c.id), t.id).toContain(t.category);
      expect([1, 2, 3], t.id).toContain(t.difficulty);
    }
  });

  it('has unique topic ids', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });
});

describe('coach content', () => {
  it('ships 20+ themes, every one playable', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(20);
    for (const th of THEMES) {
      expect(th.starter.length, th.id).toBeGreaterThan(10);
      expect(th.followUps.length, th.id).toBeGreaterThanOrEqual(2);
      expect(th.sampleAnswer.length, th.id).toBeGreaterThan(40);
      expect(th.keyVocab.length, th.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('ships 8+ scenarios with real back-and-forth beats', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(8);
    for (const s of SCENARIOS) {
      expect(s.beats.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.beats.filter((b) => b.role === 'user').length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.openingLine.length, s.id).toBeGreaterThan(10);
      expect(s.keyPhrases.length, s.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('has unique theme and scenario ids', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });
});

describe('IELTS content', () => {
  it('ships 6 full mocks, each a complete Part 1-3 exam', () => {
    expect(IELTS_MOCKS.length).toBeGreaterThanOrEqual(6);
    for (const m of IELTS_MOCKS) {
      expect(m.part1.length, m.id).toBeGreaterThanOrEqual(3);
      expect(m.part2.bullets?.length ?? 0, m.id).toBeGreaterThanOrEqual(3);
      expect(m.part3.length, m.id).toBeGreaterThanOrEqual(3);
      expect(m.durationMin, m.id).toBeGreaterThanOrEqual(10);
    }
  });

  it('every mock question has a sample answer to learn from', () => {
    const all = [
      ...IELTS_MOCKS.flatMap((m) => [...m.part1, m.part2, ...m.part3]),
      ...PART1_BANK,
      ...PART2_BANK,
      ...PART3_BANK,
    ];
    for (const q of all) {
      expect(q.sampleAnswer?.length ?? 0, q.id).toBeGreaterThan(40);
    }
  });

  it('covers band descriptors 5 to 9 (descriptorForBand clamps to this range)', () => {
    for (let b = 5; b <= 9; b++) {
      expect(BAND_DESCRIPTORS[b]?.title, `band ${b}`).toBeTruthy();
    }
  });

  it('has unique mock ids', () => {
    expect(new Set(IELTS_MOCKS.map((m) => m.id)).size).toBe(IELTS_MOCKS.length);
  });
});

describe('drills & roadmap', () => {
  it('ships 24 drills with valid dimensions', () => {
    const dims = ['pronunciation', 'fluency', 'grammar', 'vocabulary', 'fillers', 'pace', 'clarity'];
    expect(DRILLS.length).toBeGreaterThanOrEqual(24);
    for (const d of DRILLS) {
      expect(dims, d.id).toContain(d.dimension);
      expect(d.prompt.length, d.id).toBeGreaterThan(10);
      expect(d.seconds, d.id).toBeGreaterThan(0);
    }
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(DRILLS.length);
  });

  it('builds complete 7/14/30-day roadmaps with valid item references', () => {
    for (const days of [7, 14, 30]) {
      const plan = buildRoadmap({ days, minutesPerDay: 10, goal: 'general', weakest: ['grammar'] });
      expect(plan.length, `${days}-day plan`).toBe(days);
      for (const day of plan) {
        expect(day.items.length, `day ${day.day}`).toBeGreaterThanOrEqual(1);
        for (const item of day.items) {
          if (item.kind === 'drill') expect(DRILLS.some((d) => d.id === item.id), item.id).toBe(true);
        }
      }
    }
  });
});
