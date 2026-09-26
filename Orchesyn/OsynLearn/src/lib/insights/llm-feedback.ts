import { aiConfig } from '@/lib/ai/provider';
import type { FeedbackReport, GrammarIssue } from '@/types';

/**
 * LLM-augmented assessment — the "understanding" brain.
 *
 * Architecture (hybrid, honest, never-hanging):
 *   - OBJECTIVE layer (always, on-device): pace, pauses, fillers, pitch, loudness.
 *   - LINGUISTIC layer: the 23-rule local engine (deterministic, offline).
 *   - UNDERSTANDING layer (this file): the learner's configured cloud model reads
 *     the transcript like an examiner and returns schema-validated JSON — grammar
 *     corrections with fixes, discourse/organisation notes, strong vocabulary,
 *     and a 3-step improvement plan. Works in ANY language the model knows.
 *
 * Failure is boring by design: 15 s cap, strict parsing, and on any miss the
 * report simply keeps the local engine's output. No hang, no fake numbers.
 */

export interface LlmFeedback {
  grammar: { quote: string; correction: string; explanation: string; severity: 'warn' | 'bad' }[];
  vocabulary: string[];
  organization: string;
  improvements: string[];
  cefr?: string;
}

export function buildFeedbackPrompt(transcript: string, ctx: { mode: string; wpm: number; fillerCount: number }): string {
  return `Examine this spoken answer (mode: ${ctx.mode}, measured pace ${ctx.wpm} wpm, ${ctx.fillerCount} filler words detected by the local engine).

Transcript:
"""
${transcript.slice(0, 4000)}
"""

Reply with ONLY minified JSON, no markdown, exactly this shape:
{"grammar":[{"quote":"exact words from transcript","correction":"corrected phrase","explanation":"one short reason","severity":"warn|bad"}],"vocabulary":["strong word choices already used"],"organization":"one sentence on structure/coherence","improvements":["3 concrete actions to raise the band, each under 120 chars"],"cefr":"A2|B1|B2|C1|C2"}
Rules: quote ONLY text that appears verbatim in the transcript; at most 6 grammar items; if the grammar is clean return []; improvements must be specific to THIS answer, never generic advice.`;
}

/** Tolerant-but-strict parser: fences stripped, shape-validated, else null. */
export function parseLlmFeedback(text: string): LlmFeedback | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof j !== 'object' || j === null) return null;
    const grammar = Array.isArray(j.grammar)
      ? j.grammar
          .filter((g: any) => g && typeof g.quote === 'string' && typeof g.correction === 'string' && g.quote.length && g.correction.length)
          .slice(0, 6)
          .map((g: any) => ({
            quote: g.quote,
            correction: g.correction,
            explanation: typeof g.explanation === 'string' ? g.explanation : '',
            severity: g.severity === 'bad' ? ('bad' as const) : ('warn' as const),
          }))
      : [];
    const improvements = Array.isArray(j.improvements)
      ? j.improvements.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, 3)
      : [];
    if (!grammar.length && !improvements.length) return null;
    return {
      grammar,
      improvements,
      vocabulary: Array.isArray(j.vocabulary) ? j.vocabulary.filter((s: any) => typeof s === 'string').slice(0, 10) : [],
      organization: typeof j.organization === 'string' ? j.organization : '',
      cefr: typeof j.cefr === 'string' ? j.cefr : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchLlmFeedback(
  transcript: string,
  ctx: { mode: string; wpm: number; fillerCount: number },
): Promise<{ feedback: LlmFeedback; model: string } | null> {
  const cfg = aiConfig();
  if (!cfg.cloud || transcript.trim().split(/\s+/).length < 8) return null;
  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'You are an IELTS/CEFR speaking examiner embedded in a coaching app. Be precise, brief and encouraging. Output JSON only.',
          },
          { role: 'user', content: buildFeedbackPrompt(transcript, ctx) },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const feedback = parseLlmFeedback(j.choices?.[0]?.message?.content ?? '');
    if (!feedback) return null;
    return { feedback, model: cfg.model };
  } catch {
    return null;
  }
}

/** Pure merge: LLM layer augments the report; local engine remains the floor. */
export function mergeLlmFeedback(
  report: FeedbackReport,
  fb: LlmFeedback,
  model: string,
): FeedbackReport {
  const grammarIssues: GrammarIssue[] = fb.grammar.map((g, i) => ({
    ruleId: `llm-${i}`,
    category: 'style',
    quote: g.quote,
    correction: g.correction,
    explanation: g.explanation,
    severity: g.severity,
    wordIndex: -1,
  }));
  return {
    ...report,
    grammarIssues: grammarIssues.length ? grammarIssues : report.grammarIssues,
    llm: {
      improvements: fb.improvements,
      organization: fb.organization || undefined,
      vocabulary: fb.vocabulary.length ? fb.vocabulary : undefined,
      cefr: fb.cefr,
      model,
    },
  };
}
