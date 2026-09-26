'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookMarked, BookOpen, CalendarDays, GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui';
import { useT } from '@/lib/i18n/use-t';
import { useApp } from '@/lib/store/app';
import { buildAdaptivePlan, reschedule } from '@/lib/curriculum/planner';
import { lessonById } from '@/lib/curriculum/curriculum';
import { localDateKey } from '@/lib/utils';
import { ALL_GUIDES } from '@/lib/data/guides';
import { buildRoadmap } from '@/lib/data/drills';

/** Learn hub — the input side: guides, words, plan. One tap to each. */
export default function LearnPage() {
  const t = useT();
  const { profile } = useApp();
  const [readCount, setReadCount] = useState(0);
  const [dueCards, setDueCards] = useState(0);
  const [roadmapDone, setRoadmapDone] = useState(0);
  const [roadmapTotal, setRoadmapTotal] = useState(0);

  const levels = profile?.sectionLevels;
  const plan = useMemo(() => {
    let overdue = 0;
    try {
      const srs = JSON.parse(window.localStorage.getItem('osyn:srs') ?? '[]') as { due: number }[];
      overdue = srs.filter((c) => c.due <= Date.now()).length;
    } catch { /* fine */ }
    const days = buildAdaptivePlan({
      levels: levels ?? {},
      targets: profile?.targetSections,
      minutesPerDay: profile?.availableMinPerDay ?? 10,
      overdueReviews: overdue,
      days: 7,
    });
    return reschedule(days, new Set(), localDateKey());
  }, [levels, profile]);
  const today = plan.find((d) => d.date === localDateKey());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    try {
      const read = JSON.parse(window.localStorage.getItem('osyn:guides-read') ?? '[]') as string[];
      setReadCount(read.length);
      const srs = JSON.parse(window.localStorage.getItem('osyn:srs') ?? '[]') as { due: number }[];
      setDueCards(srs.filter((c) => c.due <= Date.now()).length);
      const done = JSON.parse(window.localStorage.getItem('osyn:roadmap-done') ?? '[]') as string[];
      setRoadmapDone(done.length);
      setRoadmapTotal(buildRoadmap({ minutesPerDay: profile?.availableMinPerDay ?? 10, days: 7, goal: profile?.goal }).reduce((n, d) => n + d.items.length, 0));
    } catch {
      /* fine */
    }
  }, []);

  const cards = [
    {
      href: '/toefl',
      icon: GraduationCap,
      title: 'Guide Library',
      blurb: '60 illustrated guides on vocabulary, career & interviews.',
      status: `${readCount}/${ALL_GUIDES.length} read`,
    },
    {
      href: '/ielts/study',
      icon: BookMarked,
      title: 'Word Bank',
      blurb: 'Spaced-repetition cards built from your own sessions.',
      status: dueCards > 0 ? `${dueCards} due now` : 'all fresh',
    },
    {
      href: '/roadmap',
      icon: CalendarDays,
      title: 'Roadmap',
      blurb: 'A day-wise plan sized to the minutes you actually have.',
      status: roadmapTotal ? `${roadmapDone}/${roadmapTotal} done` : 'not started',
    },
    {
      href: '/ielts',
      icon: BookOpen,
      title: 'IELTS Study Kit',
      blurb: 'Listening, Reading & Writing practice with honest scoring.',
      status: '4 skills',
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('learn.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('learn.sub')}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="tap card lift group flex items-start gap-3.5 p-4 hover:border-brand/50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-extrabold text-ink group-hover:text-brand">{c.title}</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-faint">{c.status}</span>
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted">{c.blurb}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-extrabold text-ink">Diagnostics</p>
          <p className="mt-0.5 text-xs text-muted">
            {levels ? `Provisional-to-confirmed levels: ${Object.entries(levels).map(([k, v]) => `${k} ${v}`).join(' · ')}` : 'No levels yet — take the 3-minute provisional screening.'}
          </p>
        </div>
        <Link href="/diagnostic" className="tap inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-extrabold text-white">
          {levels ? 'Re-assess' : 'Take screening'}
        </Link>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted">This week · adaptive plan</p>
        <p className="mt-1 text-[11px] text-faint">All four skills weekly; extra time goes to weak and under-target sections. Missed days roll forward — never more than two onto one day.</p>
        <div className="mt-3 space-y-2">
          {(today?.items ?? []).map((it, i) =>
            it.lessonId === '__review__' ? (
              <Link key={i} href="/ielts/study" className="tap flex min-h-11 items-center justify-between rounded-xl border border-line bg-surface2/60 px-3 text-xs font-bold text-ink">
                <span>🃏 overdue review</span><span className="text-faint">{it.minutes} min</span>
              </Link>
            ) : (
              <Link key={i} href={`/lesson?id=${it.lessonId}`} className="tap flex min-h-11 items-center justify-between rounded-xl border border-line bg-surface2/60 px-3 text-xs font-bold text-ink hover:border-brand/40">
                <span className="truncate">{it.kind === 'rescheduled' ? '↻ ' : ''}{lessonById(it.lessonId)?.title ?? it.lessonId}</span>
                <span className="ml-2 shrink-0 text-faint">{it.skill} · {it.minutes} min</span>
              </Link>
            ),
          )}
          {(today?.items.length ?? 0) === 0 && <p className="text-xs text-muted">Nothing due today — the plan starts tomorrow.</p>}
        </div>
      </Card>

      <Card className="border-line/60 bg-surface2/40 p-4">
        <p className="text-xs leading-relaxed text-muted">
          Learn feeds Practise: words you collect become speaking prompts, guides become interview answers,
          and the roadmap sequences both around your exam date.
        </p>
      </Card>
    </div>
  );
}
