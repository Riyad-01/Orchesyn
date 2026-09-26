import { NextResponse } from 'next/server';
import {
  buildManagedSpeakingPrompt,
  extractJson,
  makeFence,
  MANAGED_PROMPT_VERSIONS,
  managedConfig,
  RateLimiter,
  RUBRIC_VERSIONS,
  validateAssessment,
} from '@/lib/ai/managed';
import { appendLedger, callModel, metaFromCall } from '@/lib/ai/managed-server';

export const dynamic = 'force-dynamic';

const limiter = new RateLimiter(6);
let daySpend = { day: '', usd: 0 };

export async function POST(req: Request) {
  const cfg = managedConfig();
  if (!cfg) return NextResponse.json({ ok: false, reason: 'unconfigured' }, { status: 503 });

  const clientId = req.headers.get('x-osyn-client') ?? req.headers.get('x-forwarded-for') ?? 'anon';
  if (!limiter.take(clientId)) {
    return NextResponse.json({ ok: false, reason: 'rate-limited', retryAfterS: 60 }, { status: 429 });
  }

  let body: {
    mode?: unknown;
    transcript?: unknown;
    typed?: unknown;
    audioEvidence?: unknown;
    features?: { wpm?: unknown; pauseCount?: unknown; fillerCount?: unknown; durationMs?: unknown };
    words?: unknown;
    contentVersion?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript : '';
  const typed = body.typed === true;
  const words = Array.isArray(body.words)
    ? (body.words as { word?: unknown; startMs?: unknown }[])
        .filter((w) => typeof w?.word === 'string' && typeof w?.startMs === 'number')
        .map((w) => ({ word: String(w.word), startMs: Number(w.startMs) }))
        .slice(0, 2000)
    : undefined;

  // Silent / empty recordings cannot be assessed — say so instead of inventing scores.
  if (transcript.trim().split(/\s+/).filter(Boolean).length < 5) {
    return NextResponse.json({
      ok: false,
      reason: 'insufficient-evidence',
      detail: 'Less than five words of speech — no assessment is possible. Record a longer answer.',
    }, { status: 422 });
  }
  if (transcript.length > 12000) {
    return NextResponse.json({ ok: false, reason: 'invalid-submission' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (daySpend.day !== today) daySpend = { day: today, usd: 0 };
  if (daySpend.usd >= cfg.dailyCostCapUsd) {
    return NextResponse.json({ ok: false, reason: 'daily-cap' }, { status: 503 });
  }

  const f = body.features ?? {};
  const fence = makeFence();
  const userPrompt = buildManagedSpeakingPrompt({
    mode: typeof body.mode === 'string' ? body.mode : 'practice',
    transcript,
    typed,
    audioEvidence: body.audioEvidence === true,
    features: {
      wpm: typeof f.wpm === 'number' ? f.wpm : 0,
      pauseCount: typeof f.pauseCount === 'number' ? f.pauseCount : 0,
      fillerCount: typeof f.fillerCount === 'number' ? f.fillerCount : 0,
      durationMs: typeof f.durationMs === 'number' ? f.durationMs : 0,
    },
    fence,
  });

  try {
    const call = await callModel(cfg, 'You are an IELTS Speaking examiner. Reply with minified JSON only.', userPrompt);
    daySpend.usd += call.costUsd;
    const parsed = extractJson(call.text);
    const assessment = validateAssessment(parsed, transcript, { kind: 'speaking', words, typed });
    appendLedger({ kind: 'speaking', clientId, typed, latencyMs: call.latencyMs, costUsd: call.costUsd, valid: Boolean(assessment) });
    if (!assessment) {
      return NextResponse.json({ ok: false, reason: 'invalid-model-output' }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      assessment,
      meta: metaFromCall('speaking', call, MANAGED_PROMPT_VERSIONS.speaking, RUBRIC_VERSIONS.speaking, (body.contentVersion as string) ?? null),
    });
  } catch (e) {
    appendLedger({ kind: 'speaking', clientId, error: String(e) });
    return NextResponse.json({ ok: false, reason: 'provider-error', detail: String(e).slice(0, 120) }, { status: 502 });
  }
}
