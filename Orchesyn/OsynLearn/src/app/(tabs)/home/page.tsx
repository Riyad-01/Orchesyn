'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  Flame,
  FlaskConical,
  LineChart,
  Mic,
  MessageCircle,
  Repeat,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { computeDueReviews } from '@/lib/insights/mistakes';
import { useApp } from '@/lib/store/app';
import { coachNote } from '@/lib/insights/history-stats';
import { useT } from '@/lib/i18n/use-t';
import { smartNextActions, type NextAction } from '@/lib/insights/next-action';
import { examCountdown, paceAdvice, personalStartOrder, targetGap, type StartHref } from '@/lib/insights/personalize';
import { formatSeconds, localDateKey, relativeTime, scoreTone, TONE_VAR } from '@/lib/utils';
import { TOPICS, pickTopic } from '@/lib/data/topics';
import { DRILLS } from '@/lib/data/drills';
import { Badge, Button, Card, Progress, ScoreRing, SectionTitle, Stat } from '@/components/ui';

/**
 * "Today" — the daily dashboard.
 * Greeting, streak + daily goal, a recommended practice built from the weakest
 * dimension, the impromptu shortcut, and quick stats.
 */
const START_CARDS: Record<
  StartHref,
  { icon: any; tint: string; glow: string; title: string; blurb: string; cta: string; ctaTint: string }
> = {
  '/impromptu': { icon: Mic, tint: 'gradient-brand text-white', glow: 'bg-brand/20', title: '60-second magic', blurb: 'A random topic, one minute, instant feedback.', cta: 'start', ctaTint: 'text-brand' },
  '/coach': { icon: MessageCircle, tint: 'bg-accent/15 text-accent', glow: 'bg-accent/20', title: 'Chat with Sarah', blurb: '20+ themes and real scenarios, with live tips.', cta: 'open', ctaTint: 'text-accent' },
  '/ielts': { icon: BookOpen, tint: 'bg-warn/15 text-warn', glow: 'bg-warn/20', title: 'IELTS mock', blurb: 'Full Part 1-3 simulation with a band estimate.', cta: 'prepare', ctaTint: 'text-warn' },
  '/ai': { icon: Bot, tint: 'bg-brand/15 text-brand', glow: 'bg-brand/20', title: 'AI Tutor', blurb: '8 expert modes — grammar, vocab, IELTS, role-play.', cta: 'ask anything', ctaTint: 'text-brand' },
  '/lab': { icon: FlaskConical, tint: 'bg-accent/15 text-accent', glow: 'bg-accent/20', title: 'Fluency Lab', blurb: 'The 4/3/2 protocol — fluency gains you can see.', cta: 'run a lab', ctaTint: 'text-accent' },
};

