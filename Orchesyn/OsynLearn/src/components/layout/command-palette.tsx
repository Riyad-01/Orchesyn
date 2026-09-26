'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked,
  BookOpen,
  Bot,
  CalendarDays,
  CornerDownLeft,
  FlaskConical,
  Gem,
  History as HistoryIcon,
  Home as HomeIcon,
  LineChart,
  LogIn,
  Mic,
  MessageCircle,
  Moon,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store/app';
import { PERSONAS } from '@/lib/ai/personas';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: 'Navigate' | 'Actions' | 'AI Tutor';
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

/** ⌘K / Ctrl-K command palette: fuzzy jump-to and quick actions. */
export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme, profile } = useApp();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const go = (href: string) => () => {
    setOpen(false);
    router.push(href);
  };

  const commands: Command[] = useMemo(() => {
    const nav: Command[] = [
      { id: 'home', label: 'Today', hint: 'Dashboard', group: 'Navigate', icon: HomeIcon, run: go('/home') },
      { id: 'speak', label: 'Speak · 60s impromptu', hint: 'Start speaking', group: 'Navigate', icon: Mic, run: go('/impromptu') },
      { id: 'coach', label: 'Coach Sarah', hint: 'Voice conversation', group: 'Navigate', icon: MessageCircle, run: go('/coach') },
      { id: 'ai', label: 'AI Tutor', hint: 'Powerful AI chat', group: 'Navigate', icon: Bot, run: go('/ai') },
      { id: 'lab', label: 'Fluency Lab', hint: '4/3/2 protocol', group: 'Navigate', icon: FlaskConical, run: go('/lab') },
      { id: 'ielts', label: 'IELTS', hint: 'Mocks & practice', group: 'Navigate', icon: BookOpen, run: go('/ielts') },
      { id: 'roadmap', label: 'Roadmap', hint: 'Day-wise plan', group: 'Navigate', icon: CalendarDays, run: go('/roadmap') },
      { id: 'insights', label: 'Insights', hint: 'Speech analytics', group: 'Navigate', icon: LineChart, run: go('/insights') },
      { id: 'mistakes', label: 'Mistake Book', hint: 'Recurring slips + fixes', group: 'Navigate', icon: BookMarked, run: go('/mistakes') },
      { id: 'history', label: 'History', hint: 'All sessions', group: 'Navigate', icon: HistoryIcon, run: go('/history') },
      { id: 'pricing', label: 'Plans', hint: 'Free / Plus / Pro', group: 'Navigate', icon: Gem, run: go('/pricing') },
      { id: 'settings', label: 'Settings', hint: 'Profile & data', group: 'Navigate', icon: Settings, run: go('/settings') },
      { id: 'login', label: profile?.onboardingCompleted ? 'Account' : 'Sign in', hint: 'Sync progress', group: 'Navigate', icon: LogIn, run: go('/login') },
    ];
    const actions: Command[] = [
      {
        id: 'theme',
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        group: 'Actions',
        icon: theme === 'dark' ? Sun : Moon,
        run: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
          setOpen(false);
        },
      },
      { id: 'speak2', label: 'Start a new 60-second speech', group: 'Actions', icon: Mic, run: go('/impromptu') },
    ];
    const ai: Command[] = PERSONAS.map((p) => ({
      id: `ai-${p.id}`,
      label: `${p.name}`,
      hint: p.tagline,
      group: 'AI Tutor' as const,
      icon: Bot,
      run: go('/ai'),
    }));
    return [...nav, ...actions, ...ai];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, profile, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ''} ${c.group}`.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => setActive(0), [query]);

  const runActive = () => {
    const cmd = filtered[active];
    if (cmd) cmd.run();
  };

  const groups = ['Navigate', 'AI Tutor', 'Actions'] as const;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 top-5 z-40 hidden items-center gap-2 rounded-lg border border-line bg-surface/80 px-2.5 py-1.5 text-xs text-muted backdrop-blur transition-colors hover:text-ink lg:flex"
        title="Command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Quick jump</span>
        <kbd className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
            >
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="h-4 w-4 text-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActive((a) => Math.min(a + 1, filtered.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      runActive();
                    } else if (e.key === 'Escape') {
                      setOpen(false);
                    }
                  }}
                  placeholder="Search pages, actions, AI modes…"
                  className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
                />
                <kbd className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-faint">esc</kbd>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted">No matches for “{query}”.</p>
                ) : (
                  groups.map((group) => {
                    const items = filtered.filter((c) => c.group === group);
                    if (!items.length) return null;
                    return (
                      <div key={group} className="mb-1">
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-faint">{group}</p>
                        {items.map((cmd) => {
                          const idx = filtered.indexOf(cmd);
                          const Icon = cmd.icon;
                          const isActive = idx === active;
                          return (
                            <button
                              key={cmd.id}
                              onMouseEnter={() => setActive(idx)}
                              onClick={cmd.run}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                                isActive ? 'bg-brand/15 text-ink' : 'text-muted hover:bg-surface2',
                              )}
                            >
                              <Icon className={cn('h-4 w-4', isActive ? 'text-brand' : '')} />
                              <span className="flex-1 text-sm font-semibold text-ink">{cmd.label}</span>
                              {cmd.hint ? <span className="text-xs text-faint">{cmd.hint}</span> : null}
                              {isActive ? <CornerDownLeft className="h-3.5 w-3.5 text-brand" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
