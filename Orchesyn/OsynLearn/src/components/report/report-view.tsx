'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Gauge,
  Highlighter,
  Lightbulb,
  MessageSquare,
  PenLine,
  Share2,
  Sparkles,
  Target,
  Type,
  Volume2,
} from 'lucide-react';
import type { FeedbackReport, DimensionKey } from '@/types';
import { bandLabel, bandToCefr } from '@/lib/scoring';
import { oneKeyTakeaway } from '@/lib/insights/mistakes';
import { prosodyFeedback } from '@/lib/insights/prosody';
import { getLanguage } from '@/lib/i18n/languages';
import { formatMs, pluralise, scoreTone, TONE_VAR, cn } from '@/lib/utils';
import { Accordion, Badge, Button, Card, ScoreBar, ScoreRing, SectionTitle, Stat } from '@/components/ui';
import { useApp } from '@/lib/store/app';
import { ManagedAssessmentPanel } from '@/components/report/managed-panel';
import { renderShareCard, shareCard } from '@/lib/share/card';
import { speak } from '@/lib/speech/tts';

/** Loora-style A/B: hear the corrected sentence spoken naturally, then imitate. */
function HearButton({ text, label }: { text: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<Volume2 className="h-3.5 w-3.5" />}
      loading={playing}
      onClick={() => {
        setPlaying(true);
        void speak(text, { rate: 0.95, onEnd: () => setPlaying(false), onError: () => setPlaying(false) });
      }}
    >
      {label}
    </Button>
  );
}

/** Share-loop: turn any report into a beautiful PNG card for WhatsApp/Instagram. */
function ShareReportButton({ report }: { report: FeedbackReport }) {
  const { profile, streak, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      const dims = report.dimensions.slice(0, 6).map((d) => ({ label: d.label, value: d.score }));
      const url = await renderShareCard({
        name: profile?.name ?? 'Learner',
        headline: `${report.overall} · est. band ${report.band.toFixed(1)}`,
        subtitle: `${report.metrics.wordCount} words · ${formatMs(report.metrics.durationMs)} of speaking`,
        dims,
        streak: streak.current,
      });
      const how = await shareCard(url, `osynlearn-report-${report.id}.png`, 'My OsynLearn speaking report');
      toast({ tone: 'success', title: how === 'shared' ? 'Shared!' : 'Card saved' });
    } catch {
      toast({ tone: 'bad', title: 'Could not create the card' });
    }
    setBusy(false);
  };
  return (
    <Button variant="secondary" size="sm" icon={<Share2 className="h-3.5 w-3.5" />} loading={busy} onClick={() => void share()}>
      Share progress card
    </Button>
  );
}

/** Hand the whole report to the LLM tutor for a plain-language coaching plan. */
function AskAiButton({ report }: { report: FeedbackReport }) {
  const dims = report.dimensions.map((d) => `${d.label} ${d.score}/100`).join(', ');
  const fillers = [...new Set(report.fillers.map((f) => f.phrase))].slice(0, 5).join(', ');
  const grammar = report.grammarIssues
    .slice(0, 4)
    .map((g) => `"${g.quote}" → ${g.correction}`)
    .join('; ');
  const prompt =
    `My latest speaking report: overall ${report.overall}/100, estimated band ${report.band.toFixed(1)}. ` +
    `Dimensions: ${dims}. Pace ${report.metrics.wpm} wpm. Fillers: ${fillers || 'none'}. Grammar issues: ${grammar || 'none'}. ` +
    `Transcript: "${report.transcript.slice(0, 240)}". ` +
    `Act as my coach: tell me the ONE most important thing to improve this week and give me one concrete 5-minute exercise.`;
  return (
    <Link href={`/ai?ask=${encodeURIComponent(prompt)}`}>
      <Button variant="secondary" size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>
        Ask AI about this report
      </Button>
    </Link>
  );
}

const DIM_ICON: Record<DimensionKey, any> = {
  pronunciation: Volume2,
  fluency: AudioLines,
  grammar: PenLine,
  vocabulary: Type,
  fillers: MessageSquare,
  pace: Gauge,
  clarity: Highlighter,
};

/**
 * The full feedback report. Every element maps to something the learner can act on:
 * score ring, dimension bars, evidence quotes, corrections, tips, and the next drill.
 */
