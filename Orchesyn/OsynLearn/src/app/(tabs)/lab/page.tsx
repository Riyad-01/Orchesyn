'use client';

/**
 * Fluency Lab — the 4/3/2 protocol.
 *
 * The learner speaks about ONE topic three times, with shrinking time:
 * 4 minutes → 3 minutes → 2 minutes. Published SLA research shows this classic
 * protocol measurably improves fluency (fewer pauses, faster articulation) —
 * and unlike a classroom, OsynLearn MEASURES the improvement live and shows the
 * delta between rounds. That combination (protocol + live proof) is the
 * signature novel feature of the app.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, FlaskConical, Keyboard, Mic, Pause, Play, Share2, Square, Trophy } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { useRecorder, formatClock } from '@/hooks/use-recorder';
import { analyseSpeech } from '@/lib/scoring';
import { pickTopic } from '@/lib/data/topics';
import { uid } from '@/lib/utils';
import { Button, Card, Progress, ScoreRing, SectionTitle, Waveform } from '@/components/ui';
import { renderShareCard, shareCard } from '@/lib/share/card';
import type { FeedbackReport, SpeechCapture, Topic } from '@/types';

type Phase = 'intro' | 'roundIntro' | 'recording' | 'roundDone' | 'results';

const ROUNDS = [
  { sec: 240, label: '4 minutes', blurb: 'Say everything you can. Depth over speed.' },
  { sec: 180, label: '3 minutes', blurb: 'Same ideas, less time. Cut the filler, keep the flow.' },
  { sec: 120, label: '2 minutes', blurb: 'The final sprint. This is where fluency shows.' },
];

interface RoundResult {
  round: number;
  overall: number;
  wpm: number;
  fillers: number;
  awkwardPauses: number;
  words: number;
  fluency: number;
  reportId: string;
}

export default function FluencyLabPage() {
  const { profile, streak, recordSession, toast } = useApp();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState(0); // 0-based
  const [results, setResults] = useState<RoundResult[]>([]);
  const [typedOpen, setTypedOpen] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [sharing, setSharing] = useState(false);

  const roundOpenRef = useRef(false);
  const roundCfg = ROUNDS[round];

  const recorder = useRecorder({
    maxMs: roundCfg.sec * 1000,
    language: 'en-US',
    onAutoStop: () => undefined,
  });

  /* one-shot consumer for the recorder's 'done' phase (auto-stop included) */
  useEffect(() => {
    if (recorder.phase !== 'done' || !roundOpenRef.current) return;
    roundOpenRef.current = false;
    const cap = recorder.getCapture();
    if (cap) void finalizeRound(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.phase]);

  const startLab = () => {
    setTopic(pickTopic());
    setResults([]);
    setRound(0);
    setPhase('roundIntro');
  };

  const beginRecording = async () => {
    setPhase('recording');
    roundOpenRef.current = true;
    await recorder.start();
  };

  const finalizeRound = useCallback(
    async (capture: SpeechCapture) => {
      if (!topic) return;
      const report: FeedbackReport = analyseSpeech({
        sessionId: uid('sess'),
        mode: 'drill',
        capture,
        topicTitle: `${topic.title} · 4/3/2 round ${round + 1}`,
        focusDimension: 'fluency',
      });
      const session = {
        id: uid('sess'),
        userId: profile?.userId ?? 'guest',
        mode: 'drill' as const,
        drillId: 'fluency-lab-432',
        topicId: topic.id,
        title: `Fluency Lab · ${topic.title} · R${round + 1}`,
        status: 'completed' as const,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        spokenSec: Math.round(capture.audio.durationMs / 1000),
        overall: report.overall,
        band: report.band,
        dimensionScores: Object.fromEntries(report.dimensions.map((d) => [d.key, d.score])),
        reportId: report.id,
      };
      await recordSession(session, report);
      const res: RoundResult = {
        round: round + 1,
        overall: report.overall,
        wpm: Math.round(report.metrics.wpm),
        fillers: report.metrics.fillerCount,
        awkwardPauses: report.metrics.awkwardPauseCount,
        words: report.metrics.wordCount,
        fluency: report.dimensions.find((d) => d.key === 'fluency')?.score ?? 0,
        reportId: report.id,
      };
      setResults((prev) => [...prev, res]);
      setPhase('roundDone');
    },
    [topic, round, profile, recordSession],
  );

  const nextRound = () => {
    recorder.reset();
    if (round + 1 >= ROUNDS.length) {
      setPhase('results');
    } else {
      setRound(round + 1);
      setPhase('roundIntro');
    }
  };

  const submitTypedRound = () => {
    if (typedText.trim().split(/\s+/).length < 8) return;
    const cap = recorder.submitTyped(typedText.trim(), Math.round(roundCfg.sec * 0.7));
    setTypedText('');
    setTypedOpen(false);
    void finalizeRound(cap);
  };

  const first = results[0];
  const last = results[results.length - 1];
  const improvement = first && last ? Math.round(((last.fluency - first.fluency) / Math.max(first.fluency, 1)) * 100) : 0;

  const verdict = useMemo(() => {
    if (!first || !last) return '';
    if (improvement >= 10) return `Outstanding — your fluency jumped ${improvement}% between round 1 and round ${results.length}. That is exactly what the 4/3/2 protocol is designed to do.`;
    if (improvement > 0) return `Nice work — fluency rose ${improvement}% across the rounds. Run this lab twice a week and the gain compounds.`;
    if (improvement === 0) return 'Steady across all rounds. Next time, consciously reuse your best phrases from round 1 — recycling language is the secret of this drill.';
    return 'Round 1 was strong — sometimes the sprint round feels rushed. Aim for recycled phrases, not new ideas, in the final round.';
  }, [first, last, improvement, results.length]);

  const onShare = async () => {
    if (!last || !topic) return;
    setSharing(true);
    try {
      const dims = [
        { label: 'Fluency', value: last.fluency },
        { label: 'Overall', value: last.overall },
        { label: 'Pace (wpm→score)', value: Math.min(100, Math.round((last.wpm / 165) * 100)) },
        { label: 'Filler control', value: Math.max(0, 100 - last.fillers * 12) },
      ];
      const url = await renderShareCard({
        name: profile?.name ?? 'Learner',
        headline: improvement > 0 ? `+${improvement}% fluency in 9 minutes` : 'Completed the 4/3/2 Fluency Lab',
        subtitle: `Topic: ${topic.title} · ${ROUNDS.map((r) => r.label.split(' ')[0]).join('→')} min protocol`,
        dims,
        streak: streak.current,
      });
      const how = await shareCard(url, `osynlearn-fluency-lab.png`, 'My OsynLearn Fluency Lab result');
      toast({ tone: 'success', title: how === 'shared' ? 'Shared!' : 'Card saved', body: 'Send it to a friend — practice is contagious.' });
    } catch {
      toast({ tone: 'bad', title: 'Could not create the card' });
    }
    setSharing(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-6">
      {/* ---------- intro ---------- */}
      {phase === 'intro' && (
        <div className="space-y-5">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl gradient-brand text-white">
              <FlaskConical className="h-6 w-6" />
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">Fluency Lab</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              The classic <span className="font-bold text-ink">4/3/2 protocol</span>: speak about one topic three
              times — 4 minutes, then 3, then 2. Research shows it measurably builds fluency. We measure the
              improvement live, round by round.
            </p>
          </div>
          <Card className="p-5">
            <SectionTitle title="How a session runs" />
            <div className="mt-3 space-y-3">
              {ROUNDS.map((r, i) => (
                <div key={r.label} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 font-display text-sm font-extrabold text-brand">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-ink">{r.label}</p>
                    <p className="text-xs text-muted">{r.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs leading-relaxed text-muted">
              💡 Total: ~9 minutes of speaking. Repeating the same content is the point — your brain stops
              planning <em>what</em> to say and starts mastering <em>how</em> to say it.
            </p>
            <Button size="lg" block className="mt-4" onClick={startLab}>
              Start a lab session <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      {/* ---------- round intro ---------- */}
      {phase === 'roundIntro' && topic && (
        <Card className="p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Round {round + 1} of 3 · {roundCfg.label}
          </p>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-ink">{topic.title}</h2>
          <p className="mt-2 text-sm text-muted">{roundCfg.blurb}</p>
          <div className="mt-4 space-y-1.5 rounded-xl border border-line bg-surface2 p-4 text-left">
            {topic.prompts.slice(0, 3).map((p) => (
              <p key={p} className="text-xs leading-relaxed text-muted">• {p}</p>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Button size="lg" block icon={<Mic className="h-4 w-4" />} onClick={() => void beginRecording()}>
              Start recording ({roundCfg.label})
            </Button>
            <Button variant="ghost" size="sm" icon={<Keyboard className="h-3.5 w-3.5" />} onClick={() => setTypedOpen((o) => !o)}>
              No mic? Type this round instead
            </Button>
          </div>
          {typedOpen && (
            <div className="mt-3 space-y-2">
              <textarea
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                rows={4}
                placeholder="Speak on paper: write what you would say…"
                className="w-full resize-none rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-brand/60"
              />
              <Button size="sm" block disabled={typedText.trim().split(/\s+/).length < 8} onClick={submitTypedRound}>
                Submit written round
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ---------- recording ---------- */}
      {phase === 'recording' && topic && (
        <Card className="flex flex-col items-center gap-5 p-6 text-center">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${recorder.phase === 'paused' ? 'bg-warn' : 'animate-pulse bg-bad'}`} />
              {recorder.phase === 'paused' ? 'paused' : `round ${round + 1} · recording`}
            </span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
              {formatClock(roundCfg.sec * 1000 - recorder.elapsedMs)}
            </span>
          </div>

          <div className="relative flex h-36 w-36 items-center justify-center">
            {recorder.phase === 'paused' ? (
              <>
                <span className="absolute inset-4 rounded-full bg-surface2" />
                <button onClick={() => void recorder.resume()} aria-label="Resume" className="tap gradient-brand relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-glow">
                  <Play className="h-7 w-7" fill="currentColor" />
                </button>
              </>
            ) : (
              <>
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/30" />
                <span className="absolute inset-4 rounded-full bg-brand/20" />
                <button onClick={() => void recorder.stop()} aria-label="Stop round" className="tap gradient-brand relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-glow">
                  <Square className="h-7 w-7" fill="currentColor" />
                </button>
              </>
            )}
          </div>

          <Waveform levels={recorder.levels} live className="w-full" />
          <div className="min-h-[3rem] w-full rounded-xl border border-line bg-surface2 p-3">
            <p className="text-sm leading-relaxed text-muted">
              {(recorder.transcript || (recorder.phase === 'paused' ? 'Paused — resume when ready.' : 'Listening… start speaking.')) as string}
            </p>
          </div>
          <Progress value={(recorder.elapsedMs / (roundCfg.sec * 1000)) * 100} className="w-full" />
          <div className="flex gap-2">
            {recorder.phase === 'recording' && (
              <Button variant="secondary" size="sm" icon={<Pause className="h-3.5 w-3.5" />} onClick={() => recorder.pause()}>Pause</Button>
            )}
            <Button variant="secondary" size="sm" icon={<Square className="h-3.5 w-3.5" />} onClick={() => void recorder.stop()}>
              Finish round
            </Button>
          </div>
        </Card>
      )}

      {/* ---------- round done ---------- */}
      {phase === 'roundDone' && results[results.length - 1] && (
        <Card className="p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Round {results.length} complete</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <ScoreRing score={results[results.length - 1].overall} size={92} label="overall" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-left text-xs">
              <span className="text-muted">Pace</span><span className="font-bold text-ink">{results[results.length - 1].wpm} wpm</span>
              <span className="text-muted">Fillers</span><span className="font-bold text-ink">{results[results.length - 1].fillers}</span>
              <span className="text-muted">Awkward pauses</span><span className="font-bold text-ink">{results[results.length - 1].awkwardPauses}</span>
              <span className="text-muted">Words</span><span className="font-bold text-ink">{results[results.length - 1].words}</span>
            </div>
          </div>
          {results.length > 1 && (
            <p className="mt-4 text-sm text-muted">
              Fluency {results[results.length - 1].fluency >= results[results.length - 2].fluency ? '↑' : '↓'} vs round {results.length - 1}
              {' '}({results[results.length - 2].fluency} → {results[results.length - 1].fluency})
            </p>
          )}
          <Button size="lg" className="mt-5" onClick={nextRound}>
            {round + 1 >= ROUNDS.length ? 'See the full result' : `Next round: ${ROUNDS[round + 1].label}`} <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {/* ---------- results ---------- */}
      {phase === 'results' && topic && first && last && (
        <div className="space-y-5">
          <Card className="p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Trophy className="h-5 w-5" />
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink">Lab complete</h2>
            <p className={`mt-1 font-display text-4xl font-extrabold ${improvement >= 0 ? 'text-accent' : 'text-warn'}`}>
              {improvement > 0 ? `+${improvement}%` : `${improvement}%`} <span className="text-lg text-muted">fluency, round 1 → {results.length}</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{verdict}</p>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-4 gap-2 border-b border-line bg-surface2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-faint">
              <span>Metric</span>
              {results.map((r) => <span key={r.round} className="text-center">R{r.round}</span>)}
              {results.length < 3 && <span />}
            </div>
            {(
              [
                ['Fluency', (r: RoundResult) => r.fluency],
                ['Overall', (r: RoundResult) => r.overall],
                ['Pace (wpm)', (r: RoundResult) => r.wpm],
                ['Fillers', (r: RoundResult) => r.fillers],
                ['Words', (r: RoundResult) => r.words],
              ] as const
            ).map(([label, get]) => (
              <div key={label} className="grid grid-cols-4 gap-2 border-b border-line px-4 py-3 text-sm last:border-0">
                <span className="text-muted">{label}</span>
                {results.map((r) => (
                  <span key={r.round} className="text-center font-bold tabular-nums text-ink">{get(r)}</span>
                ))}
                {results.length < 3 && <span />}
              </div>
            ))}
          </Card>

          <div className="flex flex-col gap-2">
            <Button size="lg" block icon={<Share2 className="h-4 w-4" />} loading={sharing} onClick={() => void onShare()}>
              Share my progress card
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={startLab}>New topic</Button>
              <Link href="/home" className="flex-1">
                <Button variant="ghost" block>Back home</Button>
              </Link>
            </div>
          </div>
          <p className="text-center text-[10px] text-faint">
            Every round was saved to your history with a full report. Band figures are estimates.
          </p>
        </div>
      )}
    </div>
  );
}
