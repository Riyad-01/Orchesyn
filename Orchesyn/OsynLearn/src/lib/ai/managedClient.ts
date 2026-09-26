'use client';

/**
 * Client side of managed AI assessment.
 *
 * The contract that matters: a failed managed call NEVER loses the learner's
 * work and NEVER degrades into invented scores. Failures return a typed
 * reason; the caller keeps the submission, shows the limitation, and may queue
 * the assessment for retry (recoverable upload failures).
 */
import type { AssessmentMeta, ValidatedAssessment } from './managed';

export interface ManagedStatus {
  configured: boolean;
  provider?: string;
  model?: string;
  reason?: string;
}

let statusCache: ManagedStatus | null = null;

function clientId(): string {
  try {
    let id = window.localStorage.getItem('stim:client-id');
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      window.localStorage.setItem('stim:client-id', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export async function getManagedStatus(force = false): Promise<ManagedStatus> {
  if (statusCache && !force) return statusCache;
  try {
    const res = await fetch('/api/ai/status', { cache: 'no-store' });
    statusCache = (await res.json()) as ManagedStatus;
  } catch {
    statusCache = { configured: false, reason: 'unreachable' };
  }
  return statusCache;
}

export interface ManagedResult {
  ok: boolean;
  assessment?: ValidatedAssessment;
  meta?: AssessmentMeta;
  reason?: string;
  detail?: string;
}

async function post(path: string, payload: Record<string, unknown>): Promise<ManagedResult> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-osyn-client': clientId() },
      body: JSON.stringify(payload),
    });
    const j = (await res.json()) as ManagedResult;
    if (j.ok && j.meta) recordUsage(j.meta);
    return j;
  } catch {
    return { ok: false, reason: 'network' };
  }
}

export const assessWritingManaged = (payload: Record<string, unknown>) => post('/api/ai/assess/writing', payload);
export const assessSpeakingManaged = (payload: Record<string, unknown>) => post('/api/ai/assess/speaking', payload);

/* ------------------------------ usage ledger ------------------------------ */

const USAGE_KEY = 'stim:ai-usage';

export function recordUsage(meta: AssessmentMeta): void {
  try {
    const list = JSON.parse(window.localStorage.getItem(USAGE_KEY) ?? '[]') as AssessmentMeta[];
    window.localStorage.setItem(USAGE_KEY, JSON.stringify([meta, ...list].slice(0, 200)));
  } catch {
    /* fine */
  }
}

export function usageLedger(): AssessmentMeta[] {
  try {
    return JSON.parse(window.localStorage.getItem(USAGE_KEY) ?? '[]') as AssessmentMeta[];
  } catch {
    return [];
  }
}

export function usageTotals(): { calls: number; costUsd: number; avgLatencyMs: number } {
  const list = usageLedger();
  const cost = list.reduce((a, m) => a + (m.costUsd ?? 0), 0);
  const lat = list.reduce((a, m) => a + (m.latencyMs ?? 0), 0);
  return { calls: list.length, costUsd: cost, avgLatencyMs: list.length ? Math.round(lat / list.length) : 0 };
}

/* --------------------- recoverable upload failure queue ------------------- */

const QUEUE_KEY = 'stim:pending-assessments';

export interface PendingAssessment {
  id: string;
  kind: 'writing' | 'speaking';
  payload: Record<string, unknown>;
  failedReason: string;
  attempts: number;
  at: number;
  preview: string;
}

export function queueAssessment(kind: 'writing' | 'speaking', payload: Record<string, unknown>, failedReason: string, preview: string): void {
  try {
    const list = pendingAssessments();
    list.unshift({ id: Math.random().toString(36).slice(2, 10), kind, payload, failedReason, attempts: 0, at: Date.now(), preview });
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* fine */
  }
}

export function pendingAssessments(): PendingAssessment[] {
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? '[]') as PendingAssessment[];
  } catch {
    return [];
  }
}

export function dropPending(id: string): void {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(pendingAssessments().filter((p) => p.id !== id)));
  } catch {
    /* fine */
  }
}

/** Retry one queued submission; on success the caller handles the result and we drop it. */
export async function retryPending(id: string): Promise<{ done: boolean; result: ManagedResult }> {
  const item = pendingAssessments().find((p) => p.id === id);
  if (!item) return { done: true, result: { ok: false, reason: 'gone' } };
  const result = item.kind === 'writing' ? await assessWritingManaged(item.payload) : await assessSpeakingManaged(item.payload);
  if (result.ok) dropPending(id);
  else {
    const list = pendingAssessments().map((p) => (p.id === id ? { ...p, attempts: p.attempts + 1, failedReason: result.reason ?? 'error' } : p));
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
    } catch {
      /* fine */
    }
  }
  return { done: result.ok, result };
}
