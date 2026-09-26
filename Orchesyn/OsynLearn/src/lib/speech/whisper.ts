import { aiConfig } from '@/lib/ai/provider';
import type { SpeechCapture, WordToken } from '@/types';

/**
 * Cloud ASR upgrade: Groq whisper-large-v3-turbo.
 *
 * The on-device Web Speech engine stays the default and the fallback; when a
 * cloud key is configured we ALSO record raw audio and, on stop, transcribe it
 * with Whisper. Whisper's transcript + word timings replace the recognition
 * text, which dramatically improves grammar/filler/vocabulary analysis for
 * accented or noisy speech.
 */

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface WhisperResult {
  text: string;
  words: WhisperWord[];
  /** ISO 639-1 language Whisper actually heard */
  language?: string;
}

const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const WHISPER_MODEL = 'whisper-large-v3-turbo';

export function whisperAvailable(): boolean {
  return aiConfig().cloud;
}

export async function transcribeWithWhisper(
  blob: Blob,
  whisperLanguage?: string,
  /** topic context to bias recognition ("The library will remain open…") */
  prompt?: string,
): Promise<WhisperResult | null> {
  const cfg = aiConfig();
  if (!cfg.cloud) return null;

  const once = async (): Promise<WhisperResult | null> => {
    try {
      const fd = new FormData();
      fd.append('model', WHISPER_MODEL);
      fd.append('file', blob, 'speech.webm');
      fd.append('response_format', 'verbose_json');
      fd.append('timestamp_granularities[]', 'word');
      // hint the language when known; omitted = auto-detect
      if (whisperLanguage) fd.append('language', whisperLanguage);
      // bias recognition toward the topic's vocabulary (proper nouns etc.)
      if (prompt) fd.append('prompt', prompt.slice(0, 220));
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.key}` },
        body: fd,
        // hard cap per attempt: a stalled upload must never hang "Analysing"
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as {
        text?: string;
        language?: string;
        words?: { word: string; start: number; end: number }[];
      };
      const clean = (j.text ?? '').replace(/[^\p{L}\p{N}]+/gu, '').trim();
      if (clean.length < 3) return null; // silence / noise — keep the on-device transcript
      return {
        text: j.text ?? '',
        language: j.language,
        words: (j.words ?? []).map((w) => ({ word: String(w.word).trim(), start: w.start * 1000, end: w.end * 1000 })),
      };
    } catch {
      return null;
    }
  };

  // 4G uploads can lose a race: one automatic retry before we fall back
  return (await once()) ?? (await once());
}

/**
 * Pure merge: Whisper text/timings replace the recognition transcript while
 * the original audio statistics (loudness, duration, silence) are kept, so
 * pace/clarity scoring still works.
 */
export function mergeWhisperIntoCapture(capture: SpeechCapture, w: WhisperResult): SpeechCapture {
  const words: WordToken[] = w.words.length
    ? w.words.map((t) => ({
        word: t.word,
        startMs: Math.round(t.start),
        endMs: Math.round(Math.max(t.end, t.start + 60)),
        confidence: -1,
      }))
    : capture.words;
  return {
    ...capture,
    transcript: w.text.trim(),
    words,
    segments: [{ text: w.text.trim(), startMs: 0, endMs: capture.audio.durationMs, confidence: -1, final: true }],
    engine: 'cloud',
    detectedLanguage: w.language,
  };
}
