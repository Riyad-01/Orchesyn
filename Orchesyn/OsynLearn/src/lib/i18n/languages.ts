/**
 * Practice-language catalogue.
 *
 * Smart-and-small by design — zero downloaded language packs, a few KB of data:
 *   - recognition rides the browser/OS speech service (Web Speech API, BCP-47 tag),
 *   - transcription rides cloud Whisper (90+ languages, ISO 639-1 code),
 *   - filler coaching uses the per-language padding lists below,
 *   - `matchDeviceLanguage` preselects the OS language so most learners never
 *     even open the picker.
 *
 * Deep grammar + vocabulary-tier analysis is English-first today; other languages
 * are scored on the language-agnostic signals (fluency, pace, fillers, clarity)
 * and the report says so honestly instead of faking it.
 */

export interface LanguageOption {
  /** BCP-47 tag handed to the Web Speech API */
  bcp47: string;
  /** ISO 639-1 code Whisper expects */
  whisper: string;
  /** English name */
  name: string;
  /** Name in its own script */
  native: string;
  /** quick visual scan in the picker */
  flag: string;
  /** padding words the filler detector counts for this language */
  fillers: string[];
  /** deep grammar/vocabulary-tier analysis available */
  grammarReady: boolean;
  /** comfortable monologue rate band (wpm) for this language; English default */
  paceBand?: [number, number];
}

export const LANGUAGES: LanguageOption[] = [
  { bcp47: 'en-US', whisper: 'en', name: 'English', native: 'English', flag: '🌐', fillers: [], grammarReady: true },
  { bcp47: 'bn-BD', paceBand: [95, 150], whisper: 'bn', name: 'Bangla', native: 'বাংলা', flag: '🇧🇩', fillers: ['মানে', 'আসলে', 'কি বলি', 'বুঝলে', 'তো'], grammarReady: false },
  { bcp47: 'hi-IN', paceBand: [95, 150], whisper: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', fillers: ['मतलब', 'असल में', 'क्या कहते हैं', 'समझे', 'वो'], grammarReady: false },
  { bcp47: 'ur-PK', paceBand: [90, 150], whisper: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰', fillers: ['مطلب', 'اصل میں', 'وہ', 'یعنی'], grammarReady: false },
  { bcp47: 'ar-SA', paceBand: [90, 150], whisper: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', fillers: ['يعني', 'بصراحة', 'طب', 'يعنى'], grammarReady: false },
  { bcp47: 'es-ES', paceBand: [105, 160], whisper: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', fillers: ['eh', 'este', 'pues', 'o sea', 'bueno', 'no?'], grammarReady: false },
  { bcp47: 'fr-FR', paceBand: [105, 160], whisper: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', fillers: ['euh', 'ben', 'du coup', 'en fait', 'voilà'], grammarReady: false },
  { bcp47: 'pt-BR', paceBand: [100, 160], whisper: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷', fillers: ['tipo', 'né', 'bem', 'na verdade'], grammarReady: false },
  { bcp47: 'ru-RU', paceBand: [90, 150], whisper: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', fillers: ['э', 'ну', 'типа', 'как бы', 'вот', 'значит'], grammarReady: false },
  { bcp47: 'zh-CN', paceBand: [90, 145], whisper: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳', fillers: ['那个', '嗯', '就是', '然后', '这个'], grammarReady: false },
  { bcp47: 'id-ID', paceBand: [95, 155], whisper: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩', fillers: ['anu', 'kayak', 'gitu', 'eh'], grammarReady: false },
  { bcp47: 'tr-TR', paceBand: [95, 155], whisper: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', fillers: ['şey', 'yani', 'işte', 'ee'], grammarReady: false },
  { bcp47: 'de-DE', paceBand: [95, 155], whisper: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', fillers: ['äh', 'hm', 'also', 'sozusagen', 'halt'], grammarReady: false },
  { bcp47: 'it-IT', paceBand: [100, 160], whisper: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹', fillers: ['eh', 'cioè', 'insomma', 'tipo', 'allora'], grammarReady: false },
  { bcp47: 'ja-JP', paceBand: [85, 140], whisper: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', fillers: ['えー', 'あの', 'その', 'まあ'], grammarReady: false },
  { bcp47: 'ko-KR', paceBand: [90, 145], whisper: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷', fillers: ['음', '그', '이제', '저'], grammarReady: false },
  { bcp47: 'vi-VN', paceBand: [95, 150], whisper: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', fillers: ['à', 'ừ', 'kiểu', 'như là'], grammarReady: false },
  { bcp47: 'th-TH', paceBand: [90, 150], whisper: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭', fillers: ['เอ่อ', 'คือ', 'แบบ'], grammarReady: false },
  { bcp47: 'ms-MY', paceBand: [95, 155], whisper: 'ms', name: 'Malay', native: 'Melayu', flag: '🇲🇾', fillers: ['err', 'macam', 'kan'], grammarReady: false },
  { bcp47: 'fa-IR', paceBand: [90, 150], whisper: 'fa', name: 'Persian', native: 'فارسی', flag: '🇮🇷', fillers: ['یعنی', 'مثلاً', 'ام'], grammarReady: false },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0];

/** Resolve any stored/loose code ("bn", "bn-BD", "fr-CA") to a catalogue entry. */
export function getLanguage(code?: string | null): LanguageOption {
  if (!code) return DEFAULT_LANGUAGE;
  const c = code.toLowerCase().trim();
  return (
    LANGUAGES.find((l) => l.bcp47.toLowerCase() === c) ??
    LANGUAGES.find((l) => l.whisper === c.split('-')[0]) ??
    LANGUAGES.find((l) => c.startsWith(l.whisper)) ??
    DEFAULT_LANGUAGE
  );
}

/**
 * Zero-conf default: whatever the device OS speaks, when we support it.
 * A Bangladeshi phone (bn-BD) lands on Bangla; a French laptop on French.
 */
export function matchDeviceLanguage(preferred?: readonly string[] | null): LanguageOption {
  const list: string[] = [...(preferred ?? [])];
  if (typeof navigator !== 'undefined') {
    for (const tag of navigator.languages ?? []) list.push(tag);
    if (navigator.language) list.push(navigator.language);
  }
  for (const tag of list) {
    if (!tag) continue;
    const t = tag.toLowerCase();
    const hit =
      LANGUAGES.find((l) => l.bcp47.toLowerCase() === t) ??
      LANGUAGES.find((l) => t.startsWith(`${l.whisper}-`) || t === l.whisper);
    if (hit) return hit;
  }
  return DEFAULT_LANGUAGE;
}
