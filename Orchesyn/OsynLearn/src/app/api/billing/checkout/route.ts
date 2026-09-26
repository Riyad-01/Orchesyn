import { NextResponse } from 'next/server';
import { offerById, formatMoney, type Currency } from '@/lib/billing/plans';
import { storeRead, storeWrite } from '@/lib/server/jsonstore';

export const dynamic = 'force-dynamic';

export interface CheckoutSession {
  id: string;
  userId: string;
  offer: string;
  currency: Currency;
  amountLabel: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
  createdAt: string;
}

interface BillingFile {
  store: import('@/lib/billing/webhook').BillingStore;
  checkouts: CheckoutSession[];
}

const read = () => storeRead<BillingFile>('billing.json', { store: { processedEventIds: [], subscriptions: {} }, checkouts: [] });

/** Creates a checkout. Entitlements do NOT change here — only a verified webhook changes them. */
export async function POST(req: Request) {
  let body: { userId?: unknown; offer?: unknown; currency?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  const offer = offerById(String(body.offer ?? ''));
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
  const currency: Currency = body.currency === 'BDT' ? 'BDT' : 'USD';
  if (!offer || !userId) return NextResponse.json({ ok: false, reason: 'invalid-checkout' }, { status: 400 });
  if (offer.id === 'free') return NextResponse.json({ ok: false, reason: 'free-needs-no-checkout' }, { status: 400 });

  const file = read();
  const session: CheckoutSession = {
    id: `co_${Math.random().toString(36).slice(2, 10)}`,
    userId,
    offer: offer.id,
    currency,
    amountLabel: formatMoney(offer.priceMonthly.usd, currency),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  file.checkouts = [session, ...file.checkouts].slice(0, 100);
  storeWrite('billing.json', file);
  return NextResponse.json({ ok: true, checkout: session, sandbox: true });
}
