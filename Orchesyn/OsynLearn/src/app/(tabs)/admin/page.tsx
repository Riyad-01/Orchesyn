'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Search } from 'lucide-react';
import { Button, Card, SectionTitle } from '@/components/ui';
import { readEvents, summarise } from '@/lib/analytics';
import { usageTotals } from '@/lib/ai/managedClient';

/**
 * Platform administration (sandbox): billing visibility, org overview,
 * assessment-quality monitoring, support lookup (metadata only), usage
 * controls. Cross-org access requires platform_admin; the server enforces it.
 */

interface Overview {
  subscriptions: { userId: string; offer: string; status: string }[];
  checkouts: { id: string; userId: string; status: string }[];
  memberCounts: { orgId: string; name: string; members: number }[];
  ledger: { kind?: string; clientId?: string; latencyMs?: number; costUsd?: number; error?: string }[];
}

function AnalyticsPanel() {
  const [s, setS] = useState(() => summarise(readEvents()));
  const rows: [string, string][] = [
    ['Diagnostics completed', String(s.diagnosticsCompleted)],
    ['First corrected retries', String(s.firstCorrectedRetries)],
    ['Active minutes / days', `${s.activeMinutes} min · ${s.activeDays} d`],
    ['Week-1 retention', s.week1Retained == null ? 'window not elapsed' : s.week1Retained ? 'retained' : 'lapsed'],
    ['Week-4 retention', s.week4Retained == null ? 'window not elapsed' : s.week4Retained ? 'retained' : 'lapsed'],
    ['Conversions / cancellations', `${s.conversions} / ${s.cancellations}`],
    ['AI cost (¢ per active day)', String(s.aiCostCentsPerActiveDay)],
  ];
  return (
    <div className="mt-2">
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-line/50 last:border-0">
              <td className="py-1.5 text-muted">{k}</td>
              <td className="py-1.5 text-right font-bold text-ink">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button size="sm" variant="ghost" className="mt-2" onClick={() => setS(summarise(readEvents()))}>Refresh</Button>
      <p className="mt-1 text-[10px] text-faint">Counts from this browser only. Pilot export requires learner consent.</p>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [denied, setDenied] = useState(false);
  const [lookup, setLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);
  const usage = usageTotals();

  useEffect(() => {
    void (async () => {
      const t = await fetch('/api/auth/sandbox-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'platform-demo', role: 'platform_admin', orgId: null }),
      }).then((r) => r.json());
      if (!t.ok) {
        setDenied(true);
        return;
      }
      setToken(t.token);
      const o = await fetch('/api/admin?action=overview', { headers: { authorization: `Bearer ${t.token}` } }).then((r) => r.json());
      if (o.ok) setOverview(o);
      else setDenied(true);
    })();
  }, []);

  const doLookup = async () => {
    if (!token || !lookup.trim()) return;
    const r = await fetch(`/api/admin?action=support-lookup&userId=${encodeURIComponent(lookup.trim())}`, {
      headers: { authorization: `Bearer ${token}` },
    }).then((x) => x.json());
    setLookupResult(r.ok ? r : null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <ShieldAlert className="h-6 w-6 text-brand" /> Platform admin
        </h1>
        <p className="mt-1 text-sm text-muted">Metadata only. Learner content bodies never appear here.</p>
      </div>

      {denied && <Card className="p-4 text-xs text-muted">Admin requires the platform_admin role (server-enforced).</Card>}

      {overview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-5">
              <SectionTitle title="Billing visibility" />
              <ul className="mt-2 space-y-1 text-[11px] text-muted">
                {overview.subscriptions.length === 0 && <li>No subscriptions yet.</li>}
                {overview.subscriptions.map((s) => (
                  <li key={s.userId}>{s.userId} · {s.offer} · {s.status}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-faint">{overview.checkouts.length} checkout(s) · {usage.calls} managed call(s) · est ${usage.costUsd.toFixed(4)}</p>
            </Card>
            <Card className="p-5">
              <SectionTitle title="Organisations" />
              <ul className="mt-2 space-y-1 text-[11px] text-muted">
                {overview.memberCounts.length === 0 && <li>No orgs yet.</li>}
                {overview.memberCounts.map((o) => (
                  <li key={o.orgId}>{o.name} ({o.orgId}) · {o.members} member(s)</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-5">
            <SectionTitle title="Assessment quality monitor" hint="scrubbed ledger — client ids hashed" />
            <ul className="mt-2 space-y-1 text-[11px] text-muted">
              {overview.ledger.slice(-8).map((l, i) => (
                <li key={i}>{l.kind} · {l.clientId} · {l.latencyMs ?? '—'}ms · ${l.costUsd?.toFixed(5) ?? '—'}{l.error ? ` · ${l.error}` : ''}</li>
              ))}
              {overview.ledger.length === 0 && <li>No managed calls yet.</li>}
            </ul>
            <Link href="/eval" className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-extrabold text-white">Open evaluation console →</Link>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Pilot analytics (this device)" hint="on-device counts only — nothing is transmitted" />
            <AnalyticsPanel />
          </Card>

          <Card className="p-5">
            <SectionTitle title="Support lookup" hint="billing + memberships, never content" />
            <div className="mt-2 flex gap-2">
              <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="user id" className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-brand/60" />
              <Button size="sm" icon={<Search className="h-3.5 w-3.5" />} onClick={() => void doLookup()}>Lookup</Button>
            </div>
            {lookupResult && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-surface2 p-2 text-[10px] text-muted">{JSON.stringify(lookupResult, null, 2)}</pre>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
