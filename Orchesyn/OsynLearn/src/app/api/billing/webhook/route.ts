import { NextResponse } from 'next/server';
import { applyEvent, verifySignature, type BillingEvent, type BillingStore } from '@/lib/billing/webhook';
import { storeRead, storeWrite } from '@/lib/server/jsonstore';

export const dynamic = 'force-dynamic';

const secret = () => process.env.OSYN_WEBHOOK_SECRET ?? 'SANDBOX-WEBHOOK-SECRET';

interface BillingFile {
  store: BillingStore;
  checkouts: { id: string; status: string }[];
}

/**
 * The ONLY place entitlements change. Signature-verified, idempotent by event id.
 * A client-side "payment success" screen never reaches this logic.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-osyn-signature') ?? '';
  if (!(await verifySignature(raw, secret(), signature))) {
    return NextResponse.json({ ok: false, reason: 'bad-signature' }, { status: 401 });
  }
  let event: BillingEvent;
  try {
    event = JSON.parse(raw) as BillingEvent;
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  if (!event?.id || !event?.type || !event?.userId) {
    return NextResponse.json({ ok: false, reason: 'invalid-event' }, { status: 400 });
  }

  const file = storeRead<BillingFile>('billing.json', { store: { processedEventIds: [], subscriptions: {} }, checkouts: [] });
  const result = applyEvent(file.store, event);
  if (result.applied) {
    // keep the checkout list in sync for the billing UI
    const statusFor: Record<BillingEvent['type'], string> = {
      'checkout.succeeded': 'succeeded',
      'payment.failed': 'failed',
      'subscription.cancelled': 'cancelled',
      'charge.refunded': 'refunded',
    };
    file.checkouts = file.checkouts.map((c) => (c.id === event.chargeId ? { ...c, status: statusFor[event.type] } : c));
    storeWrite('billing.json', { store: result.store, checkouts: file.checkouts });
  }
  return NextResponse.json({ ok: true, applied: result.applied, duplicate: !result.applied });
}
