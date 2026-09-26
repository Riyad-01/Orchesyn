'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Keyboard,
  Lightbulb,
  Loader2,
  Mic,
  Pause,
  Play,
  Sparkles,
  Square,
  Timer as TimerIcon,
  X,
} from 'lucide-react';
import type { DimensionKey, FeedbackReport, Session, SpeakingMode, SpeechCapture } from '@/types';
import { useApp } from '@/lib/store/app';
import { useRecorder, formatClock } from '@/hooks/use-recorder';
import { useMicCheck } from '@/hooks/use-mic-check';
import { publishRecording } from '@/lib/ai/audio-bus';
import { readConsent } from '@/lib/privacy/consent';
import { detectFillerNudge, detectSilenceNudge, isFresh, type Nudge } from '@/lib/insights/nudges';
import { mergeWhisperIntoCapture, transcribeWithWhisper } from '@/lib/speech/whisper';
import { getLanguage } from '@/lib/i18n/languages';
import { fetchLlmFeedback, mergeLlmFeedback } from '@/lib/insights/llm-feedback';
import { analyseSpeech } from '@/lib/scoring';
import { uid } from '@/lib/utils';
import { Button, Card, Progress, Waveform } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface SessionFlowConfig {
  mode: SpeakingMode;
  title: string;
  emoji?: string;
  /** the prompt shown to the learner */
  prompt: string;
  cuePoints?: string[];
  prepSec?: number;
  targetSec: number;
  sampleAnswer?: string;
  topicId?: string;
  themeId?: string;
  scenarioId?: string;
  drillId?: string;
  mockId?: string;
  focusDimension?: DimensionKey;
  language?: string;
  /** called after the report is persisted */
  onSaved?: (report: FeedbackReport) => void;
}

type Phase = 'prep' | 'countdown' | 'recording' | 'analyzing' | 'saved' | 'error';

/**
 * The complete speak → feedback loop used by impromptu, drills and coach turns.
 * Handles permission, prep countdown, the recording orb, live captions, the
 * typed fallback, analysis, and a hand-off to the report screen.
 */
