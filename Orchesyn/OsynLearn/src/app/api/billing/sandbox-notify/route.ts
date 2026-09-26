import { NextResponse } from 'next/server';
import { applyEvent, signBody, verifySignature, type BillingEvent, type BillingStore } from '@/lib/billing/webhook';
import { storeRead, storeWrite } from '@/lib/server/jsonstore';

export const dynamic = 'force-dynamic';

const secret = () => process.env.OSYN_WEBHOOK_SECRET ?? 'SANDBOX-WEBHOOK-SECRET';

interface BillingFile {
  store: BillingStore;
  checkouts: { id: string; userId: string; offer: string; currency: string; status: string }[];
}

/**
 * Sandbox provider simulator: pretends to be the payment provider calling our
 * webhook. It signs the event with the webhook secret and then pushes it
 * through the SAME verify+apply path the real webhook uses — so sandbox
 * verification exercises the production code, not a stand-in.
 */
export async function POST(req: Request) {
  let body: { checkoutId?: unknown; outcome?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  const file = storeRead<BillingFile>('billing.json', { store: { processedEventIds: [], subscriptions: {} }, checkouts: [] });
  const checkout = file.checkouts.find((c) => c.id === body.checkoutId);
  if (!checkout) return NextResponse.json({ ok: false, reason: 'unknown-checkout' }, { status: 404 });

  const outcome = String(body.outcome);
  const type: BillingEvent['type'] | null =
    outcome === 'succeeded' ? 'checkout.succeeded'
    : outcome === 'failed' ? 'payment.failed'
    : outcome === 'refunded' ? 'charge.refunded'
    : outcome === 'cancelled' ? 'subscription.cancelled'
    : null;
  if (!type) return NextResponse.json({ ok: false, reason: 'invalid-outcome' }, { status: 400 });

  const event: BillingEvent = {
    id: `evt_${checkout.id}_${outcome}`,
    type,
    userId: checkout.userId,
    offer: checkout.offer,
    chargeId: checkout.id,
    periodEnd: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
    currency: checkout.currency,
    at: new Date().toISOString(),
  };
  const raw = JSON.stringify(event);
  const signature = await signBody(raw, secret());
  if (!(await verifySignature(raw, secret(), signature))) {
    return NextResponse.json({ ok: false, reason: 'internal-signature-failure' }, { status: 500 });
  }
  const parsed = JSON.parse(raw) as BillingEvent;
  const result = applyEvent(file.store, parsed);
  if (result.applied) {
    file.checkouts = file.checkouts.map((c) => (c.id === checkout.id ? { ...c, status: outcome } : c));
    storeWrite('billing.json', { store: result.store, checkouts: file.checkouts });
  }
  return NextResponse.json({ ok: true, applied: result.applied, subscription: result.record });
}
