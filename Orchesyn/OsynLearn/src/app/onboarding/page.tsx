'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { useApp } from '@/lib/store/app';
import { Button, Chip, Progress } from '@/components/ui';
import { UI_LANGUAGES } from '@/lib/i18n/ui';
import { consumeOnboardingDestination } from '@/lib/onboarding-dest';
import type { AccentTarget, CEFRLevel, Goal } from '@/types';

type StepId = 'name' | 'level' | 'goal' | 'ielts' | 'time' | 'accent' | 'lang';

const GOALS: { id: Goal; label: string; emoji: string; blurb: string }[] = [
  { id: 'general', label: 'Everyday fluency', emoji: '💬', blurb: 'Speak naturally with anyone' },
  { id: 'ielts', label: 'IELTS Speaking', emoji: '🎓', blurb: 'Band 7+ with mocks & bands' },
  { id: 'interview', label: 'Job interviews', emoji: '🤝', blurb: 'Scenario practice & answers' },
  { id: 'career', label: 'Workplace English', emoji: '💼', blurb: 'Meetings, calls, presentations' },
  { id: 'study-abroad', label: 'Study abroad', emoji: '🌍', blurb: 'University & daily life' },
  { id: 'travel', label: 'Travel', emoji: '✈️', blurb: 'Airports, hotels, small talk' },
  { id: 'confidence', label: 'Confidence', emoji: '🦁', blurb: 'Kill the fear of speaking' },
];

const LEVELS: { id: CEFRLevel; label: string; blurb: string }[] = [
  { id: 'A2', label: 'A2 · Elementary', blurb: 'Simple sentences, lots of pauses' },
  { id: 'B1', label: 'B1 · Intermediate', blurb: 'I can hold a basic conversation' },
  { id: 'B2', label: 'B2 · Upper-intermediate', blurb: 'Comfortable, but I make mistakes' },
  { id: 'C1', label: 'C1 · Advanced', blurb: 'Fluent — polishing for band 8+' },
];

const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

