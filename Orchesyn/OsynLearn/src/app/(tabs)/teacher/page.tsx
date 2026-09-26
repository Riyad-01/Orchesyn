'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, UserPlus, ClipboardList } from 'lucide-react';
import { Badge, Button, Card, SectionTitle, Spinner } from '@/components/ui';

/**
 * Teacher workspace (sandbox): invite learners, assign activities, review
 * submissions, override feedback with an immutable audit trail, monitor the
 * class. Every call goes through the server's authorisation + org isolation —
 * the page renders whatever the server allows, nothing more.
 */

interface Row {
  learnerId: string;
  submissions: number;
  assigned: number;
  lastAt: string | null;
}

interface Submission {
  id: string;
  learnerId: string;
  lessonId: string;
  text: string;
  at: string;
}

export default function TeacherPage() {
  const [token, setToken] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [overrides, setOverrides] = useState<{ id: string; submissionId: string; teacherId: string; note: string; at: string }[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; learnerId: string; lessonId: string }[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(true);

  const call = useCallback(
    async (body: Record<string, unknown>, tk?: string | null) => {
      const r = await fetch('/api/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tk || token ? { authorization: `Bearer ${tk ?? token}` } : {}) },
        body: JSON.stringify(body),
      });
      return (await r.json()) as { ok: boolean; [k: string]: unknown };
    },
    [token],
  );

  useEffect(() => {
    void (async () => {
      const t = await fetch('/api/auth/sandbox-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'teacher-demo', role: 'teacher', orgId: null }),
      }).then((r) => r.json());
      if (!t.ok) {
        setSandbox(false);
        return;
      }
      setToken(t.token);
      const org = await fetch('/api/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${t.token}` },
        body: JSON.stringify({ action: 'ensure-org', name: 'Demo class' }),
      }).then((r) => r.json());
      if (org.ok) setOrgId(org.orgId);
    })();
  }, []);

  const refresh = async () => {
    const [p, s] = await Promise.all([call({ action: 'class-progress' }), call({ action: 'list-submissions' })]);
    if (p.ok) {
      setRows(p.rows as Row[]);
      setAssignments(p.assignments as never);
      setOverrides(p.overrides as never);
    }
    if (s.ok) setSubs(s.submissions as Submission[]);
  };

  useEffect(() => {
    if (token && orgId) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId]);

  const makeInvite = async () => {
    const j = await call({ action: 'invite' });
    if (j.ok) setInvite(j.code as string);
  };

  const assign = async (learnerId: string, lessonId: string) => {
    setBusy('assign');
    await call({ action: 'assign', learnerId, lessonId });
    setBusy(null);
    await refresh();
  };

  const override = async () => {
    if (!selected || !note.trim()) return;
    setBusy('override');
    await call({ action: 'override-feedback', submissionId: selected.id, note: note.trim(), previousFeedback: 'AI feedback (provisional)' });
    setBusy(null);
    setNote('');
    setSelected(null);
    await refresh();
  };

  const runDemoLearner = async () => {
    if (!invite) return;
    setBusy('demo');
    const lt = await fetch('/api/auth/sandbox-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: `learner-demo-${Math.floor(Math.random() * 999)}`, role: 'learner', orgId: null }),
    }).then((r) => r.json());
    if (lt.ok) {
      await call({ action: 'accept-invite', code: invite }, lt.token);
      await call(
        { action: 'submit', lessonId: 'W3', text: 'The chart shows car ownership rising in every country between 1990 and 2010, with Portugal growing fastest from the lowest base.' },
        lt.token,
      );
    }
    setBusy(null);
    await refresh();
  };

  if (!sandbox) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-sm text-muted">
        The teacher workspace requires a signed-in teacher account. In production this is your Supabase identity; the sandbox minting endpoint is disabled here.
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <GraduationCap className="h-6 w-6 text-brand" /> Teacher workspace
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sandbox identity <span className="font-bold text-ink">teacher-demo</span> · org <span className="font-bold text-ink">{orgId ?? '…'}</span>. Learner data is visible only inside your org.
        </p>
      </div>

      <Card className="p-5">
        <SectionTitle title="Invite learners" hint="share the code; learners join with their own account" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => void makeInvite()}>Create invite code</Button>
          {invite && <Badge tone="good">{invite}</Badge>}
          {invite && (
            <Button variant="secondary" onClick={() => void runDemoLearner()} disabled={busy === 'demo'}>
              {busy === 'demo' ? <Spinner className="h-4 w-4" /> : null} Sandbox: join + submit as demo learner
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Class progress" hint="server-authorised view of your org only" />
        <div className="mt-3 space-y-2">
          {rows.length === 0 && <p className="text-xs text-faint">No learners yet — create an invite and share the code.</p>}
          {rows.map((r) => (
            <div key={r.learnerId} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface2 p-3">
              <p className="text-xs font-bold text-ink">{r.learnerId}</p>
              <p className="text-[11px] text-faint">{r.submissions} submission(s) · {r.assigned} assigned</p>
              <select
                className="ml-auto rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink outline-none"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) void assign(r.learnerId, e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">assign activity…</option>
                {['L1', 'R1', 'W1', 'W3', 'S1', 'S3', 'V1', 'G1'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {assignments.length > 0 && (
          <p className="mt-2 text-[11px] text-faint">{assignments.length} assignment(s) issued · audit below includes {overrides.length} override(s).</p>
        )}
      </Card>

      <Card className="p-5">
        <SectionTitle title="Submissions" hint="review and, where needed, override AI feedback — audited" />
        <div className="mt-3 space-y-2">
          {subs.length === 0 && <p className="text-xs text-faint">Nothing submitted yet.</p>}
          {subs.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)} className="tap block w-full rounded-xl border border-line bg-surface2 p-3 text-left">
              <p className="text-xs font-bold text-ink">{s.learnerId} · {s.lessonId}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted">{s.text}</p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 rounded-xl border border-brand/40 bg-surface2 p-4">
            <p className="text-xs font-bold text-ink">Reviewing {selected.learnerId} · {selected.lessonId}</p>
            <p className="mt-1 max-h-32 overflow-y-auto text-[11px] leading-relaxed text-muted">{selected.text}</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Your feedback (overrides the AI feedback; the override is recorded in the audit trail)" className="mt-2 w-full rounded-xl border border-line bg-surface p-2 text-xs text-ink outline-none focus:border-brand/60" />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => void override()} disabled={busy === 'override' || !note.trim()}>
                {busy === 'override' ? <Spinner className="h-3.5 w-3.5" /> : null} Save override
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {overrides.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand"><ClipboardList className="h-3.5 w-3.5" /> Audit trail (immutable)</p>
            <ul className="mt-1 space-y-1 text-[11px] text-muted">
              {overrides.map((o) => (
                <li key={o.id}>{new Date(o.at).toLocaleString()} · {o.teacherId} overrode feedback on {o.submissionId}: “{o.note.slice(0, 80)}”</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
