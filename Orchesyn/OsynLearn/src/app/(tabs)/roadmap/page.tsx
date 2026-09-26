'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import { buildRoadmap, getDrill, DAY_TIPS } from '@/lib/data/drills';
import { useApp } from '@/lib/store/app';
import { SessionFlow } from '@/components/recorder/session-flow';
import type { Drill, RoadmapDay } from '@/types';
import { Badge, Button, Card, Chip, SectionTitle } from '@/components/ui';
import { localDateKey } from '@/lib/utils';

/**
 * Day-wise roadmap. The plan is regenerated from the learner's weakest
 * dimensions, and each item deep-links into the right flow. Individual drills
 * can also be started inline via ?drill=ID.
 */
export default function RoadmapPage() {
  const { profile, sessions, daily } = useApp();
  const params = useSearchParams();
  const drillFromUrl = params.get('drill');

  const [activeDrill, setActiveDrill] = useState<Drill | null>(() => getDrill(drillFromUrl ?? '') ?? null);
  const [daysCount, setDaysCount] = useState<7 | 14 | 30>(7);
  const [doneKeys, setDoneKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(window.localStorage.getItem('osyn:roadmap-done') ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });

  // checkmarks survive refreshes — progress is progress
  useEffect(() => {
    try {
      window.localStorage.setItem('osyn:roadmap-done', JSON.stringify([...doneKeys]));
    } catch {
      /* private mode */
    }
  }, [doneKeys]);

  const weakest = useMemo(() => {
    const agg: Record<string, number[]> = {};
    for (const s of sessions.slice(0, 12)) {
      for (const [k, v] of Object.entries(s.dimensionScores)) {
        if (typeof v === 'number' && v >= 0) (agg[k] ??= []).push(v);
      }
    }
    return Object.entries(agg)
      .map(([k, values]) => ({ dim: k, avg: values.reduce((a, b) => a + b, 0) / values.length }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)
      .map((x) => x.dim);
  }, [sessions]);

  const mastery = useMemo(() => {
    const agg: Record<string, number[]> = {};
    for (const s of sessions.slice(0, 12)) {
      for (const [k, v] of Object.entries(s.dimensionScores)) {
        if (typeof v === 'number' && v >= 0) (agg[k] ??= []).push(v);
      }
    }
    return Object.entries(agg)
      .map(([k, values]) => ({ dim: k, avg: values.reduce((a, b) => a + b, 0) / values.length }))
      .sort((a, b) => b.avg - a.avg);
  }, [sessions]);

  const roadmap = useMemo(
    () =>
      buildRoadmap({
        days: daysCount,
        minutesPerDay: profile?.availableMinPerDay ?? 10,
        goal: profile?.goal,
        weakest,
      }),
    [daysCount, profile, weakest],
  );

  if (activeDrill) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setActiveDrill(null)} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          back to roadmap
        </button>
        <SessionFlow
          key={activeDrill.id}
          config={{
            mode: 'drill',
            title: activeDrill.title,
            emoji: '🎯',
            prompt: `${activeDrill.instruction}\n\n${activeDrill.prompt}`,
            targetSec: activeDrill.seconds,
            prepSec: 15,
            focusDimension: activeDrill.dimension,
            drillId: activeDrill.id,
          }}
        />
      </div>
    );
  }

  const spokenToday = daily[daily.length - 1]?.spokenSec ?? 0;
  const todayIndex = Math.min(Math.floor(spokenToday > 0 ? sessions.length / 2 : 0) + 1, daysCount);

  const totalSessions = sessions.length;
  const doneCount = doneKeys.size;

  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl border border-line p-6 sm:p-7" style={{ background: 'linear-gradient(120deg, rgba(124,92,255,.2), rgba(6,214,160,.1) 50%, rgba(247,37,133,.12))' }}>
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-brand/20 blur-3xl" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">adaptive path</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Your Learning Path</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              Rebuilt daily from your weakest dimensions — right now targeting{' '}
              <span className="font-bold text-brand">{weakest.slice(0, 2).join(', ') || 'fluency'}</span>. {profile?.availableMinPerDay ?? 10} min/day is enough.
            </p>
          </div>
          <div className="flex gap-2">
            {([7, 14, 30] as const).map((d) => (
              <Chip key={d} active={daysCount === d} onClick={() => setDaysCount(d)}>{d} days</Chip>
            ))}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-black/25 p-3 text-center backdrop-blur">
            <p className="font-display text-xl font-extrabold text-ink">{totalSessions}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-faint">sessions logged</p>
          </div>
          <div className="rounded-2xl bg-black/25 p-3 text-center backdrop-blur">
            <p className="font-display text-xl font-extrabold text-ink">{doneCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-faint">steps completed</p>
          </div>
          <div className="rounded-2xl bg-black/25 p-3 text-center backdrop-blur">
            <p className="font-display text-xl font-extrabold text-ink">{mastery.length ? Math.round(mastery[0].avg) : '—'}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-faint">top skill score</p>
          </div>
        </div>
      </div>

      {/* skill mastery depth panel */}
      {mastery.length > 0 ? (
        <Card className="p-5">
          <SectionTitle title="Skill mastery" hint="measured from your last 12 sessions" />
          <div className="mt-3 space-y-3">
            {mastery.slice(0, 6).map((m) => (
              <div key={m.dim}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="capitalize text-ink">{m.dim}</span>
                  <span className="text-muted">
                    {m.avg >= 80 ? 'elite' : m.avg >= 65 ? 'strong' : m.avg >= 50 ? 'competent' : 'developing'} · {Math.round(m.avg)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, Math.round(m.avg))}%`, background: m.avg >= 65 ? 'var(--good)' : m.avg >= 50 ? 'var(--brand)' : 'var(--warn)' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            Deep-learning loop: the path schedules your lowest bars first, then re-measures after every session. Bars move; the plan follows.
          </p>
        </Card>
      ) : null}

      {/* timeline */}
      <div className="relative space-y-4 pl-6">
        <div className="absolute bottom-4 left-[13px] top-4 w-0.5 rounded-full bg-gradient-to-b from-brand via-accent to-good opacity-40" />
        {roadmap.map((day) => (
          <div key={day.day} className="relative">
            <span className={`absolute -left-6 top-6 h-3.5 w-3.5 rounded-full border-2 ${day.day === todayIndex ? 'border-brand bg-brand shadow-glow' : 'border-line bg-surface2'}`} />
            <DayCard day={day} doneKeys={doneKeys} onDone={(k) => setDoneKeys((prev) => new Set(prev).add(k))} onDrill={setActiveDrill} isToday={day.day === todayIndex} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCard({
  day,
  doneKeys,
  onDone,
  onDrill,
  isToday,
}: {
  day: RoadmapDay;
  doneKeys: Set<string>;
  onDone: (key: string) => void;
  onDrill: (d: Drill) => void;
  isToday: boolean;
}) {
  const drill = getDrill(day.items[0].id);
  return (
    <Card className={isToday ? 'border-brand/50 p-5 shadow-glow' : 'p-5'}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/12 font-display text-sm font-extrabold text-brand">
            {day.day}
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-ink">
              Day {day.day} · {day.title}
              {isToday ? <Badge tone="brand" className="ml-2">today</Badge> : null}
            </h3>
            <p className="text-xs text-muted">focus: {day.focus} · ~{day.minutes} min</p>
          </div>
        </div>
        <CalendarDays className="h-4 w-4 text-faint" />
      </div>

      <p className="mt-3 rounded-xl bg-surface2 px-3 py-2 text-xs leading-relaxed text-muted">💡 {day.tip}</p>

      <div className="mt-3 space-y-2">
        {day.items.map((item) => {
          const key = `${day.day}:${item.id}:${item.label}`;
          const done = doneKeys.has(key);
          const drillForItem = item.kind === 'drill' ? getDrill(item.id) : null;
          return (
            <div key={key} className="flex items-center gap-2.5">
              <button
                onClick={() => onDone(key)}
                className="tap -my-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-faint hover:text-good"
                aria-label={done ? 'completed' : 'mark complete'}
              >
                {done ? <CheckCircle2 className="h-[18px] w-[18px] text-good" /> : <Circle className="h-[18px] w-[18px]" />}
              </button>
              {drillForItem ? (
                <button onClick={() => onDrill(drillForItem)} className="tap flex min-h-11 flex-1 items-center rounded-lg border border-line bg-surface2 px-3 py-2 text-left text-xs font-bold text-ink hover:border-brand/40">
                  🎯 {item.label}
                </button>
              ) : item.kind === 'impromptu' ? (
                <Link href="/impromptu" className="flex min-h-11 flex-1 items-center rounded-lg border border-line bg-surface2 px-3 py-2 text-xs font-bold text-ink hover:border-brand/40">
                  🎙️ {item.label}
                </Link>
              ) : item.kind === 'coach' ? (
                <Link href="/coach" className="flex min-h-11 flex-1 items-center rounded-lg border border-line bg-surface2 px-3 py-2 text-xs font-bold text-ink hover:border-brand/40">
                  💬 {item.label}
                </Link>
              ) : item.kind === 'ielts' ? (
                <Link href="/ielts" className="flex min-h-11 flex-1 items-center rounded-lg border border-line bg-surface2 px-3 py-2 text-xs font-bold text-ink hover:border-brand/40">
                  🎓 {item.label}
                </Link>
              ) : (
                <Link href="/history" className="flex min-h-11 flex-1 items-center rounded-lg border border-line bg-surface2 px-3 py-2 text-xs font-bold text-ink hover:border-brand/40">
                  📖 {item.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
