import { describe, it, expect } from 'vitest';
import { authorize, orgScope, AuthzError, type Subject } from './rbac';
import { mergeCollections, isMergedStable, type Versioned } from './auth/merge';
import { SyncQueue, type SyncOp } from './sync/queue';
import { applyEvent, emptyStore, signBody, verifySignature, type BillingEvent } from './billing/webhook';
import { entitlementsFor, formatMoney, offerById, FREE_ENTITLEMENTS, MEASURED_ASSESSMENT_USD } from './billing/plans';

/* ---------------------------------- RBAC ---------------------------------- */

const learner: Subject = { userId: 'L1', role: 'learner', orgId: 'org-a' };
const teacherA: Subject = { userId: 'T1', role: 'teacher', orgId: 'org-a' };
const teacherB: Subject = { userId: 'T2', role: 'teacher', orgId: 'org-b' };
const adminA: Subject = { userId: 'A1', role: 'org_admin', orgId: 'org-a' };
const platform: Subject = { userId: 'P1', role: 'platform_admin', orgId: null };

describe('rbac', () => {
  it('learners can read their own data only', () => {
    expect(authorize(learner, 'read', { kind: 'learner-own-data', orgId: 'org-a', ownerId: 'L1' })).toBe(true);
    expect(() => authorize(learner, 'read', { kind: 'learner-own-data', orgId: 'org-a', ownerId: 'L2' })).toThrow(AuthzError);
    expect(() => authorize(learner, 'read', { kind: 'class-progress', orgId: 'org-a' })).toThrow('denied');
  });

  it('teachers act inside their org and never across orgs', () => {
    expect(authorize(teacherA, 'read', { kind: 'submission', orgId: 'org-a' })).toBe(true);
    expect(authorize(teacherA, 'write', { kind: 'feedback-override', orgId: 'org-a' })).toBe(true);
    expect(() => authorize(teacherB, 'read', { kind: 'submission', orgId: 'org-a' })).toThrow('cross-org');
    expect(() => authorize(teacherA, 'write', { kind: 'org-members', orgId: 'org-a' })).toThrow('denied'); // teachers don't manage members
  });

  it('org admins manage members; platform admins must name an org', () => {
    expect(authorize(adminA, 'write', { kind: 'org-members', orgId: 'org-a' })).toBe(true);
    expect(() => authorize(adminA, 'write', { kind: 'usage-controls', orgId: 'org-a' })).toThrow('denied');
    expect(orgScope(platform, 'org-a')).toBe('org-a');
    expect(() => orgScope(platform, null)).toThrow('denied'); // no implicit dump-all
    expect(() => orgScope(teacherB, 'org-a')).toThrow('cross-org');
  });
});

/* ------------------------- guest → account merge -------------------------- */

interface Row extends Versioned {
  id: string;
  score?: number;
}

describe('guest migration merge', () => {
  it('dedupes by id and keeps newer edits', () => {
    const guest: Row[] = [{ id: 's1', score: 5, updatedAt: 200 }, { id: 's2', updatedAt: 10 }];
    const server: Row[] = [{ id: 's1', score: 9, updatedAt: 100 }, { id: 's3', updatedAt: 5 }];
    const m = mergeCollections(guest, server);
    expect(m.merged.map((r) => r.id).sort()).toEqual(['s1', 's2', 's3']);
    expect(m.merged.find((r) => r.id === 's1')?.score).toBe(5); // guest is newer
    expect(m.conflicts).toBe(1);
  });

  it('is idempotent — re-merging changes nothing', () => {
    const guest: Row[] = [{ id: 's1', updatedAt: 200 }, { id: 's2', updatedAt: 10 }];
    const server: Row[] = [{ id: 's1', updatedAt: 100 }, { id: 's3', updatedAt: 5 }];
    const m = mergeCollections(guest, server);
    expect(isMergedStable(guest, server, m.merged)).toBe(true);
  });

  it('identical rows are not double counted', () => {
    const guest: Row[] = [{ id: 'x', updatedAt: 1 }];
    const server: Row[] = [{ id: 'x', updatedAt: 1 }];
    const m = mergeCollections(guest, server);
    expect(m.merged.length).toBe(1);
    expect(m.conflicts).toBe(0);
  });
});

/* ------------------------------- sync queue ------------------------------- */

