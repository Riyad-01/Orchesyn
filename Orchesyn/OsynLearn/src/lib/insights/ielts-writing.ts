import { aiConfig } from '@/lib/ai/provider';
import { bandVerdict, estimateWritingBands, writingStats, type WritingStats } from '@/lib/scoring/ielts-bands';
import type { WritingTask } from '@/lib/data/ielts-receptive';

/**
 * IELTS Writing examiner — mirrors the speaking architecture:
 *   local stats are the honest floor; the configured LLM (if any) adds real
 *   examiner judgement with criterion bands and verbatim fixes. 15 s cap,
 *   strict parse, on any failure we fall back to the local estimate. Never hangs.
 */

export interface WritingReport {
  bands: { ta: number; cc: number; lr: number; gra: number; overall: number };
  verdict: string;
  fixes: { quote: string; correction: string; why: string }[];
  strengths: string[];
  tips: string[];
  model: string | null; // null = local estimate
  stats: WritingStats;
}

export function buildWritingPrompt(task: WritingTask, essay: string): string {
  return `You are an IELTS Writing examiner. Assess this ${task.task === 1 ? 'Task 1' : 'Task 2'} answer.

Prompt:
"""
${task.prompt}
${task.hints.map((h) => `- ${h}`).join('\n')}
"""

Candidate answer:
"""
${essay.slice(0, 6000)}
"""

Reply with ONLY minified JSON, no markdown, exactly this shape:
{"bands":{"ta":0,"cc":0,"lr":0,"gra":0,"overall":0},"fixes":[{"quote":"exact words from the answer","correction":"corrected phrase","why":"one short reason"}],"strengths":["what the candidate already does well"],"tips":["3 concrete actions to raise the band, each under 120 chars"]}
Rules: bands are IELTS half-band values 4-9 (overall = mean of the four, rounded to nearest half); ta = task achievement/response, cc = coherence & cohesion, lr = lexical resource, gra = grammatical range & accuracy; quote ONLY text that appears verbatim in the answer; at most 5 fixes; be strict but fair and specific to THIS answer.`;
}

function halfBand(n: unknown): number {
  const v = typeof n === 'number' ? n : parseFloat(String(n));
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.min(9, Math.max(4, v)) * 2) / 2;
}

export function parseWritingReport(text: string): Omit<WritingReport, 'model' | 'stats' | 'verdict'> | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as {
      bands?: Record<string, unknown>;
      fixes?: unknown[];
      strengths?: unknown[];
      tips?: unknown[];
    };
    if (!j.bands || typeof j.bands !== 'object') return null;
    const ta = halfBand(j.bands.ta);
    const cc = halfBand(j.bands.cc);
    const lr = halfBand(j.bands.lr);
    const gra = halfBand(j.bands.gra);
    let overall = halfBand(j.bands.overall);
    if (overall <= 0) overall = Math.round(((ta + cc + lr + gra) / 4) * 2) / 2;
    const fixes = Array.isArray(j.fixes)
      ? j.fixes
          .map((f) => f as Record<string, unknown>)
          .filter((f) => typeof f?.quote === 'string' && typeof f?.correction === 'string')
          .slice(0, 5)
          .map((f) => ({ quote: String(f.quote), correction: String(f.correction), why: String(f.why ?? '') }))
      : [];
    const strengths = Array.isArray(j.strengths) ? j.strengths.map(String).filter(Boolean).slice(0, 4) : [];
    const tips = Array.isArray(j.tips) ? j.tips.map(String).filter(Boolean).slice(0, 3) : [];
    return { bands: { ta, cc, lr, gra, overall }, fixes, strengths, tips };
  } catch {
    return null;
  }
}

export async function examineWriting(task: WritingTask, essay: string): Promise<WritingReport> {
  const stats = writingStats(essay);
  const cfg = aiConfig();
  const fallback = (): WritingReport => {
    const bands = estimateWritingBands(stats);
    return {
      bands,
      verdict: bandVerdict(bands.overall) + ' · local estimate',
      fixes: [],
      strengths: stats.connectiveCount >= 4 ? ['Clear use of linking words'] : [],
      tips:
        stats.words < task.minWords
          ? [`Reach the word target (${task.minWords}+ words) — you wrote ${stats.words}.`]
          : stats.paragraphs < 3
            ? ['Split your answer into 4-5 clear paragraphs.']
            : ['Vary sentence length and add one concession (e.g. "However, ...").'],
      model: null,
      stats,
    };
  };
  if (!cfg.cloud || stats.words < 30) return fallback();
  try {
    const res = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a strict but encouraging IELTS Writing examiner embedded in a coaching app. Output JSON only.' },
          { role: 'user', content: buildWritingPrompt(task, essay) },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return fallback();
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = parseWritingReport(j.choices?.[0]?.message?.content ?? '');
    if (!parsed) return fallback();
    return { ...parsed, verdict: bandVerdict(parsed.bands.overall), model: cfg.model, stats };
  } catch {
    return fallback();
  }
}
