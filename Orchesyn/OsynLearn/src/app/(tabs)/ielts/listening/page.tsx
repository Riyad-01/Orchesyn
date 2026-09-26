'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Ear, Gauge, Pause, Play, RotateCcw, XCircle } from 'lucide-react';
import { LISTENING_SETS, type ListeningSet } from '@/lib/data/ielts-receptive';
import { bandVerdict, listeningBand } from '@/lib/scoring/ielts-bands';
import { Badge, Button, Card, SectionTitle, ScoreRing , Segmented } from '@/components/ui';

/**
 * IELTS Listening — TTS-driven, zero extra MB.
 * The browser's speech engine narrates each section (play/pause/replay, speed
 * control). If TTS is unavailable the script can be read instead — practice
 * never dead-ends. Real-exam honesty note: in the real test you hear each
 * recording only twice; replay here is a practice aid.
 */

function useTts() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [supported]);
  useEffect(() => stop, [stop]); // cancel on unmount — no ghost audio
  return { supported, speaking, setSpeaking, stop };
}

function Player({ set, onDone }: { set: ListeningSet; onDone: () => void }) {
  const tts = useTts();
  const [secIdx, setSecIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [line, setLine] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const lineRef = useRef(line);
  lineRef.current = line;

  const section = set.sections[secIdx];
  const allQ = set.sections.flatMap((s) => s.questions);
  const answered = allQ.filter((q) => answers[q.id] !== undefined).length;
  const correct = allQ.filter((q) => answers[q.id] === q.answer).length;

  const speakSection = useCallback(() => {
    setPlayedOnce(true);
    if (!tts.supported) return;
    window.speechSynthesis.cancel();
    const lines = set.sections[secIdx].script;
    lines.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = rate;
      u.onstart = () => setLine(i);
      if (i === lines.length - 1) {
        u.onend = () => {
          setLine(-1);
          tts.setSpeaking(false);
        };
      }
      window.speechSynthesis.speak(u);
    });
    tts.setSpeaking(true);
  }, [rate, secIdx, set.sections, tts]);

  const toggle = () => {
    if (!tts.supported) return;
    if (tts.speaking) {
      window.speechSynthesis.cancel();
      tts.setSpeaking(false);
      setLine(-1);
    } else {
      speakSection();
    }
  };

  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [playedOnce, setPlayedOnce] = useState(false);

  const submit = () => {
    if (answered < allQ.length) return;
    window.speechSynthesis?.cancel();
    setSubmitted(true);
    onDone();
  };

  const band = listeningBand(correct, allQ.length);

  return (
    <div className="space-y-4">
      {/* section tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {set.sections.map((s, i) => (
          <button
            key={s.title}
            onClick={() => {
              window.speechSynthesis?.cancel();
              tts.setSpeaking(false);
              setLine(-1);
              setSecIdx(i);
            }}
            className={`tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${i === secIdx ? 'border-brand bg-brand/12 text-brand' : 'border-line bg-surface2 text-muted hover:text-ink'}`}
          >
            Section {i + 1}
          </button>
        ))}
      </div>

      {/* player card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">{section.title}</p>
            <p className="mt-1 text-sm text-muted">{section.context}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={mode === 'exam' ? 'warn' as any : 'brand'}>{mode === 'exam' ? 'Exam mode' : 'Practice mode'}</Badge>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Segmented
            value={mode}
            onChange={(v) => { setMode(v); window.speechSynthesis?.cancel(); tts.setSpeaking(false); setLine(-1); setPlayedOnce(false); }}
            options={[{ value: 'practice', label: 'Practice' }, { value: 'exam', label: 'Exam' }]}
          />
          <span className="text-[10px] font-semibold text-faint">
            {mode === 'exam' ? 'audio plays ONCE · no replay, speed or transcript' : 'device voice = practice audio, not a real recording'}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => { if (mode === 'exam' && playedOnce && !tts.speaking) return; toggle(); }} disabled={!tts.supported || submitted || (mode === 'exam' && playedOnce && !tts.speaking)}>
            {tts.speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {tts.speaking ? 'Pause' : mode === 'exam' ? (playedOnce ? 'Played — no replay in Exam mode' : 'Play section (once)') : line >= 0 ? 'Restart section' : 'Play section'}
          </Button>
          {mode === 'practice' && (
            <Button variant="ghost" onClick={speakSection} disabled={!tts.supported || submitted || tts.speaking}>
              <RotateCcw className="h-4 w-4" /> Replay
            </Button>
          )}
          {mode === 'practice' && (
            <div className="ml-auto flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-faint" />
              {[0.9, 1, 1.25].map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`tap rounded-lg px-2 py-1 text-xs font-bold ${rate === r ? 'bg-brand/15 text-brand' : 'text-muted hover:text-ink'}`}
                >
                  {r}×
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === 'practice' && line >= 0 ? (
          <p className="mt-3 rounded-xl bg-surface2 p-3 text-sm leading-relaxed text-ink" aria-live="polite">
            <span className="mr-2 text-brand">♪</span>
            {section.script[line]}
          </p>
        ) : null}
        {!tts.supported ? (
          <p className="mt-3 rounded-xl bg-warn/10 p-3 text-xs text-warn">
            This browser has no speech engine. Use “Show script” below to practise reading-comprehension style — the questions still work.
          </p>
        ) : null}
      </Card>

      {/* questions for this section */}
      <div className="space-y-3">
        {section.questions.map((q, qi) => (
          <Card key={q.id} className="p-4">
            <p className="text-sm font-bold text-ink">
              {qi + 1}. {q.text}
            </p>
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

      {/* footer actions */}
      {!submitted ? (
        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur">
          <p className="text-xs font-semibold text-muted">
            {answered}/{allQ.length} answered
          </p>
          <Button onClick={submit} disabled={answered < allQ.length}>
            Check answers & band
          </Button>
        </div>
      ) : (
        <Card className="p-5 text-center">
          <div className="flex items-center justify-center gap-5">
            <ScoreRing score={Math.round((correct / allQ.length) * 100)} size={88} stroke={8} label={band.toFixed(1)} />
            <div className="text-left">
              <p className="font-display text-lg font-extrabold text-ink">
                {correct}/{allQ.length} correct · Band {band.toFixed(1)}
              </p>
              <p className="text-sm text-muted">{bandVerdict(band)}</p>
              <p className="mt-1 text-[11px] text-faint">Scaled to the 40-question Academic listening table.</p>
            </div>
          </div>
          <details className="mt-4 rounded-xl border border-line bg-surface2 p-3 text-left">
            <summary className="cursor-pointer text-xs font-bold text-brand">Show full scripts (transcripts)</summary>
            <div className="mt-2 space-y-3">
              {set.sections.map((s) => (
                <div key={s.title}>
                  <p className="text-xs font-bold text-ink">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.script.join(' ')}</p>
                </div>
              ))}
            </div>
          </details>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/ielts/listening/"><Button variant="ghost"><ArrowRight className="h-4 w-4 rotate-180" /> All sets</Button></Link>
            <Button variant="ghost" onClick={() => { setAnswers({}); setSubmitted(false); setSecIdx(0); }}>
              Try again
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function IeltsListeningPage() {
  const [active, setActive] = useState<ListeningSet | null>(null);

  if (active) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel(); setActive(null); }} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> back to listening sets
        </button>
        <h1 className="font-display text-xl font-extrabold text-ink">{active.title}</h1>
        <p className="mb-4 mt-1 text-xs text-faint">Practice mode: replay allowed. The real exam plays each recording twice.</p>
        <Player key={active.id} set={active} onDone={() => undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <Ear className="h-6 w-6 text-brand" /> IELTS Listening
        </h1>
        <p className="mt-1 text-sm text-muted">
          Four-section sets narrated by your device’s speech engine — no audio downloads, works offline.
          Bands are scaled to the official Academic listening table.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LISTENING_SETS.map((set) => (
          <button key={set.id} onClick={() => setActive(set)} className="tap card p-5 text-left hover:border-brand/40">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">{set.level}</p>
            <h3 className="mt-1 text-sm font-extrabold text-ink">{set.title}</h3>
            <p className="mt-2 text-[11px] font-semibold text-faint">
              {set.sections.length} sections · {set.sections.reduce((n, s) => n + s.questions.length, 0)} questions · ~{set.minutes} min
            </p>
          </button>
        ))}
      </div>
      <SectionTitle title="How this works" hint="honest practice" />
      <Card className="p-4 text-xs leading-relaxed text-muted">
        <p>• Press <b>Play</b> and answer as you listen — you can replay any section (the real exam plays each recording twice).</p>
        <p className="mt-1">• Speed control (0.9× – 1.25×) lets you train up to real exam pace.</p>
        <p className="mt-1">• After checking, full transcripts open so you can study what you missed.</p>
      </Card>
    </div>
  );
}