describe('sync queue', () => {
  const memory = () => {
    let ops: SyncOp[] = [];
    return {
      q: new SyncQueue('k', () => ops, (o) => (ops = o)),
      get: () => ops,
    };
  };

  it('applies ops in order and drops applied ones', async () => {
    const { q, get } = memory();
    q.enqueue('a', 'session', { n: 1 });
    q.enqueue('b', 'report', { n: 2 });
    const seen: string[] = [];
    const r = await q.flush(async (op) => {
      seen.push(op.key);
      return { ok: true };
    });
    expect(seen).toEqual(['a', 'b']);
    expect(r.applied).toBe(2);
    expect(get().length).toBe(0);
  });

  it('keeps failing ops queued with attempt counts; enqueues are deduped by key', async () => {
    const { q, get } = memory();
    q.enqueue('a', 'session', {});
    q.enqueue('a', 'session', {}); // duplicate key ignored
    await q.flush(async () => ({ ok: false, error: 'offline' }));
    expect(get().length).toBe(1);
    expect(get()[0].attempts).toBe(1);
    expect(get()[0].lastError).toBe('offline');
  });

  it('continues past a non-retryable failure', async () => {
    const { q } = memory();
    q.enqueue('bad', 'x', {});
    q.enqueue('good', 'y', {});
    const r = await q.flush(async (op) => (op.key === 'bad' ? { ok: false, retryable: false } : { ok: true }));
    expect(r.applied).toBe(1);
    expect(r.pending).toBe(1);
  });
});

/* ------------------------------ billing webhook ---------------------------- */

const ev = (over: Partial<BillingEvent>): BillingEvent => ({
  id: 'e1',
  type: 'checkout.succeeded',
  userId: 'u1',
  offer: 'prep',
  chargeId: 'ch1',
  periodEnd: '2026-10-22',
  at: '2026-09-22T00:00:00Z',
  ...over,
});

describe('billing webhook', () => {
  it('activates only on verified success events and is idempotent', () => {
    let r = applyEvent(emptyStore(), ev({}));
    expect(r.applied).toBe(true);
    expect(r.record?.status).toBe('active');
    const again = applyEvent(r.store, ev({}));
    expect(again.applied).toBe(false); // duplicate delivery is harmless
    expect(again.store.processedEventIds.length).toBe(1);
  });

  it('failed payments grant nothing; cancellation drops to free-tier entitlements', () => {
    const failed = applyEvent(emptyStore(), ev({ id: 'f1', type: 'payment.failed', offer: 'prep' }));
    expect(failed.record?.status).not.toBe('active'); // a failed charge never activates
    // an existing ACTIVE sub that misses a payment gets grace (past_due), not instant death
    const on = applyEvent(emptyStore(), ev({ id: 'a1' }));
    const missed = applyEvent(on.store, ev({ id: 'f2', type: 'payment.failed' }));
    expect(missed.record?.status).toBe('past_due');
    const cancelled = applyEvent(missed.store, ev({ id: 'c1', type: 'subscription.cancelled' }));
    expect(cancelled.record?.status).toBe('cancelled');
    const ents = entitlementsFor('prep', 'cancelled', null);
    expect(ents.offer).toBe('free');
    expect(ents.teacherTools).toBe(false);
  });

  it('refunds revoke the matching subscription', () => {
    const on = applyEvent(emptyStore(), ev({}));
    const off = applyEvent(on.store, ev({ id: 'r1', type: 'charge.refunded', chargeId: 'ch1' }));
    expect(off.record?.status).toBe('refunded');
  });

  it('signatures verify and reject tampering', async () => {
    const sig = await signBody('{"a":1}', 'secret');
    expect(await verifySignature('{"a":1}', 'secret', sig)).toBe(true);
    expect(await verifySignature('{"a":2}', 'secret', sig)).toBe(false);
    expect(await verifySignature('{"a":1}', 'other', sig)).toBe(false);
  });
});

/* --------------------------------- plans ---------------------------------- */

describe('offers & money', () => {
  it('AI allowances derive from measured cost, not optimism', () => {
    expect(offerById('free')!.aiAssessmentsPerMonth).toBe(3);
    expect(offerById('prep')!.aiAssessmentsPerMonth).toBeGreaterThan(2500);
    expect(offerById('teacher')!.aiAssessmentsPerMonth).toBeGreaterThan(offerById('prep')!.aiAssessmentsPerMonth);
    expect(MEASURED_ASSESSMENT_USD).toBeLessThan(0.001);
  });

  it('presents currencies consistently (symbol + code)', () => {
    expect(formatMoney(9, 'USD')).toBe('$9.00 USD');
    expect(formatMoney(9, 'BDT')).toContain('BDT');
    expect(formatMoney(9, 'BDT')).toContain('৳');
  });
});