export function SessionFlow({ config }: { config: SessionFlowConfig }) {
  const { profile, recordSession, toast } = useApp();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('prep');
  const [prepLeft, setPrepLeft] = useState(config.prepSec ?? 0);
  const [typedMode, setTypedMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const mic = useMicCheck();

  /* recoverable practice session: typed drafts autosave; leaving mid-session
     stores a resume pointer the picker offers on the next visit */
  useEffect(() => {
    if (!config.topicId) return;
    try {
      const d = window.localStorage.getItem(`stim:typed-draft:${config.topicId}`);
      if (d) setTypedText(d);
    } catch { /* fine */ }
  }, [config.topicId]);
  useEffect(() => {
    if (!config.topicId || !typedText) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(`stim:typed-draft:${config.topicId}`, typedText);
      } catch { /* fine */ }
    }, 500);
    return () => clearTimeout(t);
  }, [typedText, config.topicId]);
  useEffect(() => {
    const bye = () => {
      if (phase === 'saved' || !config.topicId) return;
      try {
        window.localStorage.setItem('stim:resume', JSON.stringify({ topicId: config.topicId, title: config.title, at: Date.now() }));
      } catch { /* fine */ }
    };
    window.addEventListener('beforeunload', bye);
    return () => window.removeEventListener('beforeunload', bye);
  }, [phase, config.topicId, config.title]);

  const captureRef = useRef<import('@/types').SpeechCapture | null>(null);



  const recorder = useRecorder({
    maxMs: config.targetSec * 1000,
    language: config.language ?? 'en-US',
    onAutoStop: () => {
      /* stop() is called by the hook; nothing extra needed */
    },
    onError: (err) => {
      if (err.code === 'permission-denied') setPhase('error');
    },
  });

  /* ---- live coaching nudges (real-time feedback while speaking) ---- */
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const prevInterimRef = useRef('');
  const lastWordAtRef = useRef(0);

  useEffect(() => {
    if (phase !== 'recording') return;
    if (recorder.interim !== prevInterimRef.current) {
      prevInterimRef.current = recorder.interim;
      lastWordAtRef.current = Date.now();
      const n = detectFillerNudge(recorder.interim);
      if (n) setNudge(n);
    }
  }, [recorder.interim, phase]);

  useEffect(() => {
    if (phase !== 'recording') {
      setNudge(null);
      prevInterimRef.current = '';
      lastWordAtRef.current = 0;
      return;
    }
    const t = setInterval(() => {
      setNudge((cur) => {
        if (recorder.phase === 'recording' && lastWordAtRef.current) {
          const s = detectSilenceNudge(Date.now() - lastWordAtRef.current);
          if (s) return s;
        }
        return cur && isFresh(cur) ? cur : null;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, recorder.phase]);

  /* prep countdown */
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (prepLeft <= 0) {
      setPhase('recording');
      void recorder.start();
      return;
    }
    const t = setTimeout(() => setPrepLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, prepLeft]);

  /* ---- progressive pipeline ------------------------------------------------
   * The local report paints immediately (~100 ms). Whisper transcription and
   * the LLM examiner then upgrade the SAME report in the background and the
   * report screen live-refreshes via 'osyn:report-updated'. Worst-case stare
   * at a spinner: under a second — not a minute.
   * ---------------------------------------------------------------------- */
  const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  const sessionFor = useCallback(
    (report: FeedbackReport): Session => ({
      id: report.sessionId,
      userId: profile?.userId ?? 'guest',
      mode: config.mode,
      title: config.title,
      status: 'completed',
      topicId: config.topicId,
      themeId: config.themeId,
      scenarioId: config.scenarioId,
      drillId: config.drillId,
      mockId: config.mockId,
      startedAt: new Date().toISOString(),
      finishedAt: report.createdAt,
      spokenSec: Math.round(report.metrics.durationMs / 1000),
      overall: report.overall,
      band: report.band,
      dimensionScores: Object.fromEntries(report.dimensions.map((d) => [d.key, d.score])),
      reportId: report.id,
    }),
    [profile, config],
  );

  const upgradeInBackground = (capture: SpeechCapture, blob: Blob | null, base: FeedbackReport, whisperTried: boolean) => {
    void (async () => {
      try {
        let c = capture;
        let upgraded = false;
        // recordings leave the device ONLY with explicit consent
        if (!whisperTried && blob && blob.size > 4096 && readConsent().recordingUpload) {
          let w = await transcribeWithWhisper(blob, getLanguage(config.language).whisper, config.title);
          const dw = wordsOf(capture.transcript);
          const ww = w ? wordsOf(w.text) : 0;
          if (w && dw > 10 && ww < dw / 2) w = null; // underflow guard
          if (w) {
            c = mergeWhisperIntoCapture(capture, w);
            upgraded = true;
            // smart language handling: heard a different language? suggest once.
            const heard = w.language ? getLanguage(w.language) : null;
            if (
              heard &&
              heard.whisper !== getLanguage(config.language).whisper &&
              typeof sessionStorage !== 'undefined' &&
              !sessionStorage.getItem('osyn:lang-suggest')
            ) {
              sessionStorage.setItem('osyn:lang-suggest', '1');
              toast({
                tone: 'info',
                title: `Heard ${heard.name}`,
                body: `You can set ${heard.native} as your practice language in Settings.`,
              });
            }
          }
        }
        let report = upgraded
          ? analyseSpeech({
              sessionId: base.sessionId,
              mode: config.mode,
              capture: c,
              topicTitle: config.title,
              sampleAnswer: config.sampleAnswer,
              focusDimension: config.focusDimension,
              language: config.language,
            })
          : base;
        const llm = await fetchLlmFeedback(c.transcript, {
          mode: config.mode,
          wpm: report.metrics.wpm,
          fillerCount: report.metrics.fillerCount,
        });
        if (llm) {
          report = mergeLlmFeedback(report, llm.feedback, llm.model);
          upgraded = true;
        }
        if (upgraded) {
          await recordSession(sessionFor(report), report);
          window.dispatchEvent(new CustomEvent('osyn:report-updated', { detail: report.id }));
          toast({ tone: 'success', title: 'Report upgraded', body: 'Cloud transcript + examiner review merged in.' });
        }
      } catch {
        /* the local report stands */
      }
    })();
  };

  /* when the recorder finishes: paint local results, upgrade in background */
  useEffect(() => {
    if (recorder.phase !== 'done' || savedReportId) return;
    void (async () => {
      const capture = captureRef.current ?? (await recorder.stop());
      if (!capture) return;
      captureRef.current = capture;
      const blob = recorder.getAudioBlob();

      let c = capture;
      let whisperTried = false;
      if (wordsOf(capture.transcript) < 3) {
        // Nothing to paint yet: give Whisper ONE bounded rescue shot (consent-gated).
        setPhase('analyzing');
        if (blob && blob.size > 4096 && readConsent().recordingUpload) {
          whisperTried = true;
          const w = await transcribeWithWhisper(blob, getLanguage(config.language).whisper, config.title);
          if (w && wordsOf(w.text) >= 3) c = mergeWhisperIntoCapture(capture, w);
        }
        if (wordsOf(c.transcript) < 3) {
          recorder.reset();
          setTypedMode(true);
          setPhase('prep');
          toast({
            tone: 'warn',
            title: 'We could not hear enough speech',
            body: 'Check mic permission and your connection, try again — or type your answer below.',
          });
          return;
        }
      }

      setPhase('analyzing');
      // let the "analysing" state paint before the synchronous work
      await new Promise((r) => setTimeout(r, 60));
      const report = analyseSpeech({
        sessionId: uid('sess'),
        mode: config.mode,
        capture: c,
        topicTitle: config.title,
        sampleAnswer: config.sampleAnswer,
        focusDimension: config.focusDimension,
        language: config.language,
      });
      await recordSession(sessionFor(report), report);
      config.onSaved?.(report);
      if (blob) publishRecording(report.sessionId, blob);
      setSavedReportId(report.id);
      setPhase('saved');
      toast({
        tone: 'success',
        title: `Band ${report.band.toFixed(1)} · ${report.overall}/100`,
        body: 'Your feedback is ready.',
      });
      router.push(`/report?id=${report.id}`);
      upgradeInBackground(c, blob, report, whisperTried);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.phase]);

  const begin = () => {
    if (typedMode) return;
    setPrepLeft(config.prepSec ?? 0);
    if ((config.prepSec ?? 0) > 0) setPhase('countdown');
    else {
      setPhase('recording');
      void recorder.start();
    }
  };

  const submitTyped = () => {
    const text = typedText.trim();
    if (text.split(/\s+/).filter(Boolean).length < 5) {
      toast({ tone: 'warn', title: 'A little more, please', body: 'Type at least a few sentences so there is something to score.' });
      return;
    }
    captureRef.current = recorder.submitTyped(text, config.targetSec);
    // the save effect watches recorder.phase and will pick the capture up
  };

  const liveWords = recorder.transcript.trim() ? recorder.transcript.trim().split(/\s+/).length : 0;
  const liveWpm = recorder.elapsedMs > 4000 ? Math.round(liveWords / (recorder.elapsedMs / 60000)) : 0;

  return (
    <div className="mx-auto max-w-xl">
      <AnimatePresence mode="wait">
        {/* ------------ prep ------------ */}
        {phase === 'prep' && (
          <motion.div key="prep" exit={{ opacity: 0, y: -10 }}>
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-2xl">
                  {config.emoji ?? '🎙️'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand">
                    {config.prepSec ? `${config.prepSec}s to prepare` : 'ready when you are'} ·{' '}
                    {config.targetSec}s to speak
                  </p>
                  <h1 className="mt-1.5 font-display text-xl font-extrabold leading-snug text-ink">
                    {config.title}
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{config.prompt}</p>
                </div>
              </div>

              {config.cuePoints?.length ? (
                <div className="mt-5 space-y-2">
                  {config.cuePoints.map((point) => (
                    <div key={point} className="flex items-center gap-2.5 text-sm text-muted">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {point}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 space-y-2.5">
                <Button size="lg" block icon={<Mic className="h-[18px] w-[18px]" />} onClick={begin} disabled={!recorder.canRecord && !typedMode}>
                  {recorder.canRecord ? 'Start speaking' : 'Microphone unavailable'}
                </Button>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="ghost" size="sm" icon={<Keyboard className="h-4 w-4" />} onClick={() => setTypedMode(true)}>
                    No mic? Type it instead
                  </Button>
                </div>
                {!typedMode && (
                  <div className="rounded-xl border border-line bg-surface2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-muted">Mic check · 2.5 s — say anything</p>
                      <Button variant="secondary" size="sm" onClick={() => void mic.run()} disabled={mic.state === 'running'}>
                        {mic.state === 'running' ? `hearing… ${Math.round(mic.live * 100)}%` : 'Check microphone'}
                      </Button>
                    </div>
                    {mic.result && (
                      <p className={`mt-2 text-[11px] font-bold leading-snug ${mic.result.ok ? 'text-good' : 'text-warn'}`}>
                        {mic.result.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {typedMode ? (
              <Card className="mt-4 p-5">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">
                  Your answer (typed)
                </label>
                <textarea
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  rows={6}
                  autoFocus
                  className="mt-2 w-full resize-none rounded-xl border border-line bg-surface2 p-3 text-sm leading-relaxed text-ink outline-none focus:border-brand/60"
                  placeholder="Type exactly what you would say…"
                />
                <Button block className="mt-3" onClick={submitTyped}>
                  Analyse my answer
                </Button>
              </Card>
            ) : null}
          </motion.div>
        )}

        {/* ------------ countdown ------------ */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-10 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted">prepare your thoughts</p>
            <motion.span
              key={prepLeft}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="gradient-brand bg-clip-text font-display text-8xl font-extrabold text-transparent"
            >
              {prepLeft}
            </motion.span>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Structure in your head: <span className="text-ink">opening → example → close</span>.
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setPhase('prep'); recorder.cancel(); }}>
              Cancel
            </Button>
          </motion.div>
        )}

        {/* ------------ recording ------------ */}
        {phase === 'recording' && (
          <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="flex flex-col items-center gap-6 p-6 text-center">
              <div className="flex w-full items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-muted">
                  <span className="relative flex h-2.5 w-2.5">
                    {recorder.phase !== 'paused' && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bad opacity-60" />
                    )}
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${recorder.phase === 'paused' ? 'bg-warn' : 'bg-bad'}`} />
                  </span>
                  {recorder.phase === 'paused' ? 'paused' : 'recording'}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-ink">
                    {formatClock(recorder.elapsedMs)}
                  </span>
                  <span className="text-[11px] font-bold text-faint">/ {formatClock(config.targetSec * 1000)}</span>
                </span>
              </div>

              <div className="relative flex h-40 w-40 items-center justify-center">
                {recorder.phase === 'paused' ? (
                  <>
                    <span className="absolute inset-4 rounded-full bg-surface2" />
                    <button
                      onClick={() => void recorder.resume()}
                      aria-label="Resume recording"
                      className="tap gradient-brand relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-glow"
                    >
                      <Play className="h-8 w-8" fill="currentColor" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/30" />
                    <span className="absolute inset-4 rounded-full bg-brand/20" />
                    <button
                      onClick={() => void recorder.stop()}
                      aria-label="Stop recording"
                      className="tap gradient-brand relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-glow"
                    >
                      <Square className="h-8 w-8" fill="currentColor" />
                    </button>
                  </>
                )}
              </div>

              <Waveform levels={recorder.levels} live className="w-full" />

              <div className="min-h-[3.5rem] w-full rounded-xl border border-line bg-surface2 p-3">
                <p className="text-sm leading-relaxed text-muted">
                  {recorder.transcript || <span className="text-faint">Listening… start speaking.</span>}
                </p>
              </div>

              {/* live words / pace chip */}
              <div className="flex w-full items-center justify-between text-[11px] font-bold text-faint">
                <span>{liveWords} words</span>
                <span>{liveWpm > 0 ? `~${liveWpm} wpm` : 'pace —'}</span>
              </div>

              {recorder.elapsedMs > 8000 && !recorder.transcript && !recorder.error && (
                <p className="w-full text-left text-[11px] leading-snug text-faint">
                  Not catching words yet? Speak closer to the mic — cloud transcription will also try when you finish.
                </p>
              )}

              {recorder.error && recorder.error.code !== 'permission-denied' && (
                <div className="flex w-full items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-left">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                  <p className="text-xs font-bold leading-snug text-ink">{recorder.error.message}</p>
                </div>
              )}

              {nudge && isFresh(nudge) && (
                <div className="flex w-full items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-left">
                  <Lightbulb className="h-4 w-4 shrink-0 text-warn" />
                  <p className="text-xs font-bold text-ink">{nudge.text}</p>
                </div>
              )}

              <Progress value={(recorder.elapsedMs / (config.targetSec * 1000)) * 100} className="w-full" />
              <div className="flex items-center gap-2">
                {recorder.phase === 'recording' && (
                  <Button variant="secondary" size="sm" icon={<Pause className="h-3.5 w-3.5" />} onClick={() => recorder.pause()}>
                    Pause
                  </Button>
                )}
                <Button variant="secondary" size="sm" icon={<Square className="h-3.5 w-3.5" />} onClick={() => void recorder.stop()}>
                  Finish & get feedback
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ------------ analysing ------------ */}
        {(phase === 'analyzing' || recorder.phase === 'analysing') && (
          <motion.div key="analysing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-brand" />
              <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold text-ink">Analysing your speech</p>
              <p className="mt-1 text-sm text-muted">pronunciation · fluency · grammar · vocabulary · fillers · pace</p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              {['Pronunciation', 'Fluency', 'Grammar', 'Vocabulary'].map((label, i) => (
                <div key={label} className="h-2 overflow-hidden rounded-full bg-surface2">
                  <motion.div
                    className="gradient-brand h-full rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: ['15%', '85%'] }}
                    transition={{ duration: 1.1, delay: i * 0.15, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ------------ error ------------ */}
        {phase === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-bad/40 p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bad/15 text-bad">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-extrabold text-ink">Microphone problem</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {recorder.error?.message ?? 'The microphone could not be started.'}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => { setPhase('prep'); recorder.reset(); }}>
                      Try again
                    </Button>
                    <Button variant="secondary" size="sm" icon={<Keyboard className="h-4 w-4" />} onClick={() => { setPhase('prep'); setTypedMode(true); recorder.reset(); }}>
                      Type instead
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ------------ saved ------------ */}
        {phase === 'saved' && (
          <motion.div key="saved" className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-good" />
            <p className="font-display text-lg font-extrabold text-ink">Opening your feedback…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* capability footnote */}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-faint">
        <TimerIcon className="h-3 w-3" />
        On-device analysis · {recorder.capabilities.wordTimings ? 'word-level timing available' : 'timing estimated on this browser'}
      </p>
    </div>
  );
}
