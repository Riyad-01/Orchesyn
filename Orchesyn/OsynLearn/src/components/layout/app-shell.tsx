'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import {
  BookMarked,
  BookOpen,
  Bot,
  CalendarDays,
  ClipboardCheck,
  Dumbbell,
  Flame,
  FlaskConical,
  Gem,
  GraduationCap,
  History as HistoryIcon,
  Home as HomeIcon,
  LineChart,
  Mic,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useT } from '@/lib/i18n/use-t';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store/app';
import { Logo } from './logo';
import { Avatar, Sheet } from '@/components/ui';

/**
 * Five primary destinations — Today, Learn, Practise, Mock Tests, Progress.
 * Everything else (coach, vocab, mistake book, history, roadmap…) lives INSIDE
 * this journey; billing & settings hang off the profile.
 */
const PRIMARY = [
  { href: '/home', label: 'Today', tkey: 'nav.today', icon: HomeIcon },
  { href: '/learn', label: 'Learn', tkey: 'nav.learn', icon: GraduationCap },
  { href: '/practise', label: 'Practise', tkey: 'nav.practise', icon: Dumbbell },
  { href: '/mocks', label: 'Mocks', tkey: 'nav.mocks', icon: ClipboardCheck },
  { href: '/progress', label: 'Progress', tkey: 'nav.progress', icon: LineChart },
] as const;

const MORE = [
  { href: '/impromptu', label: 'Free Speak', icon: Mic, blurb: 'Random topic, one minute, instant feedback' },
  { href: '/coach', label: 'Coach', icon: MessageCircle, blurb: 'Scenario chats with live tips' },
  { href: '/ai', label: 'AI Tutor', icon: Bot, blurb: '8 expert modes — ask anything' },
  { href: '/interview', label: 'Live Interview', icon: Briefcase, blurb: 'It asks, listens & judges' },
  { href: '/lab', label: 'Fluency Lab', icon: FlaskConical, blurb: 'The 4/3/2 protocol · measured gains' },
  { href: '/ielts/study', label: 'Word Bank', icon: BookMarked, blurb: 'Spaced-repetition vocabulary' },
  { href: '/toefl', label: 'Guide Library', icon: GraduationCap, blurb: '60 illustrated guides' },
  { href: '/roadmap', label: 'Roadmap', icon: CalendarDays, blurb: 'Your day-wise plan' },
  { href: '/insights', label: 'Insights', icon: LineChart, blurb: '360° view of your speech' },
  { href: '/mistakes', label: 'Mistake Book', icon: BookMarked, blurb: 'Every slip, counted & fixed' },
  { href: '/history', label: 'History', icon: HistoryIcon, blurb: 'Every session and report' },
  { href: '/pricing', label: 'Plans', icon: Gem, blurb: 'Free / Plus / Pro' },
  { href: '/studio', label: 'Content Studio', icon: ClipboardCheck, blurb: 'Authoring workflow & coverage' },
  { href: '/teacher', label: 'Teacher', icon: GraduationCap, blurb: 'Invite, assign, review, monitor' },
  { href: '/admin', label: 'Platform Admin', icon: ShieldCheck, blurb: 'Billing, orgs, quality, support' },
  { href: '/settings', label: 'Settings', icon: Settings, blurb: 'Profile, engine, data' },
] as const;

/** Desktop sidebar grouping — the five destinations, one tap deep. */
type NavItem = { href: string; label: string; icon: typeof Settings; tkey?: string };
const ALL_NAV = [...PRIMARY, ...MORE] as unknown as NavItem[];
const pick = (...hrefs: string[]) => hrefs.map((h) => ALL_NAV.find((n) => n.href === h)).filter((n): n is NavItem => Boolean(n));
const NAV_GROUPS: { label: string; tkey?: string; items: NavItem[] }[] = [
  { label: 'Today', tkey: 'nav.today', items: pick('/home') },
  { label: 'Learn', tkey: 'nav.learn', items: pick('/learn', '/toefl', '/ielts/study', '/roadmap') },
  { label: 'Practise', tkey: 'nav.practise', items: pick('/practise', '/impromptu', '/coach', '/lab', '/interview', '/ai') },
  { label: 'Mock Tests', tkey: 'nav.mocks', items: pick('/mocks', '/ielts', '/toefl/speaking') },
  { label: 'Progress', tkey: 'nav.progress', items: pick('/progress', '/insights', '/history', '/mistakes') },
  { label: 'Account', items: pick('/pricing', '/studio', '/teacher', '/admin') },
];

