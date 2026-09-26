import { describe, it, expect, beforeEach } from 'vitest';
import { recordUnseenAttempt, unseenAccuracy, overallUnseenAccuracy } from './mastery';

// The suite runs in a node environment — shim just enough of window.localStorage
// so the module's real storage paths execute.
const store = new Map<string, string>();
(globalThis as { window?: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

beforeEach(() => store.clear());

describe('mastery ledger', () => {
  it('computes accuracy from stored unseen attempts', () => {
    for (let i = 0; i < 6; i++) recordUnseenAttempt('reading', true, true);
    for (let i = 0; i < 4; i++) recordUnseenAttempt('reading', false, true);
    expect(unseenAccuracy('reading')).toBe(60);
  });

  it('returns null with no data (never claims mastery from nothing)', () => {
    expect(unseenAccuracy('listening')).toBeNull();
  });

  it('aggregates across skills', () => {
    recordUnseenAttempt('listening', true, true);
    recordUnseenAttempt('listening', true, true);
    recordUnseenAttempt('reading', false, true);
    expect(overallUnseenAccuracy()).toBe(67);
    expect(overallUnseenAccuracy()).not.toBeNull();
  });

  it('counts every attempt, not just the last one', () => {
    recordUnseenAttempt('writing', false, true);
    recordUnseenAttempt('writing', false, true);
    recordUnseenAttempt('writing', true, true);
    expect(unseenAccuracy('writing')).toBe(33);
  });
});
