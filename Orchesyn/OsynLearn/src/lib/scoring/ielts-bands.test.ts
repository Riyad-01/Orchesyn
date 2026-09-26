import { describe, expect, it } from 'vitest';
import {
  bandVerdict,
  estimateWritingBands,
  listeningBand,
  readingBand,
  writingStats,
} from './ielts-bands';
import { parseWritingReport } from '@/lib/insights/ielts-writing';

describe('IELTS band conversion (scaled to official Academic tables)', () => {
  it('reading: full marks → 9, half marks → ~6, tiny sets scale correctly', () => {
    expect(readingBand(6, 6)).toBe(9);
    expect(readingBand(3, 6)).toBe(5.5); // 50% → 20/40 → band 5.5 on the Academic table
    expect(readingBand(1, 6)).toBeLessThan(4);
    expect(readingBand(0, 6)).toBe(1); // zero correct → official "non-user" band 1
  });

  it('listening follows its own (slightly stricter) table', () => {
    expect(listeningBand(10, 10)).toBe(9);
    // 70% → 28/40 → listening band 6.5
    expect(listeningBand(7, 10)).toBe(6.5);
  });

  it('verdicts never crash and cover the range', () => {
    expect(bandVerdict(9)).toBe('Very good user');
    expect(bandVerdict(4.5)).toBe('Limited user');
    expect(bandVerdict(2)).toBe('Developing user');
  });
});

describe('writing stats + local band estimate', () => {
  const essay = [
    'Modern technology has changed family life in complex ways. Some argue screens weaken bonds, while others point to video calls that keep distant relatives close.',
    'On one hand, phones fragment meals and conversation. However, families that set rules such as phone-free dinners keep intimacy intact.',
    'In conclusion, technology amplifies the habits a family already has, so deliberate use matters more than the device itself.',
  ].join('\n\n');

  it('measures structure honestly', () => {
    const s = writingStats(essay);
    expect(s.paragraphs).toBe(3);
    expect(s.words).toBeGreaterThan(40);
    expect(s.connectiveCount).toBeGreaterThanOrEqual(3); // while/however/in conclusion
    expect(s.hasIntroConcession).toBe(true);
  });

  it('empty text is safe', () => {
    const s = writingStats('');
    expect(s.words).toBe(0);
    expect(estimateWritingBands(s).overall).toBe(0);
  });

  it('a strong answer estimates a solid local band', () => {
    const bands = estimateWritingBands(writingStats(essay));
    expect(bands.overall).toBeGreaterThanOrEqual(5.5);
    expect(bands.overall).toBeLessThanOrEqual(7.5); // local estimate stays humble
  });
});

describe('writing examiner parser', () => {
  it('accepts a clean JSON payload', () => {
    const r = parseWritingReport(
      '```json\n{"bands":{"ta":6.5,"cc":6,"lr":6.5,"gra":6,"overall":6.5},"fixes":[{"quote":"in complex ways","correction":"in complex and varied ways","why":"more precise"}],"strengths":["clear concession"],"tips":["add data"]}\n```',
    );
    expect(r?.bands.overall).toBe(6.5);
    expect(r?.fixes).toHaveLength(1);
  });

  it('rejects garbage and clamps out-of-range bands', () => {
    expect(parseWritingReport('not json at all')).toBeNull();
    const r = parseWritingReport('{"bands":{"ta":99,"cc":1,"lr":6,"gra":6,"overall":50}}');
    expect(r?.bands.ta).toBe(9);
    expect(r?.bands.cc).toBe(4);
  });
});
