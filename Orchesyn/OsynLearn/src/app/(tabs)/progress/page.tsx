'use client';

import Link from 'next/link';
import { BookMarked, History as HistoryIcon, LineChart } from 'lucide-react';
import { Card } from '@/components/ui';
import { useApp } from '@/lib/store/app';
import { useT } from '@/lib/i18n/use-t';
import { historyStats } from '@/lib/insights/history-stats';
import { overallUnseenAccuracy, unseenAccuracy } from '@/lib/insights/mastery';
import { useMemo } from 'react';

/** Progress hub — the evidence trail: numbers first, detail one tap deep. */
export default function ProgressPage() {
  const t = useT();
  const { sessions, streak } = useApp();
  const st = useMemo(() => historyStats(sessions), [sessions]);

  const unseen = overallUnseenAccuracy();
  const tiles = [
    { v: unseen != null ? `${unseen}%` : '—', l: 'unseen accuracy' },
    { v: String(streak.current), l: t('home.streak') },
    { v: String(st.count), l: 'sessions' },
    { v: st.weekCount ? String(st.avg) : '—', l: '7-day avg' },
  ];

  const cards = [
    { href: '/insights', icon: LineChart, title: 'Insights', blurb: 'Dimensions, pace, fillers — the 360° view of your speech.' },
    { href: '/history', icon: HistoryIcon, title: 'History', blurb: 'Every session and report, filterable and re-doable.' },
    { href: '/mistakes', icon: BookMarked, title: 'Mistake Book', blurb: 'Every slip counted, scheduled for review until fixed.' },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('progress.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('progress.sub')}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.l} className="card p-4 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">{x.v}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">{x.l}</p>
          </div>
        ))}
      </div>

      <Card className="p-4">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted">Progress = performance on unseen material</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['listening', 'reading', 'writing', 'speaking'] as const).map((sk) => (
            <div key={sk} className="rounded-xl bg-surface2/70 p-2.5 text-center">
              <p className="text-sm font-extrabold text-ink">{unseenAccuracy(sk) != null ? `${unseenAccuracy(sk)}%` : '—'}</p>
              <p className="text-[10px] font-bold capitalize text-faint">{sk}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-faint">First-try accuracy on material you hadn't seen — streaks motivate, this is the evidence.</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="tap card lift group flex items-start gap-3.5 p-4 hover:border-brand/50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-good/15 text-good">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-ink group-hover:text-brand">{c.title}</span>
                <span className="mt-1 block text-xs leading-snug text-muted">{c.blurb}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
