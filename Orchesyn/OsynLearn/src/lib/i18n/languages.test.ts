import { describe, expect, it } from 'vitest';
import { LANGUAGES, getLanguage, matchDeviceLanguage } from './languages';
import { detectFillers } from '@/lib/scoring/fillers';
import { tokenize } from '@/lib/scoring/text';
import { scorePace } from '@/lib/scoring/pace';

describe('language catalogue', () => {
  it('has unique bcp47 and whisper codes', () => {
    const b = LANGUAGES.map((l) => l.bcp47);
    const w = LANGUAGES.map((l) => l.whisper);
    expect(new Set(b).size).toBe(b.length);
    expect(new Set(w).size).toBe(w.length);
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(15);
  });

  it('resolves loose and missing codes to a catalogue entry', () => {
    expect(getLanguage('bn').bcp47).toBe('bn-BD');
    expect(getLanguage('fr-CA').whisper).toBe('fr');
    expect(getLanguage(undefined).whisper).toBe('en');
    expect(getLanguage('xx-XX').whisper).toBe('en');
  });

  it('preselects the device OS language, falling back to English', () => {
    expect(matchDeviceLanguage(['bn-BD', 'en']).whisper).toBe('bn');
    expect(matchDeviceLanguage(['es-MX']).whisper).toBe('es');
    expect(matchDeviceLanguage(['zz-ZZ']).whisper).toBe('en');
  });

  it('only English is grammar-ready today', () => {
    expect(getLanguage('en-US').grammarReady).toBe(true);
    expect(getLanguage('bn-BD').grammarReady).toBe(false);
  });
});

describe('language-aware scoring plumbing', () => {
  it('counts per-language padding words only when supplied', () => {
    const toks = tokenize('pues I think pues we should go');
    expect(detectFillers(toks, [], ['pues']).length).toBeGreaterThanOrEqual(2);
    expect(detectFillers(toks, []).length).toBe(0);
  });

  it('tokeniser keeps non-Latin scripts intact', () => {
    const toks = tokenize('মানে আমি ভাবছি।');
    expect(toks.map((t) => t.word)).toEqual(['মানে', 'আমি', 'ভাবছি']);
  });

  it('still trims latin punctuation as before', () => {
    const toks = tokenize('Well, hello!');
    expect(toks.map((t) => t.word)).toEqual(['well', 'hello']);
  });

  it('per-language pace bands score native-rate speech fairly', () => {
    // 100 wpm is below the English band but inside the Bangla band
    expect(scorePace(100, 100, 4, false, [95, 150])).toBeGreaterThan(scorePace(100, 100, 4, false));
    expect(getLanguage('bn-BD').paceBand).toEqual([95, 150]);
  });
});
