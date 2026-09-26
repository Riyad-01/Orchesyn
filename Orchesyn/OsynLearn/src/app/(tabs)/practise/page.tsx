'use client';

import Link from 'next/link';
import { Bot, Briefcase, FlaskConical, MessageCircle, Mic } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { useT } from '@/lib/i18n/use-t';

/** Practise hub — every way to speak, one tap deep. */
export default function PractisePage() {
  const t = useT();
  const { sessions } = useApp();

  const lastFor = (modes: string[]) => {
    const s = sessions.find((x) => modes.includes(x.mode));
    return s ? `last: ${new Date(s.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${s.overall}` : 'not tried yet';
  };

  const cards = [
    { href: '/impromptu', icon: Mic, title: 'Free Speak', blurb: 'A random topic, one minute, instant feedback.', status: lastFor(['impromptu', 'drill']), min: 1 },
    { href: '/coach', icon: MessageCircle, title: 'Coach', blurb: 'Scenario conversations with live tips while you talk.', status: lastFor(['coach']), min: 3 },
    { href: '/lab', icon: FlaskConical, title: 'Fluency Lab', blurb: 'The 4/3/2 protocol — fluency gains you can measure.', status: lastFor(['lab']), min: 6 },
    { href: '/interview', icon: Briefcase, title: 'Live Interview', blurb: 'It asks, listens through your mic, and judges like a panel.', status: lastFor(['interview']), min: 10 },
    { href: '/ai', icon: Bot, title: 'AI Tutor', blurb: 'Eight expert modes — grammar, vocabulary, role-play, anything.', status: 'chat', min: 2 },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('practise.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('practise.sub')}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="tap card lift group flex items-start gap-3.5 p-4 hover:border-brand/50">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-extrabold text-ink group-hover:text-brand">{c.title}</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-faint">~{c.min} {t('common.min')}</span>
                </span>
                <span className="mt-1 block text-xs leading-snug text-muted">{c.blurb}</span>
                <span className="mt-1.5 block text-[10px] font-semibold text-faint">{c.status}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
