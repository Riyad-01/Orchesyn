'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { READING_PASSAGES, type ReadingPassage } from '@/lib/data/ielts-receptive';
import { bandVerdict, readingBand } from '@/lib/scoring/ielts-bands';
import { Badge, Button, Card, ScoreRing } from '@/components/ui';

/**
 * IELTS Reading — Academic-style passages with MCQ + True/False/Not Given.
 * Timed practice with an HONEST practice estimate (labelled as such — short sets
 * full answer review explaining what to look for next time.
 */

function Reader({ passage }: { passage: ReadingPassage }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // lightweight count-up timer
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const answered = passage.questions.filter((q) => answers[q.id] !== undefined).length;
  const correct = passage.questions.filter((q) => answers[q.id] === q.answer).length;
  const band = readingBand(correct, passage.questions.length);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="brand">
          <Clock className="h-3 w-3" /> {mm}:{ss} elapsed · aim ≤ {passage.minutes} min
        </Badge>
        <Badge tone={submitted ? 'good' : 'neutral'}>{answered}/{passage.questions.length} answered</Badge>
      </div>

      {/* passage */}
      <Card className="p-5">
        <h2 className="font-display text-lg font-extrabold text-ink">{passage.title}</h2>
        <div className="mt-3 space-y-3">
          {passage.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-ink/90">
              {p}
            </p>
          ))}
        </div>
      </Card>

      {/* questions */}
      <div className="space-y-3">
        {passage.questions.map((q, qi) => (
          <Card key={q.id} className="p-4">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 rounded-lg bg-brand/12 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-brand">{q.kind === 'truefalse' ? 'T/F/NG' : 'MCQ'}</span>
              <p className="text-sm font-bold text-ink">
                {qi + 1}. {q.text}
              </p>
            </div>
            <div className="mt-2 space-y-1.5">
              {q.options.map((opt, oi) => {
                const chosen = answers[q.id] === oi;
                const isRight = q.answer === oi;
                const state = submitted ? (isRight ? 'right' : chosen ? 'wrong' : '') : chosen ? 'chosen' : '';
                return (
                  <button
                    key={opt}
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`tap flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
                      state === 'right'
                        ? 'border-good/60 bg-good/10 text-ink'
                        : state === 'wrong'
                          ? 'border-bad/60 bg-bad/10 text-ink'
                          : state === 'chosen'
                            ? 'border-brand bg-brand/10 text-ink'
                            : 'border-line bg-surface2 text-muted hover:border-brand/40 hover:text-ink'
                    }`}
                  >
                    {state === 'right' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-good" /> : state === 'wrong' ? <XCircle className="h-4 w-4 shrink-0 text-bad" /> : null}
                    {opt}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* submit / result */}
      {!submitted ? (
        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur">
          <p className="text-xs font-semibold text-muted">Answer all questions to see a practice estimate.</p>
          <Button onClick={() => setSubmitted(true)} disabled={answered < passage.questions.length}>
            Check answers
          </Button>
        </div>
      ) : (
        <Card className="p-5 text-center">
          <div className="flex items-center justify-center gap-5">
            <ScoreRing score={Math.round((correct / passage.questions.length) * 100)} size={88} stroke={8} label={band.toFixed(1)} />
            <div className="text-left">
              <p className="font-display text-lg font-extrabold text-ink">
                {correct}/{passage.questions.length} correct · ≈ band {band.toFixed(1)} (practice estimate)
              </p>
              <p className="text-sm text-muted">{bandVerdict(band)} · finished in {mm}:{ss}</p>
              <p className="mt-1 text-[10px] font-semibold text-faint">
                Short practice set — a rough estimate, NOT an official band. Official scores come from full, timed tests.
              </p>
              <p className="mt-1 text-[11px] text-faint">Scaled to the 40-question Academic reading table.</p>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted">
            {band >= 7
              ? 'Strong. To push higher, practise the hardest question type for you — usually True/False/Not Given.'
              : band >= 5
                ? 'Solid base. Next step: locate answers by scanning for keywords instead of reading every word — time is the real enemy.'
                : 'Start with shorter questions first to bank marks, then return to the hard ones. Skimming the first and last sentence of each paragraph gives you the map.'}
          </p>
          <Button className="mt-4" variant="ghost" onClick={() => { setAnswers({}); setSubmitted(false); }}>
            Try again
          </Button>
        </Card>
      )}
    </div>
  );
}

export default function IeltsReadingPage() {
  const [active, setActive] = useState<ReadingPassage | null>(null);

  if (active) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setActive(null)} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> back to passages
        </button>
        <Reader key={active.id} passage={active} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <BookOpen className="h-6 w-6 text-brand" /> IELTS Reading
        </h1>
        <p className="mt-1 text-sm text-muted">
          Academic passages with the two question types that decide most bands: multiple choice and True / False / Not Given.
          Timed practice, instant band estimate.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {READING_PASSAGES.map((p) => (
          <button key={p.id} onClick={() => setActive(p)} className="tap card p-5 text-left hover:border-brand/40">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">{p.level}</p>
            <h3 className="mt-1 text-sm font-extrabold text-ink">{p.title}</h3>
            <p className="mt-2 text-[11px] font-semibold text-faint">
              {p.questions.length} questions · aim ≤ {p.minutes} min
            </p>
          </button>
        ))}
      </div>
      <Card className="p-4 text-xs leading-relaxed text-muted">
        <p>• <b>T/F/NG rule of thumb:</b> “Not Given” means the passage neither confirms nor denies it — don’t use your own knowledge.</p>
        <p className="mt-1">• Bands are scaled to the official Academic reading conversion table.</p>
      </Card>
    </div>
  );
}
