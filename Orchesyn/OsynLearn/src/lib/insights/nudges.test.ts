import { describe, expect, it } from 'vitest';
import { detectFillerNudge, detectSilenceNudge, isFresh, NUDGE_TTL_MS } from './nudges';

describe('detectFillerNudge', () => {
  it('flags a trailing um', () => {
    const n = detectFillerNudge('so i went to the market um');
    expect(n).toBeTruthy();
    expect(n!.text).toContain('um');
  });

  it('flags multi-word fillers', () => {
    expect(detectFillerNudge('it was, you know')!.text).toContain('you know');
    expect(detectFillerNudge('i was kind of')!.text).toContain('kind of');
  });

  it('ignores clean speech and "like" as a verb', () => {
    expect(detectFillerNudge('i like cricket a lot')).toBeNull();
    expect(detectFillerNudge('the weather is nice today')).toBeNull();
  });
});

describe('detectSilenceNudge', () => {
  it('fires after the threshold only', () => {
    expect(detectSilenceNudge(3900)).toBeNull();
    expect(detectSilenceNudge(4100)).toBeTruthy();
  });
});

describe('nudge ttl', () => {
  it('expires stale nudges', () => {
    const n = detectFillerNudge('um', 1000)!;
    expect(isFresh(n, 1000 + NUDGE_TTL_MS - 1)).toBe(true);
    expect(isFresh(n, 1000 + NUDGE_TTL_MS + 1)).toBe(false);
  });
});
