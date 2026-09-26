'use client';

import { useMemo, useState } from 'react';
import { FlaskConical, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';
import { EVAL_SET_V1, EVAL_SET_VERSION } from '@/lib/eval/set.v1';
import {
  consistency,
  disagreements,
  runEvalSet,
  subgroupAnalysis,
  type HumanRating,
} from '@/lib/eval/runner';
import { validateAssessment } from '@/lib/ai/managed';
import { usageLedger, usageTotals } from '@/lib/ai/managedClient';

/**
 * Assessment quality console.
 *  1. deterministic pipeline evaluation (versioned set) — always runnable;
 *  2. qualified human rating workflow with disagreement review, blind-duplicate
 *     consistency and subgroup analysis;
 *  3. managed-AI usage, latency and cost;
 *  4. the honest limitations list.
 */

const RATINGS_KEY = 'stim:eval-ratings';

function loadRatings(): HumanRating[] {
  try {
    return JSON.parse(window.localStorage.getItem(RATINGS_KEY) ?? '[]') as HumanRating[];
  } catch {
    return [];
  }
}

const WRITING_CRIT = ['c1', 'cc', 'lr', 'gra'] as const;
const SPEAKING_CRIT = ['fc', 'lr', 'gra', 'pr'] as const;

export default function EvalPage() {
  const results = useMemo(() => runEvalSet(), []);
  const aiByCase = useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    for (const c of EVAL_SET_V1) {
      if (!c.simulatedModelOutput) continue;
      const v = validateAssessment(c.simulatedModelOutput, c.text, { kind: c.skill, typed: c.typed });
      if (v) map[c.id] = v.bands;
    }
    return map;
  }, []);

  const [ratings, setRatings] = useState<HumanRating[]>(() => loadRatings());
  const [caseId, setCaseId] = useState(EVAL_SET_V1[0].id);
  const [reviewer, setReviewer] = useState('');
  const [qualified, setQualified] = useState(false);
  const [blindDup, setBlindDup] = useState(false);
  const [bands, setBands] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const active = EVAL_SET_V1.find((c) => c.id === caseId)!;
  const crits = active.skill === 'writing' ? WRITING_CRIT : SPEAKING_CRIT;

  const submitRating = () => {
    if (!reviewer.trim()) return;
    const parsed: Record<string, number | null> = {};
    for (const k of crits) parsed[k] = bands[k]?.trim() ? Math.round(Number(bands[k]) * 2) / 2 : null;
    const prevForCase = ratings.filter((r) => r.caseId === caseId);
    const rating: HumanRating = {
      caseId,
      reviewer: reviewer.trim(),
      qualified,
      bands: parsed,
      notes: notes.trim() || undefined,
      at: Date.now(),
      duplicateOf: blindDup && prevForCase.length ? prevForCase[0].caseId : undefined,
    };
    const next = [rating, ...ratings].slice(0, 200);
    setRatings(next);
    window.localStorage.setItem(RATINGS_KEY, JSON.stringify(next));
    setBands({});
    setNotes('');
  };

  const allDisagreements = useMemo(
    () => ratings.flatMap((r) => disagreements(aiByCase[r.caseId] ?? {}, r)),
    [ratings, aiByCase],
  );
  const consist = useMemo(() => consistency(ratings, aiByCase), [ratings, aiByCase]);
  const subgroups = useMemo(() => subgroupAnalysis(ratings, aiByCase, (id) => EVAL_SET_V1.find((c) => c.id === id)?.kind ?? 'other'), [ratings, aiByCase]);
  const usage = usageTotals();
  const ledger = usageLedger().slice(0, 8);

  const totalChecks = results.reduce((a, r) => a + r.checks.length, 0);
  const passedChecks = results.reduce((a, r) => a + r.checks.filter((c) => c.pass).length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <FlaskConical className="h-6 w-6 text-brand" /> Assessment quality
        </h1>
        <p className="mt-1 text-sm text-muted">
          Versioned evaluation set, qualified human ratings and honest limits. Learner submissions are treated as untrusted input everywhere.
        </p>
      </div>

      {/* 1 — pipeline evaluation */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Pipeline evaluation" hint={EVAL_SET_VERSION} />
          <Badge tone={passedChecks === totalChecks ? 'good' : 'bad'}>{passedChecks}/{totalChecks} checks</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          Verifies the deterministic layers only: sufficiency gates, copied-text flags, injection fencing, clamping, verbatim evidence and the
          typed-input rule. Live model judgement is NOT verified here — it needs the managed provider plus qualified reviewers below.
        </p>
        <div className="mt-3 space-y-2">
          {results.map((r) => (
            <details key={r.id} className="rounded-xl border border-line bg-surface2 p-3">
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-bold text-ink">
                <span>{r.id} <span className="text-faint">· {r.skill} · {r.kind}</span></span>
                <Badge tone={r.pass ? 'good' : 'bad'}>{r.pass ? 'pass' : 'fail'}</Badge>
              </summary>
              <ul className="mt-2 space-y-1 text-[11px] text-muted">
                {r.checks.map((c) => (
                  <li key={c.name} className="flex items-start gap-1.5">
                    <span className={c.pass ? 'text-good' : 'text-bad'}>{c.pass ? '✓' : '✗'}</span>
                    <span>{c.name} — {c.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </Card>

      {/* 2 — human ratings */}
      <Card className="p-5">
        <SectionTitle title="Qualified human rating" hint="examiner-trained reviewers only" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Case</span>
            <select value={caseId} onChange={(e) => { setCaseId(e.target.value); setBands({}); }} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60">
              {EVAL_SET_V1.map((c) => (
                <option key={c.id} value={c.id}>{c.id} · {c.kind}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Reviewer</span>
            <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="name / ID" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60" />
          </label>
        </div>
        <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-line rounded-xl border border-line bg-surface2 p-3 text-xs leading-relaxed text-muted">{active.text || '(silent submission)'}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {crits.map((k) => (
            <label key={k} className="block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-faint">{k}</span>
              <input value={bands[k] ?? ''} onChange={(e) => setBands((b) => ({ ...b, [k]: e.target.value }))} placeholder="–" inputMode="decimal" className="mt-1 w-full rounded-xl border border-line bg-surface px-2 py-2 text-center text-sm text-ink outline-none focus:border-brand/60" />
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-muted">
          <label className="flex items-center gap-2"><input type="checkbox" checked={qualified} onChange={(e) => setQualified(e.target.checked)} /> I am examiner-trained / certified</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={blindDup} onChange={(e) => setBlindDup(e.target.checked)} /> Blind duplicate (consistency)</label>
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="rating notes (optional)" className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brand/60" />
        <Button className="mt-3" onClick={submitRating} disabled={!reviewer.trim()}>
          <Users className="h-4 w-4" /> Submit rating
        </Button>

        {ratings.length > 0 && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Disagreement review (|Δ| ≥ 1 band vs AI)</p>
              {allDisagreements.length === 0 ? (
                <p className="mt-1 text-[11px] text-faint">No disagreements of a full band or more yet.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-[11px] text-muted">
                  {allDisagreements.map((d, i) => (
                    <li key={i}>case {d.caseId} · {d.criterion}: AI {d.ai.toFixed(1)} vs human {d.human.toFixed(1)} (Δ {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}) → review</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand">Scoring consistency</p>
                <p className="mt-1 text-[11px] text-muted">
                  {consist.pairs === 0 ? 'No blind duplicates yet — tick “Blind duplicate” when re-rating a case.' : `${consist.pairs} criterion pairs · mean |Δ| ${consist.meanAbsDiff?.toFixed(2)} bands`}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand">Subgroup analysis</p>
                {subgroups.length === 0 ? (
                  <p className="mt-1 text-[11px] text-faint">Ratings will break down by submission kind here.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-[11px] text-muted">
                    {subgroups.map((s) => (
                      <li key={s.group}>{s.group}: {s.ratings} rating(s){s.meanHumanMinusAi !== null ? ` · human−AI ${s.meanHumanMinusAi > 0 ? '+' : ''}${s.meanHumanMinusAi.toFixed(1)}` : ''}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3 — usage / cost / latency */}
      <Card className="p-5">
        <SectionTitle title="Managed AI usage" hint="measured, never estimated from vibes" />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-line bg-surface2 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-faint">calls</p>
            <p className="mt-1 font-display text-lg font-extrabold text-ink">{usage.calls}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface2 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-faint">est. cost</p>
            <p className="mt-1 font-display text-lg font-extrabold text-ink">${usage.costUsd.toFixed(4)}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface2 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-faint">avg latency</p>
            <p className="mt-1 font-display text-lg font-extrabold text-ink">{usage.avgLatencyMs}ms</p>
          </div>
        </div>
        {ledger.length > 0 && (
          <ul className="mt-3 space-y-1 text-[11px] text-muted">
            {ledger.map((m, i) => (
              <li key={i}>{m.engine} · {m.model} · {m.latencyMs}ms · ${m.costUsd?.toFixed(5) ?? '—'} · retries {m.retries}</li>
            ))}
          </ul>
        )}
      </Card>

      {/* 4 — limitations */}
      <Card className="border-warn/30 p-5">
        <SectionTitle title="Limitations — read before trusting any number" />
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-muted">
          <li>All band values are <span className="font-bold text-ink">estimates</span>; no official-accuracy claim is made or validated yet.</li>
          <li>Managed AI requires server-side credentials (OSYN_AI_* env vars). Static hosting without them runs on-device provisional feedback only.</li>
          <li>Live model judgement is unverified until qualified human ratings exist; the pipeline checks above cover deterministic layers only.</li>
          <li>Pronunciation is never scored from a transcript or a typed answer — expect “insufficient evidence” without real audio prosody.</li>
          <li>Local pronunciation flags are heuristics (ASR confidence + syllable timing), not phoneme-level measurement.</li>
          <li>Accent variation is treated as fair by policy; intelligibility is the criterion — report any case where the pipeline punishes accent.</li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-faint">
          <ShieldCheck className="h-3.5 w-3.5" /> Full report: LIMITATIONS.md in the repository root.
        </p>
      </Card>
    </div>
  );
}