export default function HomePage() {
  const { profile, streak, daily, sessions, achievements } = useApp();
  const t = useT();
  const note = useMemo(() => coachNote(sessions), [sessions]);

  const todaySec = daily[daily.length - 1]?.spokenSec ?? 0;
  const goalSec = (profile?.dailyGoalMin ?? 10) * 60;
  const weekSec = daily.slice(-7).reduce((a, d) => a + d.spokenSec, 0);
  const recent = sessions.slice(0, 4);
  const due = computeDueReviews(sessions).slice(0, 3);

  // weakest dimension over the last 10 sessions -> drives the recommendation
  const weakest = (() => {
    const agg: Record<string, number[]> = {};
    for (const s of sessions.slice(0, 10)) {
      for (const [k, v] of Object.entries(s.dimensionScores)) {
        if (typeof v === 'number' && v >= 0) (agg[k] ??= []).push(v);
      }
    }
    const entries = Object.entries(agg)
      .map(([k, values]) => [k, values.reduce((a, b) => a + b, 0) / values.length] as const)
      .filter(([k]) => k !== 'pace' || true)
      .sort((a, b) => a[1] - b[1]);
    return entries[0];
  })();

  const recommended = (() => {
    if (!weakest) return null;
    const drill = DRILLS.find((d) => d.dimension === weakest[0]) ?? DRILLS[0];
    return { drill, dimension: weakest[0], score: Math.round(weakest[1]) };
  })();

  const startOrder = personalStartOrder(weakest?.[0]);
  const countdown = examCountdown(profile?.examDate);
  const currentBand = useMemo(() => {
    const w = sessions.slice(0, 7).filter((x) => x.band > 0);
    return w.length ? Math.round((w.reduce((a, x) => a + x.band, 0) / w.length) * 10) / 10 : null;
  }, [sessions]);
  const gap = targetGap(currentBand, profile?.targetOverall);
  const advice = paceAdvice(gap, countdown);

  const todayTopic = pickTopic();

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Late night practice' : hour < 12 ? t('home.greeting.morning') : hour < 17 ? t('home.greeting.afternoon') : t('home.greeting.evening');

  const earned = achievements.filter((a) => a.earnedAt);

  return (
    <div className="space-y-5">
      {/* ---------------- header ---------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {greeting}, {profile?.name.split(' ')[0] ?? 'learner'}
          </h1>
        </div>
        <Link href="/progress" className="tap inline-flex h-10 items-center">
          <Badge tone="brand" className="px-3 text-xs">
            <LineChart className="h-3.5 w-3.5" />
            {t('nav.progress')}
          </Badge>
        </Link>
      </div>

      {!profile?.sectionLevels && (
        <Link
          href="/diagnostic"
          className="tap card flex min-w-0 items-center justify-between gap-3 border-dashed p-4 hover:border-brand/50"
        >
          <span className="min-w-0 text-sm font-extrabold text-ink">
            🩺 3-minute provisional screening — set your starting levels
          </span>
          <span className="shrink-0 text-xs font-bold text-brand">take it →</span>
        </Link>
      )}

      <CoachTip />
      <JumpBackIn />

      {/* smart coach note */}
      <Link href={note.href} className="tap card lift group flex items-center gap-3 border-brand/25 p-4" style={{ background: 'linear-gradient(120deg, rgb(var(--brand) / 0.10), transparent 60%)' }}>
        <span className="text-2xl" aria-hidden>{note.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-ink">{note.headline}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{note.body}</span>
        </span>
        <span className="shrink-0 rounded-xl bg-brand/15 px-3 py-1.5 text-xs font-extrabold text-brand group-hover:bg-brand/25">{note.cta}</span>
      </Link>

      {/* ---------------- goal + streak ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted">daily goal</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink">
                {formatSeconds(todaySec)}
                <span className="text-sm font-bold text-muted"> / {profile?.dailyGoalMin ?? 10} min</span>
              </p>
            </div>
            <div className="w-24">
              <Progress value={(todaySec / goalSec) * 100} className="h-2.5" />
              <p className="mt-1.5 text-right text-[11px] font-bold text-muted">
                {Math.round((todaySec / goalSec) * 100)}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {streak.goalMetToday
              ? 'Goal met — anything more is bonus momentum.'
              : `${formatSeconds(Math.max(0, goalSec - todaySec))} of speaking to hit today's goal.`}
          </p>
        </Card>

        <Card className="flex items-center gap-5 p-5">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-warn/12">
            <Flame className="h-7 w-7 text-warn" />
            {streak.atRisk ? <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-warn" /> : null}
          </div>
          <div className="flex-1">
            <p className="font-display text-2xl font-extrabold text-ink">
              {streak.current} day{streak.current === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-muted">
              {streak.atRisk ? 'Practice today to keep it alive.' : `Longest run: ${streak.longest} days.`}
            </p>
          </div>
          <StreakDots days={streak.days} />
        </Card>
      </div>

      {/* ---------------- exam plan (IELTS, data-driven) ---------------- */}
      {(countdown || advice) && profile?.goal === 'ielts' && (
        <Card className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-line/70 bg-surface2/50 p-4">
          {countdown && (
            <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
              📅 {countdown.days} {countdown.days === 1 ? 'day' : 'days'} to exam
              {countdown.urgent && (
                <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warn">
                  final stretch
                </span>
              )}
            </span>
          )}
          {currentBand != null && profile?.targetOverall ? (
            <span className="text-xs font-bold text-muted">
              measured ~{currentBand} vs target {profile.targetOverall}
            </span>
          ) : null}
          {advice && <span className="w-full text-xs leading-snug text-muted">{advice}</span>}
        </Card>
      )}

      {/* ---------------- start row, ordered by your weakest dimension ---------------- */}
      {weakest ? (
        <p className="text-[11px] font-semibold text-faint">
          ✨ start row ordered for your {weakest[0]} focus (~{Math.round(weakest[1])})
        </p>
      ) : null}
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
        {startOrder.map((href) => {
          const c = START_CARDS[href];
          const Icon = c.icon;
          return (
            <Link key={href} href={href} className="tap group card relative w-[230px] shrink-0 snap-start overflow-hidden p-5 sm:w-auto">
              <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-transform group-hover:scale-125 ${c.glow}`} />
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tint}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="mt-3 font-display text-base font-extrabold text-ink">{c.title}</h3>
              <p className="mt-1 text-xs leading-snug text-muted">{c.blurb}</p>
              <p className={`mt-3 flex items-center gap-1 text-xs font-bold ${c.ctaTint}`}>
                {c.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          );
        })}
      </div>

      {/* ---------------- spaced revisits ---------------- */}
      {due.length > 0 && (
        <Card className="p-5">
          <SectionTitle
            title="Due for a revisit"
            hint="Spaced practice: repeating a topic at growing intervals is the strongest fluency lever."
          />
          <div className="space-y-2.5">
            {due.map((d) => (
              <Link key={d.id} href={d.href} className="tap flex items-center gap-3 rounded-xl border border-line bg-surface p-3 hover:border-brand/40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/12 text-brand">
                  <Repeat className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-ink">{d.title}</span>
                  <span className="block text-[11px] text-muted">
                    {d.attempts}× done · last {relativeTime(d.lastAt)} · interval {d.intervalDays}d
                    {d.overdueDays > 0 ? ` · ${d.overdueDays}d overdue` : ''}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-faint" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* ---------------- recommendation + stats ---------------- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="p-5">
            <SectionTitle title="Recommended for today" hint="Built from your weakest dimension." />
            {recommended ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ScoreRing score={recommended.score} size={92} stroke={8} sublabel={recommended.dimension} />
                <div className="flex-1">
                  <p className="text-sm font-extrabold text-ink">{recommended.drill.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{recommended.drill.instruction}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/impromptu?drill=${recommended.drill.id}`}>
                      <Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>Start drill</Button>
                    </Link>
                    <Link href={`/impromptu?topic=${todayTopic.id}`}>
                      <Button size="sm" variant="secondary">Or: {todayTopic.title.slice(0, 26)}…</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Complete a session and I will build tomorrow's plan from your weakest dimension.
              </p>
            )}
          </Card>

          {/* recent sessions */}
          <div className="mt-4">
            <SectionTitle
              title="Recent sessions"
              action={
                <Link href="/history" className="text-xs font-bold text-brand hover:underline">
                  view all
                </Link>
              }
            />
            {recent.length ? (
              <div className="space-y-2">
                {recent.map((s) => (
                  <Link key={s.id} href={`/report?id=${s.reportId}`} className="tap block">
                    <Card className="flex items-center gap-4 p-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface2 text-sm font-extrabold" style={{ color: TONE_VAR[scoreTone(s.overall)] }}>
                        {s.overall}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{s.title}</p>
                        <p className="text-xs text-muted">
                          {modeLabel(s.mode)} · {formatSeconds(s.spokenSec)} · {relativeTime(s.startedAt)}
                        </p>
                      </div>
                      <Badge tone="neutral">band {Number(s.band).toFixed(1)}</Badge>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-5 text-center">
                <p className="text-sm text-muted">No sessions yet — your first one takes under two minutes.</p>
              </Card>
            )}
          </div>
        </div>

        {/* ---------------- right rail ---------------- */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <SectionTitle title="This week" hint={`${formatSeconds(weekSec)} spoken in 7 days`} />
            <WeekBars values={daily.slice(-7).map((d) => d.spokenSec)} goalSec={goalSec} />
          </Card>

          <Card className="p-5">
            <SectionTitle title="Achievements" />
            <div className="grid grid-cols-3 gap-2">
              {achievements.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className={
                    a.earnedAt
                      ? 'surface-inset flex flex-col items-center gap-1 p-2.5 text-center'
                      : 'flex flex-col items-center gap-1 rounded-xl border border-dashed border-line p-2.5 text-center opacity-45'
                  }
                >
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-[10px] font-bold leading-tight text-muted">{a.title}</span>
                </div>
              ))}
            </div>
            <Link href="/insights" className="mt-3 block text-center text-xs font-bold text-brand hover:underline">
              all {achievements.length} achievements
            </Link>
          </Card>

          <Link href="/roadmap" className="tap block">
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <CalendarDays className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-ink">Your day-wise roadmap</p>
                <p className="text-xs text-muted">A plan for every day, tuned to your goal.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-faint" />
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

function modeLabel(mode: string): string {
  const map: Record<string, string> = {
    impromptu: 'Impromptu',
    coach: 'Coach',
    drill: 'Drill',
    'ielts-part1': 'IELTS P1',
    'ielts-part2': 'IELTS P2',
    'ielts-part3': 'IELTS P3',
    toefl: 'Guide Library',
  };
  return map[mode] ?? mode;
}

function StreakDots({ days }: { days: string[] }) {
  const set = new Set(days);
  const dots: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dots.push(set.has(key));
  }
  return (
    <div className="flex gap-1">
      {dots.map((on, i) => (
        <span key={i} className={on ? 'h-2 w-2 rounded-full bg-warn' : 'h-2 w-2 rounded-full bg-line'} />
      ))}
    </div>
  );
}

function WeekBars({ values, goalSec }: { values: number[]; goalSec: number }) {
  const max = Math.max(...values, goalSec, 1);
  return (
    <div className="flex h-28 items-end gap-2">
      {values.map((v, i) => {
        const day = new Date();
        day.setDate(day.getDate() - (values.length - 1 - i));
        const label = day.toLocaleDateString(undefined, { weekday: 'narrow' });
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-md bg-surface2">
              <motion.div
                className={v >= goalSec ? 'w-full rounded-md bg-accent' : 'w-full rounded-md bg-brand/70'}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, (v / max) * 100)}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
            </div>
            <span className="text-[10px] font-bold text-faint">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * CoachTip — one-time orientation, dismissible, remembered on device
 * ------------------------------------------------------------------ */

function CoachTip() {
  const [hidden, setHidden] = useState(true); // start hidden to avoid hydration flash

  useEffect(() => {
    try {
      if (!window.localStorage.getItem('osyn:tip-dismissed')) setHidden(false);
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  return (
    <Card className="relative border-brand/30 bg-brand/8 p-4 pr-10">
      <button
        onClick={() => {
          try {
            window.localStorage.setItem('osyn:tip-dismissed', '1');
          } catch {
            /* private mode */
          }
          setHidden(true);
        }}
        aria-label="Dismiss tip"
        className="tap absolute right-1.5 top-1.5 flex h-10 w-10 items-center justify-center rounded-full text-faint hover:text-ink"
      >
        ✕
      </button>
      <p className="text-xs font-bold uppercase tracking-widest text-brand">how OsynLearn works</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Pick any prompt → speak naturally → get an instant report that <b>upgrades itself in the background</b>
        (first local scoring in under a second, then AI examiner details merge in live). Everything stays on
        this device unless you add cloud sync.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-faint">
        <span>🎧 IELTS now has Listening, Reading &amp; Writing too</span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * JumpBackIn — smart resume: your 3 most useful next taps
 * ------------------------------------------------------------------ */

function JumpBackIn() {
  const { sessions, streak, daily } = useApp();
  const t = useT();
  const [items, setItems] = useState<NextAction[]>([]);

  useEffect(() => {
    let dueCards = 0;
    let hasLastGuide = false;
    try {
      const srs = JSON.parse(window.localStorage.getItem('osyn:srs') ?? '[]') as { due: number }[];
      dueCards = srs.filter((c) => c.due <= Date.now()).length;
      hasLastGuide = Boolean(window.localStorage.getItem('osyn:guide-last'));
    } catch {
      /* fine */
    }
    const key = localDateKey();
    const today = daily.find((d) => d.date === key) ?? null;
    setItems(
      smartNextActions({
        sessions,
        streak,
        today,
        dueCards,
        hasLastGuide,
        hour: new Date().getHours(),
      }),
    );
  }, [sessions, streak, daily]);

  if (items.length === 0) return null;
  const [hero, ...rest] = items;

  return (
    <section aria-label={t('home.nextUp')} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold tracking-tight text-ink">{t('home.nextUp')}</h2>
        <span className="text-[11px] font-bold text-faint">~{hero.minutes} {t('common.min')}</span>
      </div>

      <Link href={hero.href} className="tap card lift group relative flex min-w-0 items-start gap-4 overflow-hidden border-brand/40 p-4 hover:border-brand/70">
        <span className="text-2xl" aria-hidden>{hero.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-ink group-hover:text-brand">{hero.label}</span>
          <span className="mt-0.5 block text-xs text-muted">{hero.sub}</span>
          <span className="mt-1.5 block text-[11px] font-semibold italic leading-snug text-brand/80">{hero.why}</span>
        </span>
        <span className="gradient-brand mt-1 hidden shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold text-white sm:block">
          {t('home.start')} →
        </span>
      </Link>

      {rest.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {rest.map((it) => (
            <Link key={it.label} href={it.href} className="tap card lift group flex min-w-0 items-center gap-3 p-3 hover:border-brand/50">
              <span className="shrink-0 text-lg" aria-hidden>{it.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold text-ink group-hover:text-brand">{it.label}</span>
                <span className="block truncate text-[11px] text-faint">{it.sub} · ~{it.minutes} {t('common.min')}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
