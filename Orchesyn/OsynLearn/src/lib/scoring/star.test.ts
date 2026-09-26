import { describe, expect, it } from 'vitest';
import { starSignals } from './star';

describe('STAR detector', () => {
  it('finds all four beats in a complete story', () => {
    const s = starSignals(
      'When I was at my last company, our refund queue doubled. I had to rebuild the triage process, so I designed a two-tier system and led the rollout. As a result we cut refund time by 60 percent.',
    );
    expect(s.score).toBe(4);
    expect(s.missing).toHaveLength(0);
  });

  it('flags missing beats', () => {
    const s = starSignals('I talked to the customer and calmed them down.');
    expect(s.result).toBe(false);
    expect(s.missing.length).toBeGreaterThan(0);
  });

  it('empty text scores zero safely', () => {
    expect(starSignals('').score).toBe(0);
  });
});
