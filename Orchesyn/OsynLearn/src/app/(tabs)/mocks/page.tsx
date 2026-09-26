'use client';

import Link from 'next/link';
import { BookOpen, FileText, Mic } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { useT } from '@/lib/i18n/use-t';

/** Mock Tests hub — exam-day conditions with honest band estimates. */
export default function MocksPage() {
  const t = useT();
  const { mockResults, profile } = useApp();
  const last = mockResults[0];
  const lastSpeaking = last && last.parts.length
    ? Math.round((last.parts.reduce((a, x) => a + x.band, 0) / last.parts.length) * 10) / 10
    : null;
  const sec = profile?.targetSections ?? {};

  const cards = [
    {
      href: '/ielts',
      icon: BookOpen,
      title: `IELTS ${profile?.ieltsModule === 'general' ? 'General Training' : 'Academic'} suite`,
      blurb: 'Speaking Parts 1–3 plus Listening, Reading & Writing sections.',
      status: last ? `last overall ${last.overall}` : 'no mock yet',
    },
    {
      href: '/toefl/speaking',
      icon: Mic,
      title: 'TOEFL Speaking',
      blurb: 'Timed independent & integrated tasks, scored on four dimensions.',
      status: 'timed',
    },
    {
      href: '/ielts/writing',
      icon: FileText,
      title: 'Writing Task 1 & 2',
      blurb: 'Task-response, coherence, lexical and grammar checks.',
      status: 'band-checked',
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('mocks.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('mocks.sub')}</p>
        {profile?.targetOverall ? (
          <div className="mt-3 grid max-w-md grid-cols-4 gap-2">
            {(
              [
                ['L', sec.listening, null],
                ['R', sec.reading, null],
                ['W', sec.writing, null],
                ['S', profile.targetSpeaking ?? profile.targetOverall, lastSpeaking],
              ] as [string, number | undefined, number | null][]
            ).map(([k, tgt, measured]) => {
              const delta = tgt != null && measured != null ? Math.round((measured - tgt) * 10) / 10 : null;
              return (
                <div key={k} className="rounded-xl border border-line bg-surface p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{k}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-ink">{tgt ?? '—'}</p>
                  <p className={`text-[10px] font-bold ${delta == null ? 'text-faint' : delta >= 0 ? 'text-good' : 'text-warn'}`}>
                    {measured != null ? `${delta != null && delta >= 0 ? '+' : ''}${delta ?? ''} now ${measured}` : 'target'}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="tap card lift group flex items-start gap-3.5 p-4 hover:border-brand/50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn/15 text-warn">
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
    </div>
  );
}
