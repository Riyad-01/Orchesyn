import { aiConfig } from '@/lib/ai/provider';

/**
 * Live Interview debrief — hybrid like everything else:
 * local signals (pace, fillers, STAR structure, length) are the floor;
 * the configured LLM adds a senior-interviewer's judgement. 20 s cap,
 * strict parse, boring fallback. Never hangs.
 */

export interface InterviewDebrief {
  readiness: 'ready' | 'almost' | 'building';
  verdict: string;
  strengths: string[];
  fixes: string[];
  tips: string[];
  model: string | null;
}

export function buildInterviewPrompt(trackTitle: string, qa: { q: string; a: string; words: number }[]): string {
  const body = qa.map((x, i) => `Q${i + 1}: ${x.q}\nA${i + 1} (${x.words} words): "${x.a.slice(0, 900)}"`).join('\n\n');
  return `You are a senior hiring manager debriefing a candidate after a mock ${trackTitle} interview.

Transcript:
"""
${body.slice(0, 7000)}
"""

Reply with ONLY minified JSON, no markdown, exactly:
{"readiness":"ready|almost|building","verdict":"one encouraging sentence","strengths":["2-3 specific things done well"],"fixes":["2-3 specific weak answers and why"],"tips":["3 concrete actions before the real interview, each under 120 chars"]}
Rules: judge structure, specificity and evidence — not accent; "ready" only if most answers carry concrete examples and results.`;
}

export function parseDebrief(text: string): Omit<InterviewDebrief, 'model'> | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as { readiness?: string; verdict?: string; strengths?: unknown[]; fixes?: unknown[]; tips?: unknown[] };
    const readiness = j.readiness === 'ready' || j.readiness === 'almost' || j.readiness === 'building' ? j.readiness : null;
    if (!readiness) return null;
    const list = (x: unknown[]) => (Array.isArray(x) ? x.map(String).filter(Boolean).slice(0, 4) : []);
    return {
      readiness,
      verdict: typeof j.verdict === 'string' ? j.verdict : '',
      strengths: list(j.strengths ?? []),
      fixes: list(j.fixes ?? []),
      tips: list(j.tips ?? []),
    };
  } catch {
    return null;
  }
}

export async function fetchInterviewDebrief(
  trackTitle: string,
  qa: { q: string; a: string; words: number }[],
  localReadiness: InterviewDebrief['readiness'],
): Promise<InterviewDebrief> {
  const fallback = (): InterviewDebrief => ({
    readiness: localReadiness,
    verdict:
      localReadiness === 'ready'
        ? 'Structured, example-driven answers — you would hold up in the real room.'
        : localReadiness === 'almost'
          ? 'Good bones: add concrete results to your stories and you are ready.'
          : 'Building phase: aim for Situation-Task-Action-Result and one number per story.',
    strengths: [],
    fixes: [],
    tips: [
      'Answer in STAR order; spend 60% of the time on Action and Result.',
      'Put one number in every story (%, time saved, people helped).',
      'Finish answers on purpose: "...and that is why this role fits." Silence beats rambling.',
    ],
    model: null,
  });
  const cfg = aiConfig();
  if (!cfg.cloud) return fallback();
  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.3,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a senior hiring manager in a coaching app. Honest, specific, encouraging. Output JSON only.' },
          { role: 'user', content: buildInterviewPrompt(trackTitle, qa) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return fallback();
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = parseDebrief(j.choices?.[0]?.message?.content ?? '');
    if (!parsed) return fallback();
    return { ...parsed, model: cfg.model };
  } catch {
    return fallback();
  }
}
