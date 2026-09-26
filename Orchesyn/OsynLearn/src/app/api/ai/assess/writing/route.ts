import { NextResponse } from 'next/server';
import {
  buildManagedWritingPrompt,
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

  let body: { taskType?: unknown; module?: unknown; prompt?: unknown; text?: unknown; contentVersion?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  const taskType = body.taskType === 1 ? 1 : body.taskType === 2 ? 2 : null;
  const text = typeof body.text === 'string' ? body.text : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  if (!taskType || text.trim().split(/\s+/).length < 20 || text.length > 20000) {
    return NextResponse.json({ ok: false, reason: 'invalid-submission', detail: 'Need 20–4000 words of answer text.' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (daySpend.day !== today) daySpend = { day: today, usd: 0 };
  if (daySpend.usd >= cfg.dailyCostCapUsd) {
    return NextResponse.json({ ok: false, reason: 'daily-cap' }, { status: 503 });
  }

  const fence = makeFence();
  const userPrompt = buildManagedWritingPrompt({
    taskType,
    module: body.module === 'general' ? 'general' : 'academic',
    prompt,
    text,
    fence,
  });

  try {
    const call = await callModel(cfg, 'You are an IELTS Writing examiner. Reply with minified JSON only.', userPrompt);
    daySpend.usd += call.costUsd;
    const parsed = extractJson(call.text);
    const assessment = validateAssessment(parsed, text, { kind: 'writing' });
    appendLedger({ kind: 'writing', clientId, latencyMs: call.latencyMs, costUsd: call.costUsd, valid: Boolean(assessment) });
    if (!assessment) {
      // Model output failed validation: say so; the client keeps the essay and falls back.
      return NextResponse.json({ ok: false, reason: 'invalid-model-output' }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      assessment,
      meta: metaFromCall('writing', call, MANAGED_PROMPT_VERSIONS.writing, RUBRIC_VERSIONS.writing, (body.contentVersion as string) ?? null),
    });
  } catch (e) {
    appendLedger({ kind: 'writing', clientId, error: String(e) });
    return NextResponse.json({ ok: false, reason: 'provider-error', detail: String(e).slice(0, 120) }, { status: 502 });
  }
}
