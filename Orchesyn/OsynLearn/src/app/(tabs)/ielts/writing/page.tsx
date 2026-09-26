'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, PenLine, RefreshCw, Sparkles } from 'lucide-react';
import { WRITING_TASKS, type WritingTask } from '@/lib/data/ielts-receptive';
import { examineWriting, type WritingReport } from '@/lib/insights/ielts-writing';
import { Badge, Button, Card, Chip, ScoreRing, SectionTitle, Spinner } from '@/components/ui';
import { useApp } from '@/lib/store/app';
import {
  assessWritingManaged,
  getManagedStatus,
  pendingAssessments,
  queueAssessment,
  retryPending,
} from '@/lib/ai/managedClient';
import {
  combineWritingOverall,
  exerciseForCriterion,
  OVERLAP_FLAG_THRESHOLD,
  singleTaskOverall,
  textOverlap,
  type AssessmentMeta,
} from '@/lib/ai/managed';

/**
 * IELTS Writing — three honest tiers of judgement:
 *   1. Managed AI assessment (server credentials) — criteria-aligned, evidence-linked.
 *   2. AI examiner with the learner's own key (Settings) — same, via their account.
 *   3. Local provisional estimate — labelled, never disguised as an examiner.
 * Task 1 reports Task Achievement; Task 2 reports Task Response. A combined
 * writing band, when both exist, weights Task 2 double — as the exam does.
 * Rewrites that mostly repeat a previous attempt are flagged: improvement on
 * the same text is practice, not new evidence.
 */

const LS_KEY = 'osyn:ielts-writing';
const ATTEMPTS_KEY = 'stim:writing-attempts';

type Tier = 'managed' | 'user-key' | 'local';

interface Evidence {
  quote: string;
  correction?: string;
  why?: string;
}

interface ReportView {
  tier: Tier;
  bands: { ta: number; cc: number; lr: number; gra: number; overall: number };
  verdict: string;
  fixes: Evidence[];
  evidence: Evidence[];
  strengths: string[];
  improvements: string[];
  model: string | null;
  meta?: AssessmentMeta;
  exercise?: { lessonId: string; label: string };
  insufficient: string[];
}

interface SavedReport extends ReportView {
  taskId: string;
  taskTitle: string;
  taskType: 1 | 2;
  at: number;
}

interface Attempt {
  taskId: string;
  text: string;
  bands: SavedReport['bands'];
  at: number;
}

function loadRecent(): SavedReport[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? '[]') as SavedReport[];
  } catch {
    return [];
  }
}

function loadAttempts(): Attempt[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(ATTEMPTS_KEY) ?? '[]') as Attempt[];
  } catch {
    return [];
  }
}

const TIER_LABEL: Record<Tier, string> = {
  managed: 'Managed AI assessment · estimate',
  'user-key': 'AI examiner (your key) · estimate',
  local: 'Local provisional estimate — not an examiner',
};

