'use client';

import { track } from '@/lib/analytics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BookOpen, Mic, Square, Timer } from 'lucide-react';
import { getMock, descriptorForBand } from '@/lib/data/ielts';
import type { IeltsQuestion, IeltsMockResult, FeedbackReport, SpeakingMode } from '@/types';
import { useApp } from '@/lib/store/app';
import { useRecorder, formatClock } from '@/hooks/use-recorder';
import { analyseSpeech, ieltsCriteria, scoreToBand } from '@/lib/scoring';
import { uid } from '@/lib/utils';
import { Badge, Button, Card, Progress, ScoreRing, Waveform } from '@/components/ui';

interface Step {
  question: IeltsQuestion;
  mode: SpeakingMode;
  label: string;
  targetSec: number;
  prepSec: number;
}

/**
 * Full mock runner: intro → every question in order → results.
 * Each answer is analysed live and the four official criteria are computed
 * per part, exactly like the exam report.
 */
export default function MockRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, saveMockResult, recordSession, toast } = useApp();
  const mock = getMock(id);

  const steps: Step[] = useMemo(() => {
    if (!mock) return [];
    return [
      ...mock.part1.map((q) => ({ question: q, mode: 'ielts-part1' as SpeakingMode, label: 'Part 1', targetSec: q.speakSec ?? 30, prepSec: 5 })),
      { question: mock.part2, mode: 'ielts-part2' as SpeakingMode, label: 'Part 2', targetSec: mock.part2.speakSec ?? 120, prepSec: mock.part2.prepSec ?? 60 },
      ...mock.part3.map((q) => ({ question: q, mode: 'ielts-part3' as SpeakingMode, label: 'Part 3', targetSec: q.speakSec ?? 60, prepSec: 10 })),
    ];
  }, [mock]);

  const [phase, setPhase] = useState<'intro' | 'exam' | 'results'>('intro');
  const [stepIndex, setStepIndex] = useState(0);
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [result, setResult] = useState<IeltsMockResult | null>(null);

  if (!mock) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-muted">Mock not found.</p>
        <Button className="mt-4" onClick={() => router.push('/ielts')}>Back</Button>
      </div>
    );
  }

  const finish = useCallback(
    async (allReports: FeedbackReport[]) => {
      const byPart = (part: number) =>
        allReports.filter((r) => r.mode === (`ielts-part${part}` as SpeakingMode));
      const parts = [1, 2, 3].map((part) => {
        const partReports = byPart(part);
        const dims: Record<string, number> = {};
        for (const r of partReports) {
          for (const d of r.dimensions) {
            dims[d.key] = Math.max(dims[d.key] ?? 0, d.score);
          }
        }
        const c = ieltsCriteria(dims);
        const spokenSec = partReports.reduce((a, r) => a + r.metrics.durationMs, 0) / 1000;
        return {
          part: part as 1 | 2 | 3,
          band: c.overallBand,
          fluency: c.fc,
          lexical: c.lr,
          grammar: c.gra,
          pronunciation: c.pra,
          spokenSec: Math.round(spokenSec),
        };
      });
      const overall = Math.round(parts.reduce((a, p) => a + (p.fluency + p.lexical + p.grammar + p.pronunciation) / 4, 0) / 3);
      const band = Math.round(scoreToBand(overall) * 2) / 2;
      const mockResult: IeltsMockResult = {
        id: uid('mockres'),
        userId: profile?.userId ?? 'guest',
        mockId: mock.id,
        date: new Date().toISOString(),
        band,
        overall,
        parts,
        reportIds: allReports.map((r) => r.id),
      };
      await saveMockResult(mockResult);
      setResult(mockResult);
      track({ name: 'activity', kind: 'mock', minutes: mock.durationMin });
      setPhase('results');
      toast({ tone: 'success', title: `Mock complete — band ${band.toFixed(1)}`, body: 'Full part-by-part breakdown below.' });
    },
    [mock.id, profile, saveMockResult, toast],
  );

  const onStepReport = useCallback(
    async (report: FeedbackReport) => {
      // persist each part so nothing is lost if the tab dies
      await recordSession(
        {
          id: report.sessionId,
          userId: profile?.userId ?? 'guest',
          mode: report.mode,
          title: `${report.mode} · ${steps[stepIndex]?.question.topic ?? ''}`,
          status: 'completed',
          mockId: mock.id,
          startedAt: new Date().toISOString(),
          finishedAt: report.createdAt,
          spokenSec: Math.round(report.metrics.durationMs / 1000),
          overall: report.overall,
          band: report.band,
          dimensionScores: Object.fromEntries(report.dimensions.map((d) => [d.key, d.score])),
          reportId: report.id,
        },
        report,
      );
      const next = [...reports, report];
      setReports(next);
      if (stepIndex + 1 < steps.length) {
        setStepIndex(stepIndex + 1);
      } else {
        await finish(next);
      }
    },
    [reports, stepIndex, steps, mock.id, profile, recordSession, finish],
  );

  if (phase === 'intro') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center p-6">
        <Card className="p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand"><BookOpen className="h-5 w-5" /></span>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">{mock.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            This is a full simulation: {mock.part1.length} Part-1 questions, one cue card, and {mock.part3.length} Part-3 questions.
            It takes about {mock.durationMin} minutes and needs a quiet room.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li className="flex gap-2"><span className="text-accent">•</span>Part 1 answers: ~30 seconds each.</li>
            <li className="flex gap-2"><span className="text-accent">•</span>Part 2: 60s of notes, then speak for 2 minutes.</li>
            <li className="flex gap-2"><span className="text-accent">•</span>Part 3 answers: ~60 seconds, reasoned and extended.</li>
          </ul>
          <div className="mt-6 flex gap-2">
            <Button size="lg" icon={<Mic className="h-4 w-4" />} onClick={() => setPhase('exam')}>Begin the test</Button>
            <Button variant="ghost" size="lg" onClick={() => router.push('/ielts')}>Not now</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'results' && result) {
    return (
      <div className="mx-auto min-h-dvh max-w-2xl space-y-4 p-6">
        <Card className="p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">overall speaking band</p>
          <div className="mt-4 flex justify-center">
            <ScoreRing score={result.overall} size={160} stroke={13} label={result.band.toFixed(1)} sublabel={descriptorForBand(result.band).title} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {result.parts.map((p) => (
              <div key={p.part} className="surface-inset p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Part {p.part}</p>
                <p className="mt-1 font-display text-2xl font-extrabold text-brand">{p.band.toFixed(1)}</p>
                <p className="mt-1 text-[10px] text-faint">{p.spokenSec}s spoken</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-extrabold text-ink">Criteria breakdown</h3>
          <div className="mt-3 space-y-3">
            {result.parts.map((p) => (
              <div key={p.part} className="surface-inset grid grid-cols-4 gap-2 p-3 text-center">
                {[
                  ['FC', p.fluency, 'Fluency'],
                  ['LR', p.lexical, 'Lexical'],
                  ['GRA', p.grammar, 'Grammar'],
                  ['PRA', p.pronunciation, 'Pronunciation'],
                ].map(([k, v, label]) => (
                  <div key={k as string}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
                    <p className="font-display text-lg font-extrabold text-ink">{v as number}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-extrabold text-ink">Examiner's note</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {result.band >= 7
              ? 'You are operating at a strong band. To climb higher, chase lexical precision and fully developed Part-3 arguments rather than longer answers.'
              : result.band >= 6
                ? 'A solid band. The gap to 7 is usually fluency under pressure and error-free complex sentences. Your roadmap now targets those.'
                : 'Good foundation. Focus first on speaking at length without long pauses, and on the grammar drills in your plan.'}
          </p>
        </Card>

        <div className="flex gap-2">
          <Button onClick={() => router.push(`/report?id=${result.reportIds[result.reportIds.length - 1]}`)}>
            Open the last report
          </Button>
          <Button variant="secondary" onClick={() => router.push('/ielts')}>Back to IELTS</Button>
        </div>
      </div>
    );
  }

  /* exam running */
  const step = steps[stepIndex];
  return (
    <div className="mx-auto min-h-dvh max-w-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Badge tone="brand">{step.label}</Badge>
        <span className="text-xs font-bold text-muted">question {stepIndex + 1} of {steps.length}</span>
      </div>
      <Progress value={((stepIndex) / steps.length) * 100} className="mb-6" />
      <MockQuestionStep key={step.question.id} step={step} onReport={onStepReport} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MockQuestionStep({ step, onReport }: { step: Step; onReport: (r: FeedbackReport) => void }) {
  const [sub, setSub] = useState<'question' | 'prep' | 'record' | 'saving'>('question');
  const [prepLeft, setPrepLeft] = useState(step.prepSec);
  const recorder = useRecorder({ maxMs: step.targetSec * 1000 });

  useEffect(() => {
    if (sub !== 'prep') return;
    if (prepLeft <= 0) {
      setSub('record');
      void recorder.start();
      return;
    }
    const t = setTimeout(() => setPrepLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub, prepLeft]);

  const pendingRef = useRef<Promise<import('@/types').SpeechCapture | null> | null>(null);

  useEffect(() => {
    if (recorder.phase !== 'done' || sub !== 'record' || !pendingRef.current) return;
    let cancelled = false;
    setSub('saving');
    pendingRef.current.then((capture) => {
      if (cancelled || !capture) return;
      const report = analyseSpeech({
        sessionId: uid('sess'),
        mode: step.mode,
        capture,
        topicTitle: `${step.label} · ${step.question.topic}`,
        sampleAnswer: step.question.sampleAnswer,
      });
      onReport(report);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.phase, sub]);

  const stopAndSave = () => {
    pendingRef.current = recorder.stop();
  };

  return (
    <div>
      {sub === 'question' && (
        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">{step.question.topic}</p>
          <h2 className="mt-2 font-display text-xl font-extrabold leading-snug text-ink">{step.question.question}</h2>
          {step.question.bullets ? (
            <ul className="mt-4 space-y-2">
              {step.question.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-muted"><span className="text-accent">•</span>{b}</li>
              ))}
            </ul>
          ) : null}
          <Button
            size="lg"
            block
            className="mt-6"
            icon={step.prepSec > 0 ? <Timer className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            onClick={() => (step.prepSec > 0 ? setSub('prep') : (setSub('record'), void recorder.start()))}
          >
            {step.prepSec > 0 ? `Start ${step.prepSec}s preparation` : 'Start recording'}
          </Button>
        </Card>
      )}

      {sub === 'prep' && (
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">preparation time</p>
          <motion.span key={prepLeft} initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-7xl font-extrabold text-brand">
            {prepLeft}
          </motion.span>
          <p className="max-w-xs text-sm text-muted">Jot keywords only — never full sentences.</p>
          <Button variant="secondary" size="sm" onClick={() => { setPrepLeft(0); }}>Skip preparation</Button>
        </div>
      )}

      {sub === 'record' && (
        <Card className="flex flex-col items-center gap-5 p-6 text-center">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-bad">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-bad opacity-60" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-bad" />
              </span>
              recording
            </span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
              {formatClock(step.targetSec * 1000 - recorder.elapsedMs)}
            </span>
          </div>
          <div className="relative flex h-36 w-36 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/30" />
            <button onClick={stopAndSave} aria-label="Stop" className="tap gradient-brand relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-glow">
              <Square className="h-7 w-7" fill="currentColor" />
            </button>
          </div>
          <Waveform levels={recorder.levels} live className="w-full" />
          <p className="min-h-[2.5rem] text-sm text-muted">{recorder.transcript || 'The examiner is listening…'}</p>
          <Button variant="secondary" size="sm" onClick={stopAndSave}>Finish answer</Button>
        </Card>
      )}

      {sub === 'saving' && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm font-bold text-ink">Scoring this answer…</p>
        </div>
      )}
    </div>
  );
}