/**
 * The app chrome:
 *   desktop  -> persistent left sidebar
 *   mobile   -> slim top bar + bottom tab bar with a raised record button,
 *               the 5th tab opens a "More" sheet
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, streak } = useApp();
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <div className="app-shell flex min-h-dvh bg-bg">
      {/* ---------- desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/60 backdrop-blur md:flex">
        <div className="px-5 pb-6 pt-6">
          <Link href="/home" className="inline-flex h-10 items-center">
            <Logo size={38} withWord />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.label} className="pt-3 first:pt-0">
              <p className="px-3.5 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-faint">{g.tkey ? t(g.tkey) : g.label}</p>
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-gradient-to-r from-brand/20 to-transparent text-ink shadow-[inset_2px_0_0_rgb(var(--brand))]'
                        : 'text-muted hover:bg-surface2 hover:text-ink',
                    )}
                  >
                    <Icon className={cn('h-[18px] w-[18px]', active ? 'text-brand' : '')} />
                    {item.tkey ? t(item.tkey) : item.label}
                    {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* streak + goal */}
        <div className="m-3 rounded-2xl border border-line bg-surface2 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
              <Flame className="h-4 w-4 text-warn" />
              {streak.current}
              <span className="text-xs font-bold text-muted">day streak</span>
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                streak.goalMetToday ? 'bg-good/15 text-good' : 'bg-surface text-muted',
              )}
            >
              {streak.goalMetToday ? 'goal met' : 'keep going'}
            </span>
          </div>
          <p className="mt-2 text-xs leading-snug text-muted">
            {streak.atRisk
              ? 'Your streak needs one more session today.'
              : 'A little every day beats a lot on Sunday.'}
          </p>
        </div>

        <div className="border-t border-line p-4">
          <Link href="/settings" className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-surface2">
            <Avatar name={profile?.name ?? 'Learner'} color={profile?.avatarColor ?? '#7C5CFF'} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{profile?.name ?? 'Learner'}</p>
              <p className="text-xs text-muted">
                {profile?.level} · {(profile?.plan ?? 'free').toUpperCase()}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ---------- main column ---------- */}
      <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col overflow-x-clip md:pl-64">
        {/* mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/home" className="inline-flex h-10 items-center">
            <Logo size={30} withWord />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/insights"
              className="flex h-10 items-center gap-1 rounded-full border border-line bg-surface2 px-3 text-xs font-extrabold text-ink"
            >
              <Flame className="h-3.5 w-3.5 text-warn" />
              {streak.current}
            </Link>
            <Link href="/settings" className="flex h-10 w-10 items-center justify-center" aria-label="Settings">
              <Avatar name={profile?.name ?? 'Learner'} color={profile?.avatarColor ?? '#7C5CFF'} size={30} />
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8">
          {children}
        </main>

        {/* ---------- mobile bottom nav ---------- */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 backdrop-blur md:hidden">
          <div className="mx-auto flex w-full max-w-md items-stretch pb-safe">
            {PRIMARY.slice(0, 2).map((tab) => (
              <MobileTab key={tab.href} href={tab.href} label={t(tab.tkey)} icon={tab.icon} active={isActive(tab.href)} />
            ))}

            {/* raised practise button — the heart of the app */}
            <div className="relative -mt-5 flex shrink-0 flex-col items-center">
              <Link
                href="/practise"
                aria-label={t('nav.practise')}
                className={cn(
                  'tap gradient-brand flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-glow',
                  isActive('/practise') || isActive('/impromptu') ? 'ring-2 ring-brand/60 ring-offset-2 ring-offset-bg' : '',
                )}
              >
                <Mic className="h-6 w-6" />
              </Link>
              <span className="mt-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-muted">{t('nav.practise')}</span>
            </div>

            {PRIMARY.slice(3).map((tab) => (
              <MobileTab key={tab.href} href={tab.href} label={t(tab.tkey)} icon={tab.icon} active={isActive(tab.href)} />
            ))}

            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pb-2 pt-3 text-muted',
                moreActive && 'text-brand',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav.more')}</span>
            </button>
          </div>
        </nav>

        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="space-y-1">
            {MORE.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-surface2"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-brand">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-ink">{item.label}</span>
                    <span className="block text-xs text-muted">{item.blurb}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Sheet>
      </div>
    </div>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: any;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pb-2 pt-3',
        active ? 'text-brand' : 'text-muted',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </Link>
  );
}
