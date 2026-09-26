/* Opt-in integration proof with REAL speech (needs network + key):
 *   VOICE_E2E=1 npx vitest run src/lib/speech/voice-e2e.test.ts
 * audio file -> Groq Whisper -> full scoring. Skipped in the normal suite. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { transcribeWithWhisper } from './whisper';
import { analyseSpeech } from '@/lib/scoring';

const run = process.env.VOICE_E2E === '1';

describe('real-voice end-to-end (opt-in)', () => {
  it.skipIf(!run)('transcribes real audio and produces full feedback', async () => {
    const buf = readFileSync(new URL('../../../scripts/brooklyn.flac', import.meta.url));
    const w = await transcribeWithWhisper(new Blob([buf], { type: 'audio/flac' }), 'en');
    console.log('WHISPER TRANSCRIPT:', JSON.stringify(w?.text ?? null));
    expect(w).toBeTruthy();
    expect((w!.text.toLowerCase())).toMatch(/brooklyn/);

    const report = analyseSpeech({
      sessionId: 'e2e-voice',
      mode: 'impromptu',
      capture: {
        transcript: w!.text,
        words: w!.words.map((t) => ({ word: t.word, startMs: Math.round(t.start), endMs: Math.round(t.end), confidence: -1 })),
        segments: [],
        audio: { durationMs: 28000, avgLoudness: 0.12, peakLoudness: 0.3, silenceMs: 2000, envelope: new Array(120).fill(0.2), clipped: false },
        engine: 'cloud',
        latencyMs: 0,
        typedFallback: false,
      },
    });
    console.log('OVERALL:', report.overall, 'BAND:', report.band, 'CEFR:', report.cefr);
    console.log('WORDS:', report.metrics.wordCount, 'WPM:', report.metrics.wpm);
    console.log('IMPROVE:', report.focusAreas);
    expect(report.metrics.wordCount).toBeGreaterThan(4);
    expect(report.focusAreas.length).toBeGreaterThan(0);

    // understanding layer: the cloud examiner reads an error-containing answer
    const { fetchLlmFeedback, mergeLlmFeedback } = await import('@/lib/insights/llm-feedback');
    const llm = await fetchLlmFeedback(
      'I think the Brooklyn Bridge is one of the most famous bridge in the world because it was build many years ago and it still standing today which impress me a lot.',
      { mode: 'impromptu', wpm: report.metrics.wpm, fillerCount: report.metrics.fillerCount },
    );
    console.log('LLM PLAN:', JSON.stringify(llm?.feedback.improvements ?? null));
    if (llm) {
      const merged = mergeLlmFeedback(report, llm.feedback, llm.model);
      console.log('LLM CEFR:', merged.llm?.cefr, 'ORG:', merged.llm?.organization);
      expect(merged.llm?.improvements.length).toBeGreaterThan(0);
    }
  }, 90000);
});
