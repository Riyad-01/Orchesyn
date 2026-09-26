'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic, RefreshCw, Sparkles } from 'lucide-react';
import type { FeedbackReport } from '@/types';
import { Badge, Button, Card, SectionTitle, Spinner } from '@/components/ui';
import { recordingFor } from '@/lib/ai/audio-bus';
import {
  assessSpeakingManaged,
  getManagedStatus,
  pendingAssessments,
  queueAssessment,
  retryPending,
} from '@/lib/ai/managedClient';
import { exerciseForCriterion, type AssessmentMeta, type ValidatedAssessment } from '@/lib/ai/managed';

/**
 * The completed-assessment half of a speaking report.
 *
 * The local engine above it is FAST PROVISIONAL feedback (objective, on-device).
 * This panel is the COMPLETED assessment: a managed AI examiner scoring the
 * four public IELTS speaking criteria, with evidence, three prioritised
 * improvements and a targeted exercise. Where evidence cannot support a
 * criterion (typed answer, silent/noisy recording, no audio) it says
 * "insufficient evidence" instead of inventing a number.
 */

const CRITERIA: { key: 'fc' | 'lr' | 'gra' | 'pr'; name: string }[] = [
  { key: 'fc', name: 'Fluency & Coherence' },
  { key: 'lr', name: 'Lexical Resource' },
  { key: 'gra', name: 'Grammatical Range & Accuracy' },
  { key: 'pr', name: 'Pronunciation (intelligibility)' },
];

export function ManagedAssessmentPanel({ report }: { report: FeedbackReport }) {
  const [status, setStatus] = useState<'loading' | 'unconfigured' | 'done' | 'failed'>('loading');
  const [assessment, setAssessment] = useState<ValidatedAssessment | null>(null);
  const [meta, setMeta] = useState<AssessmentMeta | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(pendingAssessments().filter((p) => p.kind === 'speaking'));
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setAudioUrl(recordingFor(report.sessionId));
    let cancelled = false;
    void (async () => {
      const st = await getManagedStatus();
      if (cancelled) return;
      if (!st.configured) {
        setStatus('unconfigured');
        return;
      }
      const payload = {
        mode: report.mode,
        transcript: report.transcript,
        typed: report.typedFallback,
        audioEvidence: !report.typedFallback && report.metrics.durationMs > 3000 && report.words.length > 0,
        features: {
          wpm: report.metrics.wpm,
          pauseCount: report.metrics.pauseCount,
          fillerCount: report.metrics.fillerCount,
          durationMs: report.metrics.durationMs,
        },
        words: report.words.slice(0, 2000).map((w) => ({ word: w.word, startMs: w.startMs })),
        contentVersion: `${report.mode}:v1`,
      };
      const r = await assessSpeakingManaged(payload);
      if (cancelled) return;
      if (r.ok && r.assessment && r.meta) {
        setAssessment(r.assessment);
        setMeta(r.meta);
        setStatus('done');
      } else {
        if (r.reason !== 'insufficient-evidence') {
          queueAssessment('speaking', payload, r.reason ?? 'error', report.transcript.slice(0, 80));
          setPending(pendingAssessments().filter((p) => p.kind === 'speaking'));
        }
        setFailReason(r.reason ?? 'error');
        setStatus('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report]);

  const retry = async () => {
    const item = pending[0];
    if (!item) return;
    setRetrying(true);
    const { done, result } = await retryPending(item.id);
    setRetrying(false);
    setPending(pendingAssessments().filter((p) => p.kind === 'speaking'));
    if (done && result.ok && result.assessment && result.meta) {
      setAssessment(result.assessment);
      setMeta(result.meta);
      setStatus('done');
    } else {
      setFailReason(result.reason ?? 'error');
    }
  };

  if (status === 'loading') {
    return (
      <Card className="flex items-center gap-3 p-4">
        <Spinner className="h-4 w-4 text-brand" />
        <p className="text-xs font-bold text-muted">Requesting completed assessment…</p>
      </Card>
    );
  }

  if (status === 'unconfigured') {
    return (
      <Card className="p-4">
        <SectionTitle title="Completed assessment" hint="managed AI examiner" />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          This deployment has no server-side AI credentials, so you are seeing the <span className="font-bold text-ink">fast provisional</span> on-device
          report above. Configure the managed engine (server environment variables) to unlock completed four-criteria assessments. See LIMITATIONS.md.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {audioUrl && (
        <Card className="p-4">
          <SectionTitle title="Your recording" hint="plays back only until the page is reloaded" />
          <audio controls src={audioUrl} className="mt-2 w-full" />
        </Card>
      )}

      {status === 'failed' && (
        <Card className="border-warn/40 p-4">
          <p className="text-xs leading-relaxed text-warn">
            Completed assessment unavailable ({failReason}). Your recording and transcript are safe — the provisional report above stands, and
            {pending.length > 0 ? ' the assessment is queued below for retry.' : ' try again later.'}
          </p>
          {pending.length > 0 && (
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => void retry()} disabled={retrying}>
              {retrying ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Retry assessment
            </Button>
          )}
        </Card>
      )}

      {assessment && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle title="Completed assessment" hint="managed AI examiner · four public IELTS criteria" />
            <Badge tone="brand">estimates</Badge>
          </div>
          <p className="mt-1 text-[11px] text-faint">
            {meta?.model} · prompt {meta?.promptVersion} · rubric {meta?.rubricVersion} · {(meta?.latencyMs ?? 0) >= 1000 ? `${((meta?.latencyMs ?? 0) / 1000).toFixed(1)}s` : `${meta?.latencyMs}ms`}
            {typeof meta?.costUsd === 'number' ? ` · $${meta.costUsd.toFixed(5)}` : ''} · band values are estimates, not official scores
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CRITERIA.map((c) => {
              const band = assessment.bands[c.key];
              return (
                <div key={c.key} className="rounded-xl border border-line bg-surface2 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{c.name}</p>
                  {band === null || band === undefined ? (
                    <p className="mt-1 text-[11px] font-bold text-faint">insufficient evidence</p>
                  ) : (
                    <p className="mt-1 font-display text-lg font-extrabold text-brand">{band.toFixed(1)}</p>
                  )}
                </div>
              );
            })}
          </div>

          {assessment.insufficientEvidence.length > 0 && (
            <p className="mt-2 text-[11px] leading-relaxed text-faint">
              Not scored: {assessment.insufficientEvidence.join('; ')}. {report.typedFallback ? 'Typed answers carry no speech evidence — pronunciation and fluency need a recording.' : ''}
            </p>
          )}

          {assessment.evidence.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Evidence from your answer</p>
              <div className="mt-2 space-y-2">
                {assessment.evidence.map((e, i) => (
                  <div key={i} className="rounded-xl border border-line bg-surface2 p-3 text-sm">
                    <p className="font-semibold text-ink">
                      “{e.quote}”{e.atSec !== null && <span className="ml-2 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">≈ {e.atSec}s</span>}
                    </p>
                    {e.comment && <p className="mt-1 text-xs text-muted">{e.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {assessment.improvements.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand">Three prioritised improvements</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-muted">
                {assessment.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {(() => {
              const ex = exerciseForCriterion('speaking', assessment.exercise);
              return (
                <Link href={`/lesson?id=${ex.lessonId}`} className="tap inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-extrabold text-white">
                  <Sparkles className="h-4 w-4" /> Targeted: {ex.label} →
                </Link>
              );
            })()}
            <Link href="/impromptu" className="tap inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface2 px-4 text-xs font-extrabold text-ink">
              <Mic className="h-4 w-4" /> Rerecord this answer
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
