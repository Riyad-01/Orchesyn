'use client';

import { track } from '@/lib/analytics';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Chip, SectionTitle, Spinner } from '@/components/ui';
import { useApp } from '@/lib/store/app';
import { OFFERS, formatMoney, type Currency, type Entitlements } from '@/lib/billing/plans';

/**
 * Offers & billing. Entitlements are SERVER-computed: the checkout screen is
 * decoration, and the plan only changes when a verified webhook event applies.
 * Until live payment credentials + launch approval exist, everything runs in
 * SANDBOX mode with an explicit provider simulator — clearly labelled.
 */

interface SandboxClaims {
  userId: string;
  token: string;
}

export default function PricingPage() {
  const { profile, isGuest } = useApp();
  const [currency, setCurrency] = useState<Currency>('USD');
  const [claims, setClaims] = useState<SandboxClaims | null>(null);
  const [sandbox, setSandbox] = useState<boolean | null>(null);
  const [ents, setEnts] = useState<Entitlements | null>(null);
  const [history, setHistory] = useState<{ eventId: string; type: string; at: string }[]>([]);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const userId = profile?.userId ?? 'guest';

  const auth = useMemo(async () => {
    const r = await fetch('/api/auth/sandbox-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: 'learner', orgId: null }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.ok ? ({ userId, token: j.token } as SandboxClaims) : null;
  }, [userId]);

  const refreshEntitlements = async (c: SandboxClaims | null) => {
    if (!c) return;
    const r = await fetch(`/api/billing/entitlements?userId=${encodeURIComponent(c.userId)}`, {
      headers: { authorization: `Bearer ${c.token}` },
    });
    if (r.ok) {
      const j = await r.json();
      setEnts(j.entitlements);
      setHistory(j.history ?? []);
    }
  };

  useEffect(() => {
    void (async () => {
      const c = await auth;
      setClaims(c);
      setSandbox(c !== null);
      await refreshEntitlements(c);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const checkout = async (offerId: string) => {
    if (!claims) return;
    setBusy(`co-${offerId}`);
    const r = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: claims.userId, offer: offerId, currency }),
    });
    const j = await r.json();
    setBusy(null);
    if (j.ok) setCheckoutId(j.checkout.id);
  };

  const notify = async (outcome: 'succeeded' | 'failed' | 'refunded' | 'cancelled') => {
    if (!checkoutId) return;
    setBusy(`n-${outcome}`);
    const r = await fetch('/api/billing/sandbox-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutId, outcome }),
    });
    const j = await r.json();
    if (j.ok && outcome === 'succeeded') track({ name: 'conversion', plan: 'prep' });
    if (j.ok && (outcome === 'cancelled' || outcome === 'refunded')) track({ name: 'cancellation', plan: 'prep' });
    setBusy(null);
    await refreshEntitlements(claims);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Plans</h1>
        <p className="mt-1 text-sm text-muted">
          AI allowances are sized from the measured delivery cost of an assessment — never “unlimited”.
        </p>
      </div>

      {sandbox === false && (
        <Card className="p-4 text-xs leading-relaxed text-muted">
          Sandbox identity unavailable (production mode): sign in to manage your subscription; entitlements always come from the billing service.
        </Card>
      )}
      {isGuest && sandbox !== false && (
        <Card className="p-4 text-xs leading-relaxed text-muted">
          You are in guest mode. Checkout works in sandbox; create an account to keep a subscription across devices.
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Chip active={currency === 'USD'} onClick={() => setCurrency('USD')}>USD $</Chip>
        <Chip active={currency === 'BDT'} onClick={() => setCurrency('BDT')}>BDT ৳ (Bangladesh)</Chip>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {OFFERS.map((o) => {
          const current = ents?.offer === o.id && ents.status === 'active';
          return (
            <Card key={o.id} className={`flex flex-col p-5 ${current ? 'border-brand/60 shadow-glow' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-extrabold text-ink">{o.name}</p>
                {current && <Badge tone="brand">current</Badge>}
              </div>
              <p className="mt-1 font-display text-2xl font-extrabold text-brand">
                {o.priceMonthly.usd === 0 ? 'Free' : formatMoney(o.priceMonthly.usd, currency)}
                {o.priceMonthly.usd > 0 && <span className="text-xs font-bold text-faint"> /month</span>}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{o.blurb}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted">
                {o.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {o.id !== 'free' && (
                <Button className="mt-4" variant={o.id === 'prep' ? 'primary' : 'secondary'} onClick={() => void checkout(o.id)} disabled={busy !== null}>
                  {busy === `co-${o.id}` ? <Spinner className="h-4 w-4" /> : null}
                  Checkout · sandbox
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {checkoutId && (
        <Card className="border-warn/40 p-4">
          <SectionTitle title="Sandbox provider simulator" hint="the provider calls our webhook — the client screen proves nothing" />
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Checkout <span className="font-bold text-ink">{checkoutId}</span> is pending. Simulate the provider outcome; entitlements change only if the signed webhook verifies and applies.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['succeeded', 'failed', 'refunded', 'cancelled'] as const).map((o) => (
              <Button key={o} size="sm" variant={o === 'succeeded' ? 'primary' : 'secondary'} onClick={() => void notify(o)} disabled={busy !== null}>
                {busy === `n-${o}` ? <Spinner className="h-3.5 w-3.5" /> : null} provider: {o}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {ents && (
        <Card className="p-5">
          <SectionTitle title="Your entitlements" hint="computed by the server, never by this page" />
          <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface2 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-faint">plan</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{ents.offer}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-faint">status</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{ents.status}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-faint">AI assessments / mo</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{ents.aiAssessmentsPerMonth.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface2 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-faint">teacher tools</p>
              <p className="mt-1 text-sm font-extrabold text-ink">{ents.teacherTools ? 'yes' : 'no'}</p>
            </div>
          </div>
          {history.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Billing history</p>
              <ul className="mt-1 space-y-1 text-[11px] text-muted">
                {history.slice(0, 8).map((h) => (
                  <li key={h.eventId}>{new Date(h.at).toLocaleString()} · {h.type}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
