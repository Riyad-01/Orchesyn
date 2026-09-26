import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { verifySandboxToken } from '@/lib/auth/sandbox';
import { storeRead } from '@/lib/server/jsonstore';
import { scrubClientId } from '@/lib/ai/managed-server';

export const dynamic = 'force-dynamic';

/** Platform-admin support & visibility. Metadata only — never learner content bodies. */
export async function GET(req: Request) {
  const claims = await verifySandboxToken(req.headers.get('authorization')?.replace('Bearer ', '') ?? null);
  if (!claims) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  if (claims.role !== 'platform_admin') return NextResponse.json({ ok: false, reason: 'denied' }, { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'overview';

  if (action === 'overview') {
    const billing = storeRead('billing.json', { store: { processedEventIds: [] as string[], subscriptions: {} as Record<string, unknown> }, checkouts: [] as unknown[] });
    const orgs = storeRead('orgs.json', { orgs: [] as { id: string; name: string }[], members: [] as { orgId: string; role: string }[] });
    let ledger: unknown[] = [];
    try {
      const p = join(process.cwd(), '.data', 'osyn-ai-ledger.jsonl');
      if (existsSync(p)) ledger = readFileSync(p, 'utf8').trim().split('\n').slice(-30).map((l) => JSON.parse(l));
    } catch { /* no ledger */ }
    return NextResponse.json({
      ok: true,
      subscriptions: Object.values(billing.store.subscriptions),
      checkouts: billing.checkouts.slice(0, 20),
      orgs: orgs.orgs,
      memberCounts: orgs.orgs.map((o) => ({ orgId: o.id, name: o.name, members: orgs.members.filter((m) => m.orgId === o.id).length })),
      ledger: ledger.map((e) => {
        const x = e as Record<string, unknown>;
        return { ...x, clientId: typeof x.clientId === 'string' ? scrubClientId(x.clientId) : x.clientId };
      }),
    });
  }
  if (action === 'support-lookup') {
    // metadata-only lookup: billing + org membership, no content
    const userId = url.searchParams.get('userId') ?? '';
    const billing = storeRead('billing.json', { store: { processedEventIds: [] as string[], subscriptions: {} as Record<string, unknown> }, checkouts: [] as unknown[] });
    const orgs = storeRead('orgs.json', { orgs: [] as { id: string; name: string }[], members: [] as { userId: string; orgId: string; role: string }[] });
    return NextResponse.json({
      ok: true,
      subscription: billing.store.subscriptions[userId] ?? null,
      memberships: orgs.members.filter((m) => m.userId === userId),
    });
  }
  return NextResponse.json({ ok: false, reason: 'unknown-action' }, { status: 400 });
}
