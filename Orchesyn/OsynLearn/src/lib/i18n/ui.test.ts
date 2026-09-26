import { describe, expect, it } from 'vitest';
import { STRINGS, translate } from './ui';

describe('ui string catalogue', () => {
  it('every language defines every English key, non-empty', () => {
    const keys = Object.keys(STRINGS.en);
    for (const [lang, dict] of Object.entries(STRINGS)) {
      for (const k of keys) {
        expect(dict[k], `${lang} missing ${k}`).toBeTruthy();
      }
    }
  });

  it('no language carries keys English does not (keeps parity honest)', () => {
    const en = new Set(Object.keys(STRINGS.en));
    for (const [lang, dict] of Object.entries(STRINGS)) {
      if (lang === 'en') continue;
      for (const k of Object.keys(dict)) expect(en.has(k), `${lang} extra key ${k}`).toBe(true);
    }
  });

  it('falls back to English, then to the key', () => {
    expect(translate('bn', 'nav.today')).toBe('আজ');
    expect(translate('bn', 'nope.missing')).toBe('nope.missing');
  });
});
