'use client';

import { useCallback } from 'react';
import { useApp } from '@/lib/store/app';
import { translate, type UILanguage } from './ui';

/**
 * Interface-language hook. Reads the learner's chosen UI language from the
 * profile and returns a bound translator. Components stay copy-free:
 *   const t = useT(); … {t('nav.today')}
 */
export function useT() {
  const { profile } = useApp();
  const lang: UILanguage = profile?.uiLanguage === 'bn' ? 'bn' : 'en';
  return useCallback((key: string) => translate(lang, key), [lang]);
}

export function useUILanguage(): UILanguage {
  const { profile } = useApp();
  return profile?.uiLanguage === 'bn' ? 'bn' : 'en';
}
