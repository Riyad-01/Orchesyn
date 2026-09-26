/**
 * UI string catalogue — translations live HERE and nowhere else.
 * Application logic never contains user-facing copy; components ask for a
 * key via useT()/t() and receive the string for the active interface language.
 *
 * Adding a language = adding one record to STRINGS with every key of 'en'.
 * The parity unit test (ui.test.ts) fails the build if a key is missing or empty.
 */

export type UILanguage = 'en' | 'bn';

export const UI_LANGUAGES: { id: UILanguage; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'bn', label: 'Bangla', native: 'বাংলা' },
];

type Dict = Record<string, string>;

const en: Dict = {
  'nav.today': 'Today',
  'nav.learn': 'Learn',
  'nav.practise': 'Practise',
  'nav.mocks': 'Mocks',
  'nav.progress': 'Progress',
  'nav.more': 'More',
  'nav.speak': 'Speak',
  'home.greeting.morning': 'Good morning',
  'home.greeting.afternoon': 'Good afternoon',
  'home.greeting.evening': 'Good evening',
  'home.nextUp': 'Next up',
  'home.pickUp': 'Pick up where you left off',
  'home.dailyGoal': 'Daily goal',
  'home.streak': 'day streak',
  'home.start': 'Start',
  'learn.title': 'Learn',
  'learn.sub': 'Guides, words and your plan — the input side of fluency.',
  'practise.title': 'Practise',
  'practise.sub': 'Speak, get judged, improve. The engine listens.',
  'mocks.title': 'Mock Tests',
  'mocks.sub': 'Exam-day conditions, honest band estimates.',
  'progress.title': 'Progress',
  'progress.sub': 'The evidence trail — trends, history, mistakes.',
  'common.min': 'min',
  'common.open': 'Open',
  'settings.language': 'Interface language',
  'settings.languageHint': 'Menus and coaching copy switch instantly; your practice language is separate.',
  'install.title': 'Install OsynLearn — works offline',
  'install.cta': 'Install',
  'offline.title': 'Offline',
  'offline.sub': 'practice continues on this device; AI upgrades resume when you reconnect',
};

const bn: Dict = {
  'nav.today': 'আজ',
  'nav.learn': 'শিখুন',
  'nav.practise': 'অনুশীলন',
  'nav.mocks': 'মক টেস্ট',
  'nav.progress': 'অগ্রগতি',
  'nav.more': 'আরও',
  'nav.speak': 'বলুন',
  'home.greeting.morning': 'সুপ্রভাত',
  'home.greeting.afternoon': 'শুভ দুপুর',
  'home.greeting.evening': 'শুভ সন্ধ্যা',
  'home.nextUp': 'এরপর করুন',
  'home.pickUp': 'যেখানে রেখেছিলেন সেখান থেকে শুরু করুন',
  'home.dailyGoal': 'দৈনিক লক্ষ্য',
  'home.streak': 'দিনের স্ট্রিক',
  'home.start': 'শুরু',
  'learn.title': 'শিখুন',
  'learn.sub': 'গাইড, শব্দ আর আপনার পরিকল্পনা — সাবলীলতার ইনপুট দিক।',
  'practise.title': 'অনুশীলন',
  'practise.sub': 'বলুন, মূল্যায়ন নিন, এগোন। ইঞ্জিন শোনে।',
  'mocks.title': 'মক টেস্ট',
  'mocks.sub': 'পরীক্ষার দিনের পরিবেশ, সৎ ব্যান্ড হিসাব।',
  'progress.title': 'অগ্রগতি',
  'progress.sub': 'প্রমাণের পথ — ট্রেন্ড, ইতিহাস, ভুল।',
  'common.min': 'মিনিট',
  'common.open': 'খুলুন',
  'settings.language': 'ইন্টারফেসের ভাষা',
  'settings.languageHint': 'মেনু আর কোচিং কপি সাথে সাথে বদলায়; অনুশীলনের ভাষা আলাদা।',
  'install.title': 'OsynLearn ইনস্টল করুন — অফলাইনে চলে',
  'install.cta': 'ইনস্টল',
  'offline.title': 'অফলাইন',
  'offline.sub': 'এই ডিভাইসে অনুশীলন চলবে; সংযোগ ফিরলে AI আপগ্রেড আবার চালু',
};

export const STRINGS: Record<UILanguage, Dict> = { en, bn };

/** Translate a key; unknown keys fall back to English, then to the key itself. */
export function translate(lang: UILanguage, key: string): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}
