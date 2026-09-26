'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen, Clock, PlayCircle, Trophy } from 'lucide-react';
import { IELTS_MOCKS, PART1_BANK, PART2_BANK, PART3_BANK, descriptorForBand } from '@/lib/data/ielts';
import { useApp } from '@/lib/store/app';
import { SessionFlow } from '@/components/recorder/session-flow';
import type { IeltsQuestion, SpeakingMode } from '@/types';
import { Badge, Button, Card, Chip, SectionTitle, ScoreRing } from '@/components/ui';

/**
 * IELTS Speaking hub:
 *   - single-part practice (pick one question, speak, get feedback)
 *   - full-length mocks with band estimates
 *   - your mock history
 */
export default function IeltsPage() {
  const { mockResults } = useApp();
  const [practice, setPractice] = useState<IeltsQuestion | null>(null);
  const [partTab, setPartTab] = useState<1 | 2 | 3>(1);

  if (practice) {
    const mode: SpeakingMode = practice.part === 1 ? 'ielts-part1' : practice.part === 2 ? 'ielts-part2' : 'ielts-part3';
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setPractice(null)} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          back to practice bank
        </button>
        <SessionFlow
          key={practice.id}
          config={{
            mode,
            title: `Part ${practice.part} · ${practice.topic}`,
            emoji: '🎓',
            prompt: practice.question,
            cuePoints: practice.bullets,
            prepSec: practice.prepSec ?? (practice.part === 1 ? 5 : 15),
            targetSec: practice.speakSec ?? (practice.part === 1 ? 30 : practice.part === 2 ? 120 : 60),
            sampleAnswer: practice.sampleAnswer,
          }}
        />
      </div>
    );
  }

  const banks = partTab === 1 ? PART1_BANK : partTab === 2 ? PART2_BANK : PART3_BANK;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">IELTS Preparation</h1>
        <p className="mt-1 text-sm text-muted">
          All four skills in one place: Speaking with live AI feedback, plus Listening, Reading and Writing practice with official band tables.
        </p>
      </div>

      {/* four segments */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <a href="#speaking" className="tap card lift group p-4 hover:border-brand/40">
          <span className="text-2xl">🗣️</span>
          <h3 className="mt-2 text-sm font-extrabold text-ink group-hover:text-brand">Speaking</h3>
          <p className="mt-1 text-[11px] leading-snug text-muted">Parts 1-3 · full mocks · AI band estimate</p>
        </a>
        <Link href="/ielts/listening/" className="tap card lift group p-4 hover:border-brand/40">
          <span className="text-2xl">🎧</span>
          <h3 className="mt-2 text-sm font-extrabold text-ink group-hover:text-brand">Listening</h3>
          <p className="mt-1 text-[11px] leading-snug text-muted">4-section sets · narrated on-device · 0 MB audio</p>
        </Link>
        <Link href="/ielts/reading/" className="tap card lift group p-4 hover:border-brand/40">
          <span className="text-2xl">📖</span>
          <h3 className="mt-2 text-sm font-extrabold text-ink group-hover:text-brand">Reading</h3>
          <p className="mt-1 text-[11px] leading-snug text-muted">Academic passages · MCQ + T/F/NG · timed</p>
        </Link>
        <Link href="/ielts/writing/" className="tap card lift group p-4 hover:border-brand/40">
          <span className="text-2xl">✍️</span>
          <h3 className="mt-2 text-sm font-extrabold text-ink group-hover:text-brand">Writing</h3>
          <p className="mt-1 text-[11px] leading-snug text-muted">Task 1 &amp; 2 · AI examiner · 4 criteria bands</p>
        </Link>
      </div>

      {/* deep-learning layer */}
      <Link href="/ielts/study/" className="tap card group relative overflow-hidden border-brand/30 p-5 hover:border-brand/60" style={{ background: 'linear-gradient(120deg, rgba(124,92,255,.14), rgba(6,214,160,.08))' }}>
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-brand/15 blur-2xl" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">deep learning</p>
            <h3 className="mt-1 font-display text-base font-extrabold text-ink group-hover:text-brand">Smart Study · Word Bank + Band Planner</h3>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
              Spaced-repetition academic vocabulary mined from your passages, plus an honest week-by-week plan from your current band to your target.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-brand transition-transform group-hover:translate-x-1" />
        </div>
      </Link>

      {/* mocks */}
      <div id="speaking">
        <SectionTitle title="Speaking · full-length mocks" hint="11-14 minutes · Parts 1-3 · instant band estimate" />
        <div className="grid gap-3 sm:grid-cols-2">
          {IELTS_MOCKS.map((mock) => {
            const done = mockResults.find((r) => r.mockId === mock.id);
            return (
              <Link key={mock.id} href={`/ielts/mock/${mock.id}`} className="tap card group relative overflow-hidden p-5 hover:border-brand/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand">mock test</p>
                    <h3 className="mt-1 text-sm font-extrabold text-ink group-hover:text-brand">{mock.title}</h3>
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-faint">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {mock.durationMin} min</span>
                      <span>{mock.part1.length + 1 + mock.part3.length} questions</span>
                    </div>
                  </div>
                  {done ? (
                    <ScoreRing score={done.overall} size={64} stroke={6} label={done.band.toFixed(1)} />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12 text-brand">
                      <PlayCircle className="h-5 w-5" />
                    </span>
                  )}
                </div>
                {done ? (
                  <p className="mt-3 text-[11px] font-bold text-muted">
                    best band {done.band.toFixed(1)} · {new Date(done.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </p>
                ) : (
                  <p className="mt-3 text-[11px] font-bold text-muted">not attempted yet</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* single part practice */}
      <div>
        <SectionTitle title="Practice by part" hint="Short, focused reps." />
        <div className="mb-3 flex gap-2">
          <Chip active={partTab === 1} onClick={() => setPartTab(1)}>Part 1 · Introduction</Chip>
          <Chip active={partTab === 2} onClick={() => setPartTab(2)}>Part 2 · Cue card</Chip>
          <Chip active={partTab === 3} onClick={() => setPartTab(3)}>Part 3 · Discussion</Chip>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {banks.map((q) => (
            <button key={q.id} onClick={() => setPractice(q)} className="tap card p-4 text-left hover:border-brand/40">
              <Badge tone="neutral">{q.topic}</Badge>
              <p className="mt-2 text-sm font-bold leading-snug text-ink">{q.question}</p>
              {q.bullets ? (
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {q.bullets.map((b) => (
                    <li key={b} className="flex gap-1.5"><span className="text-accent">•</span>{b}</li>
                  ))}
                </ul>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* band descriptors */}
      <div>
        <SectionTitle title="What the bands mean" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[5, 6, 7, 8].map((band) => {
            const d = descriptorForBand(band);
            return (
              <Card key={band} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl font-extrabold text-brand">{band}.0</span>
                  <span className="text-sm font-extrabold text-ink">{d.title}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted"><span className="font-bold text-ink">Fluency: </span>{d.fluency}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted"><span className="font-bold text-ink">Vocabulary: </span>{d.vocabulary}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* history */}
      {mockResults.length ? (
        <div>
          <SectionTitle title="Your mock history" />
          <div className="space-y-2">
            {mockResults.slice(0, 5).map((r) => (
              <Card key={r.id} className="flex items-center gap-4 p-3.5">
                <Trophy className="h-4 w-4 shrink-0 text-warn" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{IELTS_MOCKS.find((m) => m.id === r.mockId)?.title ?? r.mockId}</p>
                  <p className="text-xs text-muted">{new Date(r.date).toLocaleDateString()}</p>
                </div>
                <span className="font-display text-lg font-extrabold text-brand">{r.band.toFixed(1)}</span>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
