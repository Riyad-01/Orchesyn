import { NextResponse } from 'next/server';
import { verifySandboxToken } from '@/lib/auth/sandbox';
import { entitlementsFor, FREE_ENTITLEMENTS } from '@/lib/billing/plans';
import type { BillingStore } from '@/lib/billing/webhook';
import { storeRead } from '@/lib/server/jsonstore';

export const dynamic = 'force-dynamic';

/** Server-computed entitlements. Users may read their own; platform admins may read any (billing visibility). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') ?? '';
  const claims = await verifySandboxToken(req.headers.get('authorization')?.replace('Bearer ', '') ?? null);
  if (!claims) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  if (claims.userId !== userId && claims.role !== 'platform_admin') {
    return NextResponse.json({ ok: false, reason: 'denied' }, { status: 403 });
  }

  const store = storeRead<{ store: BillingStore; checkouts: unknown[] }>('billing.json', { store: { processedEventIds: [], subscriptions: {} }, checkouts: [] }).store;
  const rec = store.subscriptions[userId];
  const entitlements = rec
    ? entitlementsFor(rec.offer as 'free' | 'prep' | 'teacher', rec.status === 'active' || rec.status === 'past_due' ? rec.status : 'cancelled', rec.periodEnd)
    : FREE_ENTITLEMENTS;
  return NextResponse.json({ ok: true, entitlements, history: rec?.history ?? [] });
}
