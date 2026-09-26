'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookMarked, Briefcase, GraduationCap, Lightbulb, Search, Sparkles } from 'lucide-react';
import { ALL_GUIDES, filterGuides, getGuide, relatedGuides, type GuideArticle } from '@/lib/data/guides';
import { GuideCover, GuideInfographic } from '@/components/guides/art';
import { Badge, Card, Chip, SectionTitle } from '@/components/ui';
import { useApp } from '@/lib/store/app';

/**
 * Guide Library — 20 Learning & Motivation articles + 20 Career Guide articles,
 * each with unique cover art and a data infographic. TOEFL Speaking practice
 * lives one tap away at /toefl/speaking.
 */

export default function GuideLibraryPage() {
  const { toast } = useApp();
  const [cat, setCat] = useState<'learn' | 'career' | 'interview'>('learn');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRead(JSON.parse(window.localStorage.getItem('osyn:guides-read') ?? '[]') as string[]);
      setLastId(window.localStorage.getItem('osyn:guide-last'));
    } catch {
      /* private mode */
    }
  }, []);

  const openArticle = (id: string) => {
    setOpenId(id);
    setLastId(id);
    setRead((r) => {
      const next = r.includes(id) ? r : [...r, id];
      try {
        window.localStorage.setItem('osyn:guides-read', JSON.stringify(next));
        window.localStorage.setItem('osyn:guide-last', id);
      } catch {
        /* fine */
      }
      return next;
    });
  };

  const open = openId ? getGuide(openId) : undefined;

  if (open) {
    return <Reader a={open} onBack={() => setOpenId(null)} onOpen={openArticle} />;
  }

  const list = filterGuides(q, cat);
  const lastGuide = lastId ? getGuide(lastId) : undefined;

  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="relative overflow-hidden rounded-3xl border border-line p-6 sm:p-8" style={{ background: 'linear-gradient(120deg, rgba(124,92,255,.22), rgba(76,201,240,.12) 45%, rgba(247,37,133,.14))' }}>
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/20 text-brand">
            <BookMarked className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Guide Library</h1>
            <p className="text-sm text-muted">
              {ALL_GUIDES.length} illustrated guides — learning science, motivation, career and a full interview masterclass. Read in minutes, apply for years.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="brand"><Lightbulb className="h-3 w-3" /> 20 learn & motivate</Badge>
          <Badge tone="brand"><Briefcase className="h-3 w-3" /> 20 career guide</Badge>
          <Badge tone="brand"><Sparkles className="h-3 w-3" /> 20 interview masterclass</Badge>
          <Badge tone="neutral"><Sparkles className="h-3 w-3" /> every article ships cover art + infographic</Badge>
        </div>
      </div>

      {/* continue reading */}
      {lastGuide && !q ? (
        <button onClick={() => openArticle(lastGuide.id)} className="tap card lift flex w-full items-center gap-3 border-brand/40 p-3 text-left">
          <span className="text-xl" aria-hidden>📖</span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">Continue reading: {lastGuide.title}</span>
          {read.includes(lastGuide.id) ? <Badge tone="good">read ✓</Badge> : null}
          <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
        </button>
      ) : null}

      {/* category switch + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Chip active={cat === 'learn'} onClick={() => setCat('learn')}>💡 Learning & Motivation</Chip>
          <Chip active={cat === 'career'} onClick={() => setCat('career')}>💼 Career Guide</Chip>
          <Chip active={cat === 'interview'} onClick={() => setCat('interview')}>🎤 Interview Mastery</Chip>
        </div>
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 40 guides…"
            className="w-full rounded-xl border border-line bg-surface2 py-2 pl-9 pr-3 text-xs font-semibold text-ink outline-none placeholder:text-faint focus:border-brand/50"
          />
        </div>
      </div>

      {/* category banner (real photograph) */}
      <div className="relative h-28 overflow-hidden rounded-2xl border border-line sm:h-36">
        <Image
          src={cat === 'learn' ? '/guides/learn-banner.jpg' : cat === 'career' ? '/guides/career-banner.jpg' : '/guides/interview-banner.jpg'}
          alt={cat === 'learn' ? 'Learning and motivation' : cat === 'career' ? 'Career guide' : 'Interview mastery'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 900px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <p className="font-display text-lg font-extrabold text-white sm:text-xl">
            {cat === 'learn' ? 'Learning & Motivation' : cat === 'career' ? 'Career Guide' : 'Interview Mastery'}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-white/80">
            {list.length} guide{list.length === 1 ? '' : 's'} · you have read {read.length}/{ALL_GUIDES.length}
          </p>
        </div>
      </div>

      {/* article grid */}
      {list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No guide matches “{q}”. Try a tag like <b>memory</b>, <b>habits</b>, <b>interviews</b> or <b>AI</b>.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <button key={a.id} onClick={() => openArticle(a.id)} className="tap card lift group relative overflow-hidden p-0 text-left hover:border-brand/50">
              {read.includes(a.id) ? (
                <span className="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-extrabold text-good backdrop-blur">✓ read</span>
              ) : null}
              <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                <GuideCover a={a} />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-extrabold leading-snug text-ink group-hover:text-brand">{a.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{a.intro}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-faint">
                  <span>{a.minutes} min read</span>
                  <span className="flex items-center gap-1 text-brand opacity-0 transition-opacity group-hover:opacity-100">
                    read <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* TOEFL practice block */}
      <SectionTitle title="Exam practice" hint="the library's workout room" />
      <Link href="/toefl/speaking" className="tap card group flex flex-wrap items-center justify-between gap-3 border-accent/30 p-5 hover:border-accent/60">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-ink group-hover:text-accent">TOEFL Speaking Practice</h3>
            <p className="text-xs text-muted">2026 format · Listen-&-Repeat + Interview · ETS-style rubric</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
      </Link>

      {/* reading streak nudge */}
      <button
        onClick={() =>
          toast({ tone: 'info', title: 'Reading tip', body: 'One guide a day = 40 new mental models in under two months. Start with the 10-Minute Rule.' })
        }
        className="tap w-full rounded-2xl border border-dashed border-line p-4 text-center text-xs font-bold text-muted hover:border-brand/40 hover:text-brand"
      >
        Not sure where to start? Tap for a suggestion ✨
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Reader({ a, onBack, onOpen }: { a: GuideArticle; onBack: () => void; onOpen: (id: string) => void }) {
  const related = relatedGuides(a);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> back to Guide Library
      </button>

      <div className="overflow-hidden rounded-3xl shadow-card">
        <GuideCover a={a} tall />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{a.cat === 'learn' ? 'Learning & Motivation' : a.cat === 'career' ? 'Career Guide' : 'Interview Mastery'}</Badge>
        <Badge tone="neutral">{a.tag}</Badge>
        <Badge tone="neutral">{a.minutes} min read</Badge>
      </div>

      <p className="font-display text-lg font-bold leading-relaxed text-ink">{a.intro}</p>

      {/* infographic */}
      <div className="text-ink">
        <GuideInfographic a={a} />
      </div>

      <div className="space-y-4">
        {a.body.map((p, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-ink/85">
            {p}
          </p>
        ))}
      </div>

      <Card className="p-5">
        <SectionTitle title="Key takeaways" hint="save these" />
        <ul className="mt-2 space-y-2">
          {a.points.map((pt) => (
            <li key={pt} className="flex items-start gap-2.5 text-sm text-ink">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-good/15 text-[11px] font-extrabold text-good">✓</span>
              {pt}
            </li>
          ))}
        </ul>
      </Card>

      {related.length > 0 ? (
        <div>
          <SectionTitle title="Read next" />
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <button key={r.id} onClick={() => onOpen(r.id)} className="tap card overflow-hidden p-0 text-left hover:border-brand/50">
                <GuideCover a={r} />
                <p className="p-3 text-xs font-bold leading-snug text-ink">{r.title}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
