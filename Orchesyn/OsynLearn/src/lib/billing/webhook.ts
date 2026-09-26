/**
 * Payment webhook processing — verified and idempotent.
 *
 * The client checkout screen is decoration: entitlements change ONLY when a
 * signature-verified event applies. Events carry a provider event id; an event
 * is applied at most once per store, so retries, duplicate deliveries and
 * replayed requests are all harmless.
 */

export interface BillingEvent {
  id: string; // provider event id — the idempotency key
  type: 'checkout.succeeded' | 'payment.failed' | 'subscription.cancelled' | 'charge.refunded';
  userId: string;
  offer: string;
  /** provider charge id, used to match refunds to payments */
  chargeId?: string;
  periodEnd?: string;
  currency?: string;
  amount?: number;
  at: string;
}

export interface BillingRecord {
  userId: string;
  offer: string;
  status: 'active' | 'past_due' | 'cancelled' | 'refunded';
  lastChargeId?: string;
  periodEnd: string | null;
  history: { eventId: string; type: BillingEvent['type']; at: string; amount?: number; currency?: string }[];
}

export interface BillingStore {
  processedEventIds: string[];
  subscriptions: Record<string, BillingRecord>;
}

export const emptyStore = (): BillingStore => ({ processedEventIds: [], subscriptions: {} });

export interface ApplyResult {
  store: BillingStore;
  applied: boolean; // false when the event was a duplicate
  record?: BillingRecord;
}

export function applyEvent(store: BillingStore, event: BillingEvent): ApplyResult {
  if (store.processedEventIds.includes(event.id)) {
    return { store, applied: false, record: store.subscriptions[event.userId] };
  }
  const next: BillingStore = {
    processedEventIds: [...store.processedEventIds, event.id],
    subscriptions: { ...store.subscriptions },
  };
  const rec: BillingRecord = next.subscriptions[event.userId] ?? {
    userId: event.userId,
    offer: event.offer,
    status: 'cancelled',
    periodEnd: null,
    history: [],
  };
  const entry = { eventId: event.id, type: event.type, at: event.at, amount: event.amount, currency: event.currency };

  switch (event.type) {
    case 'checkout.succeeded':
      next.subscriptions[event.userId] = {
        ...rec,
        offer: event.offer,
        status: 'active',
        lastChargeId: event.chargeId,
        periodEnd: event.periodEnd ?? null,
        history: [...rec.history, entry],
      };
      break;
    case 'payment.failed':
      // failed payment never grants or extends entitlements
      next.subscriptions[event.userId] = { ...rec, status: rec.status === 'active' ? 'past_due' : rec.status, history: [...rec.history, entry] };
      break;
    case 'subscription.cancelled':
      next.subscriptions[event.userId] = { ...rec, status: 'cancelled', history: [...rec.history, entry] };
      break;
    case 'charge.refunded':
      // refund revokes: money back ⇒ entitlements back to Free
      if (rec.lastChargeId === event.chargeId || !rec.lastChargeId) {
        next.subscriptions[event.userId] = { ...rec, status: 'refunded', history: [...rec.history, entry] };
      } else {
        next.subscriptions[event.userId] = { ...rec, history: [...rec.history, entry] };
      }
      break;
  }
  return { store: next, applied: true, record: next.subscriptions[event.userId] };
}

/* ------------------------------ signatures -------------------------------- */

/** HMAC-SHA256 hex signature over the raw body, like the major providers use. */
export async function signBody(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySignature(body: string, secret: string, signature: string): Promise<boolean> {
  const expected = await signBody(body, secret);
  // constant-time-ish compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
