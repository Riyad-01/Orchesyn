'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';
import type { InterviewQuestion, InterviewTrack } from '@/lib/data/interviews';
import { useRecorder } from '@/hooks/use-recorder';
import { analyseSpeech } from '@/lib/scoring/aggregate';
import { starSignals, type StarSignals } from '@/lib/scoring/star';
import { fetchInterviewDebrief, type InterviewDebrief } from '@/lib/insights/interview';
import { captureFromText } from '@/lib/ai/local-tutor';
import { speak } from '@/lib/speech/tts';
import { useApp } from '@/lib/store/app';
import { Badge, Button, Card, ScoreRing, SectionTitle, Spinner } from '@/components/ui';

/**
 * The first live interview system:
 *   the app ASKS (voice + text), LISTENS (mic or typed fallback), debriefs each
 *   answer instantly (pace, fillers, grammar, STAR structure), and closes with
 *   a senior-interviewer verdict (LLM when configured, honest local floor if not).
 */

interface AnswerRec {
  q: InterviewQuestion;
  text: string;
  words: number;
  wpm: number;
  fillers: number;
  score: number;
  star?: StarSignals;
  topFix?: string;
}

export function LiveInterview({ track, onExit }: { track: InterviewTrack; onExit: () => void }) {
  const { profile } = useApp();
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState<'ask' | 'debrief'>('ask');
  const [typed, setTyped] = useState('');
  const [answers, setAnswers] = useState<AnswerRec[]>([]);
  const [debrief, setDebrief] = useState<InterviewDebrief | null>(null);
  const [finalBusy, setFinalBusy] = useState(false);
  const recorder = useRecorder({ maxMs: (track.questions[idx]?.seconds ?? 60) * 1000 });

  const q = track.questions[idx];
  const done = idx >= track.questions.length;

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const finishAnswer = (text: string) => {
    const capture = recorder.getCapture() ?? captureFromText(text);
    const report = analyseSpeech({
      sessionId: `interview-${q.id}`,
      mode: 'interview',
      capture,
      language: profile?.practiceLanguage,
    });
    const rec: AnswerRec = {
      q,
      text,
      words: report.words.length,
      wpm: Math.round(report.metrics.wpm),
      fillers: report.fillers.length,
      score: report.overall,
      star: q.star ? starSignals(text) : undefined,
      topFix: report.grammarIssues[0] ? `${report.grammarIssues[0].quote} → ${report.grammarIssues[0].correction}` : undefined,
    };
    setAnswers((a) => [...a, rec]);
    setSub('debrief');
  };

  const stopAndScore = async () => {
    const capture = await recorder.stop();
    const text = (capture?.transcript ?? '').trim();
    if (!text || text.split(/\s+/).length < 3) return;
    finishAnswer(text);
  };

  const next = () => {
    recorder.reset();
    setTyped('');
    setSub('ask');
    setIdx((i) => i + 1);
  };

  // when the last answer lands, run the final debrief once
  useEffect(() => {
    if (!done || debrief !== null || finalBusy) return;
    setFinalBusy(true);
    const local: InterviewDebrief['readiness'] =
      answers.length && answers.reduce((n, a) => n + (a.star ? a.star.score : a.words >= 30 ? 3 : 2), 0) / answers.length >= 3.2
        ? 'ready'
        : answers.length && answers.every((a) => a.words >= 20)
          ? 'almost'
          : 'building';
    void fetchInterviewDebrief(track.title, answers.map((a) => ({ q: a.q.q, a: a.text, words: a.words })), local).then((d) => {
      setDebrief(d);
      setFinalBusy(false);
    });
  }, [done, debrief, finalBusy, answers, track.title]);

  /* ------------------------------ report ------------------------------ */
  if (done) {
    const avg = answers.length ? Math.round(answers.reduce((n, a) => n + a.score, 0) / answers.length) : 0;
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">interview complete · {track.title}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
            <ScoreRing score={avg} size={96} stroke={9} label={String(avg)} />
            <div className="text-left">
              <p className="font-display text-xl font-extrabold text-ink">
                {debrief ? (debrief.readiness === 'ready' ? 'Interview ready' : debrief.readiness === 'almost' ? 'Almost ready' : 'Building phase') : 'Scoring…'}
              </p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{debrief?.verdict ?? 'Asking the examiner for a verdict…'}</p>
              {debrief?.model ? <p className="mt-1 text-[11px] text-faint">AI interviewer · {debrief.model}</p> : debrief ? <p className="mt-1 text-[11px] text-faint">local debrief · add an AI key in Settings for the full panel</p> : null}
            </div>
          </div>
        </Card>

        {debrief && (debrief.strengths.length > 0 || debrief.fixes.length > 0) ? (
          <Card className="grid gap-4 p-5 sm:grid-cols-2">
            {debrief.strengths.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-good">The panel liked</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">{debrief.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            ) : null}
            {debrief.fixes.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-warn">Tighten these</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink">{debrief.fixes.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="p-5">
          <SectionTitle title="Before the real interview" />
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted">
            {(debrief?.tips ?? []).map((t) => <li key={t}>{t}</li>)}
          </ol>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Your answers, question by question" />
          <div className="mt-2 space-y-2">
            {answers.map((a, i) => (
              <div key={a.q.id} className="rounded-xl border border-line bg-surface2 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink">
                  <span className="text-faint">{i + 1}.</span> {a.q.q}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] font-semibold text-muted">
                  <Badge tone={a.score >= 70 ? 'good' : a.score >= 50 ? 'mid' : 'bad'}>{a.score}</Badge>
                  <span>{a.words} words</span>
                  {a.wpm > 0 ? <span>{a.wpm} wpm</span> : null}
                  {a.fillers > 0 ? <span>{a.fillers} filler{a.fillers > 1 ? 's' : ''}</span> : null}
                  {a.star ? <span className={a.star.score >= 3 ? 'text-good' : 'text-warn'}>STAR {a.star.score}/4</span> : null}
                </div>
                {a.star && a.star.missing.length > 0 ? <p className="mt-1 text-[11px] text-warn">Missing: {a.star.missing.join(' · ')}</p> : null}
                {a.topFix ? <p className="mt-1 text-[11px] text-muted">✏️ {a.topFix}</p> : null}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onExit}><ArrowLeft className="h-4 w-4" /> All tracks</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setAnswers([]);
              setDebrief(null);
              setIdx(0);
              setSub('ask');
              recorder.reset();
            }}
          >
            Retake this interview
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------------------ live room ------------------------------ */
  const last = answers[answers.length - 1];
  const recording = recorder.phase === 'recording' || recorder.phase === 'paused';

  return (
    <div className="space-y-4">
      {/* progress */}
      <div className="flex items-center gap-2">
        {track.questions.map((qq, i) => (
          <span key={qq.id} className={`h-1.5 flex-1 rounded-full ${i < idx ? 'bg-good' : i === idx ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-muted">
        <button onClick={onExit} className="flex items-center gap-1.5 hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> leave interview</button>
        <span>question {idx + 1} of {track.questions.length}</span>
      </div>

      {sub === 'ask' ? (
        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-brand/10 blur-2xl" />
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{track.emoji} {track.title} · live</p>
          <h2 className="mt-3 font-display text-xl font-extrabold leading-snug text-ink sm:text-2xl">“{q.q}”</h2>
          <p className="mt-3 rounded-xl bg-surface2 p-3 text-xs leading-relaxed text-muted">💡 {q.tip}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => void speak(q.q, { rate: 0.95 })}>
              <Volume2 className="h-4 w-4" /> hear the question
            </Button>
            {recorder.canRecord ? (
              <Button
                className="border-bad/40 bg-bad/15 text-bad hover:bg-bad/25"
                onClick={() => {
                  if (recording) void stopAndScore();
                  else void recorder.start();
                }}
              >
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {recording ? 'Stop & get feedback' : 'Start answering'}
              </Button>
            ) : null}
            <span className="text-[11px] font-semibold text-faint">aim ~{q.seconds}s</span>
          </div>

          {recording ? (
            <div className="mt-4 rounded-xl border border-bad/30 bg-bad/10 p-3">
              <p className="flex items-center gap-2 text-xs font-bold text-bad">
                <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-bad opacity-60" /><span className="h-2 w-2 rounded-full bg-bad" /></span>
                listening… {(recorder.elapsedMs / 1000).toFixed(0)}s
              </p>
              {recorder.interim ? <p className="mt-2 text-sm italic text-ink/80">{recorder.interim}</p> : null}
            </div>
          ) : null}

          {/* typed fallback for no-mic browsers */}
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-bold text-muted hover:text-ink">No mic? Type your answer</summary>
            <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={4} placeholder="Type the answer you would give out loud…" className="mt-2 w-full rounded-xl border border-line bg-surface2 p-3 text-sm text-ink outline-none focus:border-brand/50" />
            <Button className="mt-2" size="sm" disabled={typed.trim().split(/\s+/).length < 3} onClick={() => { recorder.submitTyped(typed.trim(), q.seconds); finishAnswer(typed.trim()); }}>
              Submit typed answer
            </Button>
          </details>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-good">instant debrief</p>
          {last ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
                <Badge tone={last.score >= 70 ? 'good' : last.score >= 50 ? 'mid' : 'bad'}>score {last.score}</Badge>
                <span>{last.words} words</span>
                {last.wpm > 0 ? <span>{last.wpm} wpm</span> : null}
                {last.fillers > 0 ? <span>{last.fillers} fillers</span> : <span className="text-good">no fillers ✓</span>}
              </div>
              {last.star ? (
                <div className="mt-3">
                  <p className="text-xs font-bold text-ink">STAR structure: {last.star.score}/4</p>
                  <div className="mt-1.5 flex gap-1.5">
                    {(['situation', 'task', 'action', 'result'] as const).map((k) => (
                      <span key={k} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase ${last.star![k] ? 'bg-good/15 text-good' : 'bg-surface2 text-faint'}`}>
                        {last.star![k] ? <CheckCircle2 className="h-3 w-3" /> : null} {k}
                      </span>
                    ))}
                  </div>
                  {last.star.missing.length > 0 ? <p className="mt-2 text-xs text-warn">Add: {last.star.missing.join(' · ')}</p> : null}
                </div>
              ) : null}
              {last.topFix ? <p className="mt-3 rounded-xl bg-surface2 p-2.5 text-xs text-muted">✏️ {last.topFix}</p> : null}
              <p className="mt-3 text-xs leading-relaxed text-faint">{last.words < 30 ? 'Short answer — interviewers read brevity as uncertainty. Aim for a full STAR story.' : last.wpm > 170 ? 'Fast pace — slow down 10% and let the result land.' : 'Good substance. Carry this into the next question.'}</p>
            </>
          ) : null}
          <Button className="mt-4" onClick={next}>
            {idx + 1 < track.questions.length ? <>Next question <ArrowRight className="h-4 w-4" /></> : <><Sparkles className="h-4 w-4" /> Finish & get the verdict</>}
          </Button>
        </Card>
      )}

      {finalBusy ? (
        <p className="flex items-center justify-center gap-2 text-xs font-bold text-muted"><Spinner className="h-4 w-4" /> the panel is deliberating…</p>
      ) : null}
    </div>
  );
}