export function ReportView({ report }: { report: FeedbackReport }) {
  const tone = scoreTone(report.overall);

  return (
    <div className="space-y-4">
      {/* ------------ hero ------------ */}
      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ScoreRing score={report.overall} size={150} stroke={12} sublabel="overall" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge tone="brand">est. band {report.band.toFixed(1)}</Badge>
              <Badge tone="mid">fast provisional · on-device</Badge>
              <Badge tone="neutral">{bandToCefr(report.band)} estimate</Badge>
              <Badge tone={tone === "none" ? "neutral" : tone}>{bandLabel(report.band)}</Badge>
              {report.typedFallback ? <Badge tone="mid">typed</Badge> : null}
              {report.language && getLanguage(report.language).whisper !== 'en' ? (
                <Badge tone="neutral">
                  {getLanguage(report.language).flag} {getLanguage(report.language).native}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-xl font-extrabold leading-snug text-ink">
              {report.overall >= 78
                ? 'Strong session — keep this energy.'
                : report.overall >= 55
                  ? 'Solid base. The next point is close.'
                  : 'Every session like this moves the needle.'}
            </h1>
            <p className="mt-2 flex items-start justify-center gap-1.5 text-sm font-bold text-accent sm:justify-start">
              <Target className="mt-0.5 h-4 w-4 shrink-0" />
              <span>One fix today: {oneKeyTakeaway(report)}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{report.coachNote}</p>
            {report.language && getLanguage(report.language).whisper !== 'en' ? (
              <p className="mt-2 text-xs leading-snug text-faint">
                Deep grammar & vocabulary tiers are English-first; this {getLanguage(report.language).name} session
                was scored on fluency, pace, fillers and clarity.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat value={formatMs(report.metrics.durationMs)} label="spoken" />
          <Stat value={`${report.metrics.wpm}`} label="wpm" tone={report.metrics.wpm >= 110 && report.metrics.wpm <= 165 ? 'good' : 'mid'} />
          <Stat value={report.metrics.fillerCount} label={`fillers · ${report.metrics.fillerRatePerMin}/min`} tone={report.metrics.fillerCount <= 2 ? 'good' : 'mid'} />
          <Stat value={report.metrics.errorCount} label={`grammar issues`} tone={report.metrics.errorCount === 0 ? 'good' : report.metrics.errorCount <= 3 ? 'mid' : 'bad'} />
        </div>

        <div className="mt-4 flex justify-center sm:justify-start">
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <ShareReportButton report={report} />
            <AskAiButton report={report} />
          </div>
        </div>
      </Card>

      {/* ------------ dimensions ------------ */}
      <Card className="p-5">
        <SectionTitle title="Your speaking breakdown" hint="Scored 0–100 against the IELTS-style band descriptors." />
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {report.dimensions.map((d) => {
            const Icon = DIM_ICON[d.key];
            return (
              <div key={d.key}>
                <div className="mb-1.5 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-brand" />
                  <span className="text-xs font-bold text-ink">{d.label}</span>
                  <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: TONE_VAR[scoreTone(d.score)] }}>
                    {d.score < 0 ? '—' : d.score}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: TONE_VAR[scoreTone(d.score)] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, d.score))}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-faint">{d.summary}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ------------ prosody: word stress & intonation (specialist layer) ------------ */}
      <ProsodyCard report={report} />

      {/* ------------ completed assessment (managed AI) vs provisional above ------------ */}
      <ManagedAssessmentPanel report={report} />

      {/* ------------ LLM understanding layer ------------ */}
      {report.llm?.improvements.length ? <LlmPlanCard report={report} /> : null}

      {/* ------------ strong / focus ------------ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-good" />
            <h3 className="text-sm font-extrabold text-ink">What worked</h3>
          </div>
          <ul className="space-y-2.5">
            {report.strongPoints.map((point) => (
              <li key={point} className="flex gap-2.5 text-sm leading-snug text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" />
                {point}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-warn" />
            <h3 className="text-sm font-extrabold text-ink">Where the next point is</h3>
          </div>
          {report.focusAreas.length ? (
            <ul className="space-y-2.5">
              {report.focusAreas.map((area) => (
                <li key={area} className="flex gap-2.5 text-sm leading-snug text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Nothing to fix at this level — push up by trying a harder topic or a full mock.
            </p>
          )}
        </Card>
      </div>

      {/* ------------ grammar corrections ------------ */}
      {report.grammarIssues.length ? (
        <Card className="p-5">
          <SectionTitle
            title="Grammar & phrasing corrections"
            hint={`${report.grammarIssues.length} ${pluralise(report.grammarIssues.length, 'issue')} found. Tap to expand.`}
          />
          <div className="space-y-2">
            {report.grammarIssues.map((issue, i) => (
              <Accordion
                key={`${issue.ruleId}-${i}`}
                title={issue.quote}
                subtitle={issue.category}
                badge={<Badge tone={issue.severity === 'bad' ? 'bad' : 'mid'}>{issue.category}</Badge>}
                defaultOpen={i === 0}
              >
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="line-through decoration-bad/70 text-bad">{issue.quote}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-faint" />
                    <span className="font-bold text-good">{issue.correction}</span>
                  </div>
                  <HearButton text={issue.correction} label="Hear the fix" />
                  <p className="leading-relaxed text-muted">{issue.explanation}</p>
                </div>
              </Accordion>
            ))}
          </div>
        </Card>
      ) : report.metrics.wordCount >= 4 ? (
        <Card className="flex items-center gap-3 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-good/12 text-good">
            <PenLine className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-ink">No grammatical errors detected</p>
            <p className="text-xs text-muted">
              Checked against 23 error patterns — tenses, articles, agreement, plurals, prepositions, double negatives and more. Accuracy this clean is what band 7+ demands.
            </p>
          </div>
        </Card>
      ) : null}

      {/* ------------ fillers ------------ */}
      {report.fillers.length ? (
        <Card className="p-5">
          <SectionTitle title="Filler words & pauses" hint="Replace each one with a confident silent pause." />
          <div className="flex flex-wrap gap-2">
            {report.fillers.map((f, i) => (
              <span key={`${f.phrase}-${i}`} className={cn('chip', f.phrase.length > 6 ? 'border-warn/40 bg-warn/10 text-warn' : 'border-bad/40 bg-bad/10 text-bad')}>
                {f.phrase}
                {formatMs(f.atMs) !== '0s' ? <span className="text-faint">@ {formatMs(f.atMs)}</span> : null}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ------------ vocabulary highlights ------------ */}
      {report.vocabHighlights.length ? (
        <Card className="p-5">
          <SectionTitle title="Less common words you used well" hint="Lexical range is a direct band lever." />
          <div className="flex flex-wrap gap-2">
            {report.vocabHighlights.slice(0, 14).map((v) => (
              <span key={`${v.word}-${v.wordIndex}`} className="chip border-good/30 bg-good/10 text-good">
                {v.word}
                <span className="text-faint">tier {v.tier}</span>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ------------ pronunciation flags ------------ */}
      {report.pronunciationFlags.length ? (
        <Card className="p-5">
          <SectionTitle title="Words to drill" hint={report.engine === 'cloud' ? 'Phoneme-level accuracy.' : 'Estimated from recogniser confidence and syllable timing.'} />
          <div className="space-y-2.5">
            {report.pronunciationFlags.slice(0, 6).map((flag) => (
              <div key={`${flag.word}-${flag.wordIndex}`} className="surface-inset flex items-start gap-3 p-3">
                <span className="font-display text-sm font-extrabold text-ink">{flag.word}</span>
                <p className="text-xs leading-snug text-muted">{flag.reason}</p>
                <span className="ml-auto shrink-0 text-xs font-bold" style={{ color: TONE_VAR[scoreTone(flag.score)] }}>
                  {flag.score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* ------------ transcript ------------ */}
      <Card className="p-5">
        <SectionTitle
          title="Your transcript"
          hint={`${report.engine === 'cloud' ? 'Whisper cloud' : report.engine === 'manual' ? 'typed' : 'on-device'} · ${report.metrics.wordCount} words · ${report.metrics.sentenceCount} sentences · avg ${report.metrics.avgSentenceLength} words per sentence`}
        />
        {report.transcript ? (
          <p className="text-sm leading-7 text-muted">
            {highlightTranscript(report)}
          </p>
        ) : (
          <div className="space-y-2 text-sm text-muted">
            <p className="font-bold text-ink">No speech was captured this time.</p>
            <p className="text-xs leading-relaxed">
              Usual causes: mic permission blocked, a weak network for live captions, or speaking far from the mic.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed">
              <li>Check the lock icon → site settings → allow the microphone, then retry.</li>
              <li>Speak close to the mic; street noise confuses captions.</li>
              <li>On weak networks the cloud Whisper backup also needs internet — move to a stronger signal, or use “Type it instead”.</li>
            </ul>
          </div>
        )}
      </Card>

      {/* ------------ sample answer ------------ */}
      {report.sampleAnswer ? (
        <Card className="border-brand/30 p-5">
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-extrabold text-ink">Model answer (~band 7)</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted">{report.sampleAnswer}</p>
          <div className="mt-2">
            <HearButton text={report.sampleAnswer ?? ''} label="Hear it like a native" />
          </div>
        </Card>
      ) : null}

      {/* ------------ next drill ------------ */}
      {report.nextDrills.length ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-extrabold text-ink">Your next drills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.nextDrills.map((drill) => (
              <Link key={drill.drillId} href={`/roadmap?drill=${drill.drillId}`}>
                <Button variant="accent" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                  {drill.title}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Render the transcript with fillers highlighted red, grammar issues underlined,
 * and good vocabulary highlighted green — the same trick real coaches use.
 */
function highlightTranscript(report: FeedbackReport) {
  const tokens = report.transcript.split(/\s+/).filter(Boolean);
  const fillersAt = new Set(report.fillers.flatMap((f) => {
    const span = f.phrase.split(/\s+/).length;
    return Array.from({ length: span }, (_, k) => f.wordIndex + k);
  }));
  const grammarAt = new Map<number, string>();
  for (const g of report.grammarIssues) grammarAt.set(g.wordIndex, g.category);
  const vocabAt = new Set(report.vocabHighlights.map((v) => v.wordIndex));

  return tokens.map((token, i) => {
    let cls = '';
    if (fillersAt.has(i)) cls = 'rounded bg-bad/15 px-1 font-semibold text-bad';
    else if (grammarAt.has(i)) cls = 'underline decoration-warn decoration-2 underline-offset-4 text-ink';
    else if (vocabAt.has(i)) cls = 'rounded bg-good/12 px-1 font-semibold text-good';
    return (
      <span key={i} className={cls ? cn(cls) : undefined}>
        {token}{' '}
      </span>
    );
  });
}

/** Specialist prosody layer: word stress, rhythm & intonation proxies. */
function ProsodyCard({ report }: { report: FeedbackReport }) {
  const p = prosodyFeedback({
    words: report.words,
    envelope: report.audioEnvelope ?? [],
    pitch: report.audioPitch,
    pauses: report.pauses,
    durationMs: report.metrics.durationMs,
    typedFallback: report.typedFallback,
  });
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <AudioLines className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-extrabold text-ink">Word stress & intonation</h3>
        <span
          className="ml-auto text-xs font-bold tabular-nums"
          style={{ color: TONE_VAR[scoreTone(p.score)] }}
        >
          {p.score < 0 ? '—' : `${p.score}/100`}
        </span>
      </div>
      <ul className="space-y-2">
        {p.notes.map((n) => (
          <li key={n} className="flex gap-2.5 text-sm leading-snug text-muted">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            {n}
          </li>
        ))}
      </ul>
      {p.tips.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface2 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Coach tips</p>
          <ul className="mt-1.5 space-y-1.5">
            {p.tips.map((t) => (
              <li key={t} className="text-xs leading-snug text-muted">
                • {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Understanding layer: the cloud examiner's plan for this exact answer. */
function LlmPlanCard({ report }: { report: FeedbackReport }) {
  const llm = report.llm;
  if (!llm) return null;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-extrabold text-ink">Examiner's improvement plan</h3>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-faint">{llm.model}</span>
      </div>
      {llm.organization ? <p className="mb-3 text-sm leading-relaxed text-muted">{llm.organization}</p> : null}
      <ol className="space-y-2">
        {llm.improvements.map((step, i) => (
          <li key={step} className="flex gap-2.5 text-sm leading-snug text-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-extrabold text-brand">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {llm.cefr ? (
        <p className="mt-3 text-xs text-faint">Examiner's CEFR read: {llm.cefr} — cross-checks your band estimate.</p>
      ) : null}
    </Card>
  );
}
