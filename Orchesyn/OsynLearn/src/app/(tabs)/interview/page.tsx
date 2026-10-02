'use client';

import { useState } from 'react';
import { Ear, Mic, Sparkles } from 'lucide-react';
import { INTERVIEW_TRACKS, getTrack } from '@/lib/data/interviews';
import { LiveInterview } from '@/components/interview/live-interview';
import { Badge, Card, SectionTitle } from '@/components/ui';

/**
 * Live Interview — the first live interview system:
 * the app asks out loud, listens to your real answer, debriefs it instantly
 * (score, pace, fillers, grammar, STAR structure) and closes with a
 * senior-interviewer verdict.
 */
export default function InterviewPage() {
  const [trackId, setTrackId] = useState<string | null>(null);
  const track = trackId ? getTrack(trackId) : undefined;

  if (track) {
    return (
      <div className="mx-auto max-w-2xl">
        <LiveInterview track={track} onExit={() => setTrackId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-line p-6 sm:p-8" style={{ background: 'linear-gradient(120deg, rgba(217,4,41,.14), rgba(124,92,255,.14) 50%, rgba(6,214,160,.1))' }}>
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-bad/15 blur-3xl" />
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/daniel-256.png" alt="Daniel, your interviewer" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-line" />
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Live Interview</h1>
            <p className="text-sm text-muted">Meet Daniel, your interviewer: he asks out loud, listens, and debriefs you like a real panel.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <Ear className="h-4 w-4 text-brand" />
            <p className="mt-2 text-xs font-extrabold text-ink">1 · It asks</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Each question is spoken to you, with an insider tip before you answer.</p>
          </Card>
          <Card className="p-4">
            <Mic className="h-4 w-4 text-bad" />
            <p className="mt-2 text-xs font-extrabold text-ink">2 · It listens</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Answer on mic (or type). Instant debrief: score, pace, fillers, STAR beats.</p>
          </Card>
          <Card className="p-4">
            <Sparkles className="h-4 w-4 text-good" />
            <p className="mt-2 text-xs font-extrabold text-ink">3 · It judges</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">A senior-interviewer verdict: ready / almost / building, with exact fixes.</p>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle title="Choose your interview" hint="recorded nowhere, judged honestly" />
        <div className="grid gap-3 sm:grid-cols-2">
          {INTERVIEW_TRACKS.map((t) => (
            <button key={t.id} onClick={() => setTrackId(t.id)} className="tap card lift group p-5 text-left hover:border-brand/50">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden>{t.emoji}</span>
                <Badge tone="neutral">{t.level}</Badge>
              </div>
              <h3 className="mt-2 text-sm font-extrabold text-ink group-hover:text-brand">{t.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t.desc}</p>
              <p className="mt-2 text-[11px] font-bold text-faint">{t.questions.length} questions · ~{t.minutes} min</p>
            </button>
          ))}
        </div>
      </div>

      <Card className="p-4 text-xs leading-relaxed text-muted">
        <p><b className="text-ink">Pro tip:</b> answer out loud even if it feels strange — that is the rep that counts. Behavioural tracks check your STAR structure live and tell you exactly which beat you skipped.</p>
      </Card>
    </div>
  );
}