export default function IeltsWritingPage() {
  const { profile, toast } = useApp();
  const [taskFilter, setTaskFilter] = useState<'all' | '1' | '2'>('all');
  const [task, setTask] = useState<WritingTask | null>(null);
  const [essay, setEssay] = useState('');
  const [view, setView] = useState<ReportView | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [attemptInfo, setAttemptInfo] = useState<{ overlap: number; prev: Attempt | null; delta: Partial<Record<keyof SavedReport['bands'], number>> } | null>(null);
  const [recent, setRecent] = useState<SavedReport[]>([]);
  const [pending, setPending] = useState(pendingAssessments().filter((p) => p.kind === 'writing'));
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => setRecent(loadRecent()), []);

  /* autosave: drafts survive reloads and crashes; restoring is explicit */
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    if (!task) return;
    setDraftRestored(false);
    try {
      const draft = window.localStorage.getItem(`stim:writing-draft:${task.id}`);
      if (draft && draft.trim() && !essay.trim()) {
        setEssay(draft);
        setDraftRestored(true);
      }
    } catch { /* fine */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);
  useEffect(() => {
    if (!task || !essay) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(`stim:writing-draft:${task.id}`, essay);
      } catch { /* fine */ }
    }, 600);
    return () => clearTimeout(t);
  }, [essay, task]);

  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  const combined = useMemo(() => {
    const t1 = recent.find((r) => r.taskType === 1);
    const t2 = recent.find((r) => r.taskType === 2);
    const both = combineWritingOverall(t1?.bands.overall ?? null, t2?.bands.overall ?? null);
    return { t1: t1?.bands.overall ?? null, t2: t2?.bands.overall ?? null, both };
  }, [recent]);

  const submit = async () => {
    if (!task || words < 20) return;
    setBusy(true);
    setNotice(null);
    const payload = {
      taskType: task.task,
      module: profile?.ieltsModule ?? 'academic',
      prompt: task.prompt,
      text: essay,
      contentVersion: `${task.id}:v1`,
    };

    let next: ReportView | null = null;
    const status = await getManagedStatus();
    if (status.configured) {
      const r = await assessWritingManaged(payload);
      if (r.ok && r.assessment && r.meta) {
        const b = r.assessment.bands;
        next = {
          tier: 'managed',
          bands: {
            ta: b.c1 ?? 0,
            cc: b.cc ?? 0,
            lr: b.lr ?? 0,
            gra: b.gra ?? 0,
            overall: singleTaskOverall([b.c1, b.cc, b.lr, b.gra]) ?? 0,
          },
          verdict: 'Band values are estimates from a managed AI examiner.',
          fixes: [],
          evidence: r.assessment.evidence.map((e) => ({ quote: e.quote, why: e.comment })),
          strengths: [],
          improvements: r.assessment.improvements,
          model: r.meta.model,
          meta: r.meta,
          exercise: exerciseForCriterion('writing', r.assessment.exercise),
          insufficient: r.assessment.insufficientEvidence,
        };
      } else {
        // Work preserved + queued; explain the limitation honestly.
        queueAssessment('writing', payload, r.reason ?? 'error', essay.slice(0, 80));
        setNotice(`Managed assessment unavailable (${r.reason ?? 'error'}) — your essay is saved and queued for retry. Showing the on-device provisional estimate instead.`);
        setPending(pendingAssessments().filter((p) => p.kind === 'writing'));
      }
    }

    if (!next) {
      const r: WritingReport = await examineWriting(task, essay);
      next = {
        tier: r.model ? 'user-key' : 'local',
        bands: r.bands,
        verdict: r.verdict,
        fixes: r.fixes.map((f) => ({ quote: f.quote, correction: f.correction, why: f.why })),
        evidence: [],
        strengths: r.strengths,
        improvements: r.tips,
        model: r.model,
        exercise: r.model ? undefined : exerciseForCriterion('writing', null),
        insufficient: [],
      };
    }

    // before/after honesty: compare with this task's previous attempt
    const attempts = loadAttempts();
    const prev = attempts.find((a) => a.taskId === task.id) ?? null;
    const overlap = prev ? textOverlap(prev.text, essay) : 0;
    const delta: Partial<Record<keyof SavedReport['bands'], number>> = {};
    if (prev) {
      (Object.keys(next.bands) as (keyof SavedReport['bands'])[]).forEach((k) => {
        delta[k] = Math.round((next!.bands[k] - prev.bands[k]) * 10) / 10;
      });
    }
    setAttemptInfo({ overlap, prev, delta });
    window.localStorage.setItem(
      ATTEMPTS_KEY,
      JSON.stringify([{ taskId: task.id, text: essay, bands: next.bands, at: Date.now() }, ...attempts.filter((a) => a.taskId !== task.id)].slice(0, 20)),
    );

    const saved: SavedReport = { ...next, taskId: task.id, taskTitle: task.title, taskType: task.task, at: Date.now() };
    const list = [saved, ...loadRecent()].slice(0, 5);
    window.localStorage.setItem(LS_KEY, JSON.stringify(list));
    setRecent(list);
    setView(next);
    setBusy(false);
    setDraftRestored(false);
    try {
      window.localStorage.removeItem(`stim:writing-draft:${task.id}`);
    } catch { /* fine */ }
  };

  const retry = async (id: string) => {
    setRetrying(id);
    const { done, result } = await retryPending(id);
    setRetrying(null);
    setPending(pendingAssessments().filter((p) => p.kind === 'writing'));
    toast(
      done && result.ok
        ? { tone: 'success', title: 'Queued assessment completed', body: 'The managed examiner finished your saved essay — see Recent reports.' }
        : { tone: 'warn', title: 'Still unavailable', body: `The managed service could not assess it yet (${result.reason}). It stays queued.` },
    );
    if (done && result.ok) setRecent(loadRecent());
  };

  const criteria = (taskType: 1 | 2) => [
    { key: 'ta' as const, name: taskType === 1 ? 'Task Achievement' : 'Task Response', hint: taskType === 1 ? 'Covers the data/letter requirements?' : 'Position + developed ideas?' },
    { key: 'cc' as const, name: 'Coherence & Cohesion', hint: 'Paragraphs, flow, linking words' },
    { key: 'lr' as const, name: 'Lexical Resource', hint: 'Vocabulary range and precision' },
    { key: 'gra' as const, name: 'Grammar Range & Accuracy', hint: 'Sentence variety, error control' },
  ];

  /* ------------------------- task view ------------------------- */
  if (task) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button onClick={() => { setTask(null); setView(null); setEssay(''); setAttemptInfo(null); }} className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> back to tasks
        </button>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="brand">Task {task.task} · aim {task.minutes} min</Badge>
            <Badge tone={words >= task.minWords ? 'good' : 'mid'}>
              {words}/{task.minWords} words
            </Badge>
          </div>
          <h2 className="mt-3 font-display text-base font-extrabold text-ink">{task.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/90">{task.prompt}</p>
          <details className="mt-3 rounded-xl border border-line bg-surface2 p-3">
            <summary className="cursor-pointer text-xs font-bold text-brand">
              {task.task === 1 ? 'Data to report (open to check)' : 'Planning hints'}
            </summary>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-muted">
              {task.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </details>
        </Card>

        {pending.length > 0 && (
          <Card className="p-4">
            <SectionTitle title="Queued for retry" hint="saved when the managed service failed" />
            <div className="mt-2 space-y-2">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink">“{p.preview}…”</p>
                    <p className="text-[11px] text-faint">failed: {p.failedReason} · attempts {p.attempts}</p>
                  </div>
                  <Button variant="secondary" onClick={() => void retry(p.id)} disabled={retrying === p.id}>
                    {retrying === p.id ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Retry
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!view ? (
          <>
            {draftRestored && (
              <p className="rounded-xl border border-good/40 bg-good/10 p-2 text-[11px] font-bold text-good">
                Draft restored from autosave — your unsent answer survived the reload.
              </p>
            )}
            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              rows={12}
              placeholder={task.task === 1 ? 'The table compares…' : 'Write your essay here — introduction, two body paragraphs and a conclusion.'}
              className="w-full rounded-2xl border border-line bg-surface2 p-4 text-sm leading-relaxed text-ink outline-none focus:border-brand/60"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-faint">
                {words < 20 ? 'Write at least 20 words to get a report.' : 'Tip: write like the exam — no spell-checker here.'}
              </p>
              <Button onClick={submit} disabled={busy || words < 20}>
                {busy ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                {busy ? 'Examining…' : 'Get examiner report'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {notice && (
              <Card className="border-warn/40 p-4 text-xs leading-relaxed text-warn">{notice}</Card>
            )}

            {attemptInfo?.prev && (
              <Card className="p-4">
                <SectionTitle title="Before → after" hint="vs your previous attempt on this task" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(attemptInfo.delta) as (keyof SavedReport['bands'])[]).map((k) => {
                    const d = attemptInfo.delta[k] ?? 0;
                    return (
                      <span key={k} className={`rounded-lg px-2 py-1 text-[11px] font-bold ${d > 0 ? 'bg-good/15 text-good' : d < 0 ? 'bg-bad/15 text-bad' : 'bg-surface2 text-muted'}`}>
                        {k} {d > 0 ? '+' : ''}{d.toFixed(1)}
                      </span>
                    );
                  })}
                </div>
                {attemptInfo.overlap >= OVERLAP_FLAG_THRESHOLD ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-warn">
                    This attempt overlaps {Math.round(attemptInfo.overlap * 100)}% with your previous one — score movement here is practice, not new evidence. Change structure and ideas, not just words, or try a different prompt.
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-faint">Low overlap with your last attempt — this counts as fresh evidence.</p>
                )}
              </Card>
            )}

            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
                <ScoreRing score={Math.round((view.bands.overall / 9) * 100)} size={96} stroke={9} label={view.bands.overall.toFixed(1)} />
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Overall Band {view.bands.overall.toFixed(1)} <span className="text-xs font-bold text-faint">(estimate)</span></p>
                  <p className="text-sm text-muted">{view.verdict}</p>
                  <p className="mt-1 text-[11px] text-faint">{TIER_LABEL[view.tier]}{view.meta ? ` · ${view.meta.model} · ${(view.meta.latencyMs / 1000).toFixed(1)}s` : ''}</p>
                </div>
              </div>
              {combined.both !== null && (
                <p className="mt-3 rounded-xl bg-surface2 p-2 text-center text-[11px] font-bold text-muted">
                  Combined writing band {combined.both.toFixed(1)} (Task 1 {combined.t1?.toFixed(1)} + Task 2 {combined.t2?.toFixed(1)}, weighted ×2 as in the exam)
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {criteria(task.task).map((c) => (
                  <div key={c.key} className="rounded-xl border border-line bg-surface2 p-3 text-center" title={c.hint}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{c.name}</p>
                    <p className="mt-1 font-display text-lg font-extrabold text-brand">{view.bands[c.key].toFixed(1)}</p>
                  </div>
                ))}
              </div>
            </Card>

            {view.evidence.length > 0 && (
              <Card className="p-5">
                <SectionTitle title="Examiner evidence" hint="quoted verbatim from your answer" />
                <div className="mt-2 space-y-2">
                  {view.evidence.map((f, i) => (
                    <div key={i} className="rounded-xl border border-line bg-surface2 p-3 text-sm">
                      <p className="font-semibold text-ink">“{f.quote}”</p>
                      {f.why ? <p className="mt-1 text-xs text-muted">{f.why}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {view.fixes.length > 0 && (
              <Card className="p-5">
                <SectionTitle title="Fix these first" hint="verbatim from your answer" />
                <div className="mt-2 space-y-2">
                  {view.fixes.map((f, i) => (
                    <div key={i} className="rounded-xl border border-line bg-surface2 p-3 text-sm">
                      <p className="text-bad line-through decoration-bad/50">“{f.quote}”</p>
                      {f.correction ? <p className="mt-1 font-semibold text-good">“{f.correction}”</p> : null}
                      {f.why ? <p className="mt-1 text-xs text-muted">{f.why}</p> : null}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {view.improvements.length > 0 && (
              <Card className="p-5 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-brand">Prioritised improvements</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 text-muted">
                  {view.improvements.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
                {view.exercise && (
                  <Link href={`/lesson?id=${view.exercise.lessonId}`} className="tap mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-extrabold text-white">
                    <Sparkles className="h-4 w-4" /> Targeted exercise: {view.exercise.label} →
                  </Link>
                )}
              </Card>
            )}

            {view.strengths.length > 0 && (
              <Card className="p-5 text-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-good">Keep doing</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted">
                  {view.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Card>
            )}

            <details className="rounded-2xl border border-line bg-surface2 p-4">
              <summary className="cursor-pointer text-xs font-bold text-brand">Read a band-8+ model answer</summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{task.model}</p>
            </details>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setView(null)}>
                <PenLine className="h-4 w-4" /> Rewrite with this feedback
              </Button>
              <Link href="/ielts/"><Button variant="ghost"><ArrowRight className="h-4 w-4 rotate-180" /> IELTS hub</Button></Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------- list view ------------------------- */
  const tasks = WRITING_TASKS.filter((t) => taskFilter === 'all' || String(t.task) === taskFilter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <FileText className="h-6 w-6 text-brand" /> IELTS Writing
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real exam prompts with a four-criteria report — Task Achievement (Task 1) or Task Response (Task 2), Coherence,
          Vocabulary and Grammar — verbatim evidence, prioritised fixes and a model answer.
        </p>
      </div>

      {combined.both !== null && (
        <Card className="p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-faint">Combined writing estimate (Task 2 ×2)</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand">{combined.both.toFixed(1)}</p>
          <p className="text-[11px] text-faint">from your latest Task 1 ({combined.t1?.toFixed(1)}) and Task 2 ({combined.t2?.toFixed(1)})</p>
        </Card>
      )}

      <div className="flex gap-2">
        <Chip active={taskFilter === 'all'} onClick={() => setTaskFilter('all')}>All tasks</Chip>
        <Chip active={taskFilter === '1'} onClick={() => setTaskFilter('1')}>Task 1 · reports</Chip>
        <Chip active={taskFilter === '2'} onClick={() => setTaskFilter('2')}>Task 2 · essays</Chip>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tasks.map((t) => (
          <button key={t.id} onClick={() => setTask(t)} className="tap card p-5 text-left hover:border-brand/40">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Task {t.task} · {t.minutes} min · {t.minWords}+ words
            </p>
            <h3 className="mt-1 text-sm font-extrabold text-ink">{t.title}</h3>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{t.prompt}</p>
          </button>
        ))}
      </div>

      {recent.length > 0 ? (
        <div>
          <SectionTitle title="Recent reports" hint="stored on this device" />
          <div className="space-y-2">
            {recent.map((r) => (
              <Card key={r.at} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-xs font-bold text-ink">{r.taskTitle}</p>
                  <p className="text-[11px] text-faint">
                    {new Date(r.at).toLocaleString()} · {TIER_LABEL[r.tier].split('·')[0]}
                  </p>
                </div>
                <ScoreRing score={Math.round((r.bands.overall / 9) * 100)} size={44} stroke={5} label={r.bands.overall.toFixed(1)} />
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