/** First-run wizard: builds the profile the whole app personalises against. */
export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, profile } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name === 'Learner' ? '' : (profile?.name ?? ''));
  const [level, setLevel] = useState<CEFRLevel>(profile?.level ?? 'B1');
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'general');
  const [minutes, setMinutes] = useState(profile?.availableMinPerDay ?? 10);
  const [accent, setAccent] = useState<AccentTarget>(profile?.accentTarget ?? 'neutral');
  // IELTS-specific
  const [module, setModule] = useState<'academic' | 'general'>(profile?.ieltsModule ?? 'academic');
  const [targetOverall, setTargetOverall] = useState(profile?.targetOverall ?? 6.5);
  const [targetSpeaking, setTargetSpeaking] = useState(profile?.targetSpeaking ?? 6.5);
  const [sections, setSections] = useState<{ listening?: number; reading?: number; writing?: number }>(
    (profile?.targetSections ?? {}) as { listening?: number; reading?: number; writing?: number },
  );
  const [examDate, setExamDate] = useState(profile?.examDate ?? '');
  // explanation language
  const [uiLang, setUiLang] = useState<'en' | 'bn'>(profile?.uiLanguage ?? 'en');

  const [destination] = useState(() =>
    typeof window === 'undefined' ? null : consumeOnboardingDestination(),
  );

  // IELTS candidates get the exam-detail step; everyone else skips it.
  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ['name', 'level', 'goal'];
    if (goal === 'ielts') s.push('ielts');
    s.push('time', 'accent', 'lang');
    return s;
  }, [goal]);

  const next = () => {
    if (step === 0 && !name.trim()) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    void completeOnboarding({
      name: name.trim() || 'Learner',
      level,
      goal,
      availableMinPerDay: minutes,
      dailyGoalMin: Math.max(5, Math.min(minutes, 20)),
      accentTarget: accent,
      ...(goal === 'ielts'
        ? {
            ieltsModule: module,
            targetOverall,
            targetSpeaking,
            targetSections: { ...sections, speaking: targetSpeaking },
            examDate: examDate || undefined,
          }
        : {}),
      uiLanguage: uiLang,
    }).then(() => router.replace(destination ?? '/home'));
  };

  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-6">
      <div className="mb-8 flex justify-center">
        <Logo size={44} withWord />
      </div>

      <div className="mb-6">
        <Progress value={((step + 1) / steps.length) * 100} />
        <p className="mt-2 text-right text-[11px] font-bold text-faint">step {step + 1} of {steps.length}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={steps[step]}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
        >
          {steps[step] === 'name' && (
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">Welcome. What should your coach call you?</h1>
              <p className="mt-2 text-sm text-muted">OsynLearn is your AI speaking coach — 10 minutes a day changes how you sound.</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="mt-6 h-13 w-full rounded-2xl border border-line bg-surface px-5 py-4 text-base text-ink outline-none focus:border-brand/60"
              />
            </div>
          )}

          {steps[step] === 'level' && (
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">Where are you starting from?</h1>
              <p className="mt-2 text-sm text-muted">A provisional level — the engine re-measures you every session.</p>
              <div className="mt-6 space-y-2.5">
                {LEVELS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    className={`tap w-full rounded-2xl border p-4 text-left ${level === l.id ? 'border-brand/60 bg-brand/12' : 'border-line bg-surface hover:border-brand/30'}`}
                  >
                    <p className="text-sm font-extrabold text-ink">{l.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{l.blurb}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {steps[step] === 'goal' && (
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">What are you practising for?</h1>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`tap rounded-2xl border p-4 text-left ${goal === g.id ? 'border-brand/60 bg-brand/12' : 'border-line bg-surface hover:border-brand/30'}`}
                  >
                    <span className="text-xl">{g.emoji}</span>
                    <p className="mt-1.5 text-sm font-extrabold text-ink">{g.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted">{g.blurb}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {steps[step] === 'ielts' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-ink">Your IELTS, precisely.</h1>
                <p className="mt-2 text-sm text-muted">Mocks and tips tune themselves to your module and target.</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Module</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      { id: 'academic', label: 'Academic', blurb: 'University admission' },
                      { id: 'general', label: 'General Training', blurb: 'Migration & work' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModule(m.id)}
                      className={`tap rounded-2xl border p-4 text-left ${module === m.id ? 'border-brand/60 bg-brand/12' : 'border-line bg-surface hover:border-brand/30'}`}
                    >
                      <p className="text-sm font-extrabold text-ink">{m.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{m.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Target overall</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {BANDS.map((b) => (
                      <Chip key={b} active={targetOverall === b} onClick={() => setTargetOverall(b)} className="px-2.5 py-1">
                        {b}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-surface p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">Target speaking</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {BANDS.map((b) => (
                      <Chip key={b} active={targetSpeaking === b} onClick={() => setTargetSpeaking(b)} className="px-2.5 py-1">
                        {b}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Section targets (optional)</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['listening', 'reading', 'writing'] as const).map((k) => (
                    <label key={k} className="rounded-2xl border border-line bg-surface p-3">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">{k.slice(0, 1).toUpperCase() + k.slice(1, 3)}</span>
                      <select
                        value={sections[k] ?? ''}
                        onChange={(e) =>
                          setSections((prev) => ({ ...prev, [k]: e.target.value ? Number(e.target.value) : undefined }))
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface2 px-2 text-sm font-bold text-ink outline-none focus:border-brand/60"
                      >
                        <option value="">—</option>
                        {BANDS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-faint">Set what you know; mocks and pacing use whatever you give them.</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Exam date (optional)</p>
                <input
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-brand/60"
                />
                <p className="mt-1.5 text-[11px] text-faint">With a date, your plan counts down; without one, it simply builds.</p>
              </div>
            </div>
          )}

          {steps[step] === 'time' && (
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">How many minutes can you really give each day?</h1>
              <p className="mt-2 text-sm text-muted">Be honest — consistency beats intensity, and your streak protects you.</p>
              <div className="mt-8 rounded-3xl border border-line bg-surface p-6 text-center">
                <p className="gradient-brand bg-clip-text font-display text-6xl font-extrabold text-transparent">{minutes}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">minutes / day</p>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="mt-6 w-full accent-[rgb(var(--brand))]"
                />
                <div className="mt-2 flex justify-between text-[10px] font-bold text-faint">
                  <span>5m</span><span>30m</span><span>60m</span>
                </div>
              </div>
            </div>
          )}

          {steps[step] === 'accent' && (
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">Which accent are you aiming for?</h1>
              <p className="mt-2 text-sm text-muted">Your coach models this accent and tips you toward its rhythm.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {(['neutral', 'us', 'uk', 'au'] as AccentTarget[]).map((a) => (
                  <Chip key={a} active={accent === a} onClick={() => setAccent(a)} className="px-4 py-2.5 text-sm">
                    {a === 'neutral' ? '🌐 Neutral' : a === 'us' ? '🇺🇸 American' : a === 'uk' ? '🇬🇧 British' : '🇦🇺 Australian'}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {steps[step] === 'lang' && (
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">How should the app explain things?</h1>
              <p className="mt-2 text-sm text-muted">Menus and coaching copy — you still practise in your chosen speaking language.</p>
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {UI_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setUiLang(l.id)}
                    className={`tap rounded-2xl border p-4 text-left ${uiLang === l.id ? 'border-brand/60 bg-brand/12' : 'border-line bg-surface hover:border-brand/30'}`}
                  >
                    <p className="text-lg font-extrabold text-ink">{l.native}</p>
                    <p className="mt-0.5 text-xs text-muted">{l.label}</p>
                  </button>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 p-4">
                <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Ready, {name.trim() || 'learner'}.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Plan: {LEVELS.find((l) => l.id === level)?.label}, {GOALS.find((g) => g.id === goal)?.label.toLowerCase()}
                  {goal === 'ielts' ? ` · ${module === 'academic' ? 'Academic' : 'General Training'} · target ${targetOverall}` : ''}, {minutes} minutes a day.
                  Change any of it later in Settings.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={back}>Back</Button>
        ) : (
          <span />
        )}
        <Button size="lg" onClick={next} disabled={step === 0 && !name.trim()}>
          {step === steps.length - 1 ? 'Start my journey' : 'Continue'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
