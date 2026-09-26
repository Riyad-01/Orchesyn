/**
 * Server-only execution engine for managed AI calls: timeout, retry with
 * backoff, token-usage capture, cost estimation and a best-effort disk ledger.
 * Importable ONLY from app/api routes (never from client components).
 */
import { track } from '@/lib/analytics';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  backoffMs,
  costUsd,
  estimateTokens,
  shouldRetry,
  type AssessmentMeta,
  type ManagedConfig,
} from './managed';

export interface ModelCallResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number } | null;
  costUsd: number;
  latencyMs: number;
  retries: number;
  model: string;
}

export interface CallOptions {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

const LEDGER_PATH = join(process.cwd(), '.data', 'osyn-ai-ledger.jsonl');

/** Privacy-conscious logging: client ids are hashed, never stored raw. */
export function scrubClientId(id: string): string {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  return `c${(h >>> 0).toString(16)}`;
}

export function appendLedger(entry: Record<string, unknown>): void {
  const clean = { ...entry };
  if (typeof clean.clientId === 'string') clean.clientId = scrubClientId(clean.clientId);
  try {
    mkdirSync(dirname(LEDGER_PATH), { recursive: true });
    appendFileSync(LEDGER_PATH, JSON.stringify({ at: Date.now(), ...clean }) + '\n');
  } catch {
    // read-only filesystems (static hosts) simply have no ledger
  }
}

/** One managed chat completion with timeout + bounded retries. Throws only after the budget is spent. */
export async function callModel(
  cfg: ManagedConfig,
  system: string,
  user: string,
  opts: CallOptions = {},
): Promise<ModelCallResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const started = opts.now?.() ?? Date.now();
  let lastError = '';
  let retries = 0;

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchImpl(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0.2,
          stream: false,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      });
      if (!res.ok) {
        lastError = `http ${res.status}`;
        if (shouldRetry(res.status, attempt, cfg.maxRetries)) {
          retries++;
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(lastError);
      }
      const j = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = j.choices?.[0]?.message?.content ?? '';
      const usage = j.usage
        ? { inputTokens: j.usage.prompt_tokens ?? estimateTokens(user), outputTokens: j.usage.completion_tokens ?? estimateTokens(text) }
        : { inputTokens: estimateTokens(system + user), outputTokens: estimateTokens(text) };
      // privacy-conscious cost ledger: cents only, on-device, no prompts stored
      track({ name: 'ai_cost', usdCents: Math.round(costUsd(cfg.model, usage.inputTokens, usage.outputTokens) * 100) });
      return {
        text,
        usage,
        costUsd: costUsd(cfg.model, usage.inputTokens, usage.outputTokens),
        latencyMs: (opts.now?.() ?? Date.now()) - started,
        retries,
        model: cfg.model,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (shouldRetry('network', attempt, cfg.maxRetries) && !lastError.startsWith('http')) {
        retries++;
        await sleep(backoffMs(attempt));
        continue;
      }
      throw new Error(lastError);
    }
  }
}

export function metaFromCall(kind: 'writing' | 'speaking', r: ModelCallResult, promptVersion: string, rubricVersion: string, contentVersion: string | null): AssessmentMeta {
  return {
    engine: 'managed',
    model: r.model,
    promptVersion,
    rubricVersion,
    contentVersion,
    latencyMs: r.latencyMs,
    costUsd: Number(r.costUsd.toFixed(6)),
    usage: r.usage,
    retries: r.retries,
  };
}
