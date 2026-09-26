'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Dices, Mic } from 'lucide-react';
import { TOPICS, TOPIC_CATEGORIES, getTopic, pickTopic } from '@/lib/data/topics';
import { DRILLS, getDrill } from '@/lib/data/drills';
import { SessionFlow } from '@/components/recorder/session-flow';
import type { Topic } from '@/types';
import { Badge, Button, Card, Chip, SectionTitle } from '@/components/ui';
import { useApp } from '@/lib/store/app';
import { cn } from '@/lib/utils';

/**
 * Impromptu speaking.
 * Two entry shapes:
 *   /impromptu                  -> topic picker
 *   /impromptu?topic=ID         -> straight into that topic
 *   /impromptu?drill=ID         -> straight into a targeted drill
 *   /impromptu?surprise=1       -> straight into a random topic
 */
export default function ImpromptuPage() {
  const { profile, subscription } = useApp();
  const params = useSearchParams();

  const topicFromUrl = params.get('topic');
  const drillFromUrl = params.get('drill');
  const surprise = params.get('surprise');

  const [category, setCategory] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<0 | 1 | 2 | 3>(0);
  const [active, setActive] = useState<Topic | null>(() => getTopic(topicFromUrl ?? '') ?? null);
  const [activeDrill, setActiveDrill] = useState(() => getDrill(drillFromUrl ?? '') ?? null);
  const [resume, setResume] = useState<{ topicId: string; title: string; at: number } | null>(() => {
    try {
      const r = JSON.parse(window.localStorage.getItem('stim:resume') ?? 'null');
      return r && Date.now() - r.at < 24 * 3600_000 ? r : null;
    } catch {
      return null;
    }
  });

  const pool = useMemo(
    () =>
      TOPICS.filter(
        (t) =>
          (category === 'all' || t.category === category) &&
          (difficulty === 0 || t.difficulty === difficulty),
      ),
    [category, difficulty],
  );

  /* ---------------- drill mode ---------------- */
  if (activeDrill) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setActiveDrill(null)} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          all drills
        </button>
        <SessionFlow
          key={activeDrill.id}
          config={{
            mode: 'drill',
            title: activeDrill.title,
            emoji: '🎯',
            prompt: `${activeDrill.instruction}\n\n${activeDrill.prompt}`,
            targetSec: activeDrill.seconds,
            language: profile?.practiceLanguage,
            prepSec: 15,
            focusDimension: activeDrill.dimension,
            drillId: activeDrill.id,
          }}
        />
      </div>
    );
  }

  /* ---------------- straight into a topic ---------------- */
  if (active) {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setActive(null)} className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          choose another topic
        </button>
        <SessionFlow
          key={active.id}
          config={{
            mode: 'impromptu',
            title: active.title,
            emoji: TOPIC_CATEGORIES.find((c) => c.id === active.category)?.emoji,
            prompt: 'Speak continuously for the target length. Structure it: open with a position, support with an example, close with a reflection.',
            cuePoints: active.prompts,
            prepSec: active.prepSec,
            targetSec: active.targetSec,
            language: profile?.practiceLanguage,
            sampleAnswer: active.sampleAnswer,
            topicId: active.id,
          }}
        />
      </div>
    );
  }

  if (surprise) {
    const random = pickTopic();
    return (
      <div className="mx-auto max-w-2xl">
        <SessionFlow
          key={random.id}
          config={{
            mode: 'impromptu',
            title: random.title,
            emoji: '🎲',
            prompt: 'Surprise topic. Speak continuously and structure your answer as you go.',
            cuePoints: random.prompts,
            prepSec: random.prepSec,
            targetSec: random.targetSec,
            language: profile?.practiceLanguage,
            sampleAnswer: random.sampleAnswer,
            topicId: random.id,
          }}
        />
      </div>
    );
  }

  /* ---------------- picker ---------------- */
  return (
    <div className="space-y-5">
      {resume && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warn/40 p-4">
          <div>
            <p className="text-xs font-extrabold text-ink">Pick up where you left off</p>
            <p className="mt-0.5 text-[11px] text-muted">“{resume.title}” — your typed draft is still there.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { window.localStorage.removeItem('stim:resume'); setResume(null); setActive(getTopic(resume.topicId) ?? null); }}>Resume</Button>
            <Button size="sm" variant="ghost" onClick={() => { window.localStorage.removeItem('stim:resume'); setResume(null); }}>Dismiss</Button>
          </div>
        </Card>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Impromptu speaking</h1>
          <p className="mt-1 text-sm text-muted">
            {TOPICS.length} topics · get a question, speak {`60`} seconds, get feedback in seconds.
          </p>
        </div>
        <Button icon={<Dices className="h-4 w-4" />} onClick={() => { const t = pickTopic(); void t; window.location.assign(`/impromptu?surprise=${Math.random().toString(36).slice(2, 7)}`); }}>
          Surprise me
        </Button>
      </div>

      {/* filters */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>All</Chip>
        {TOPIC_CATEGORIES.map((c) => (
          <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
            {c.emoji} {c.name}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {([0, 1, 2, 3] as const).map((d) => (
          <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
            {d === 0 ? 'Any level' : d === 1 ? 'Easy' : d === 2 ? 'Medium' : 'Hard'}
          </Chip>
        ))}
      </div>

      {/* topics */}
      <div>
        <SectionTitle title={`Topics (${pool.length})`} hint="Easier topics build confidence; harder ones build band." />
        <div className="grid gap-3 sm:grid-cols-2">
          {pool.map((topic) => {
            const cat = TOPIC_CATEGORIES.find((c) => c.id === topic.category);
            return (
              <button
                key={topic.id}
                onClick={() => setActive(topic)}
                className={cn(
                  'tap card group p-4 text-left transition-colors hover:border-brand/40',
                  category !== 'all' && 'animate-rise',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="chip">{cat?.emoji} {cat?.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-faint">
                    {'●'.repeat(topic.difficulty)}
                    <span className="text-line">{'●'.repeat(3 - topic.difficulty)}</span>
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-extrabold leading-snug text-ink group-hover:text-brand">
                  {topic.title}
                </h3>
                <div className="mt-2.5 flex items-center gap-3 text-[11px] font-semibold text-faint">
                  <span>{topic.prepSec}s prep</span>
                  <span>{topic.targetSec}s speak</span>
                  <span className="ml-auto text-brand opacity-0 transition-opacity group-hover:opacity-100">start →</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* drills */}
      <div>
        <SectionTitle title="Targeted drills" hint="Ninety seconds against one specific weakness." />
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
          {DRILLS.map((drill) => (
            <button
              key={drill.id}
              onClick={() => setActiveDrill(drill)}
              className="tap card w-60 shrink-0 p-4 text-left hover:border-brand/40"
            >
              <Badge tone="brand">{drill.dimension}</Badge>
              <h3 className="mt-2 text-sm font-extrabold text-ink">{drill.title}</h3>
              <p className="mt-1 text-xs leading-snug text-muted">{drill.successCriterion}</p>
              <p className="mt-2 text-[11px] font-bold text-faint">{drill.seconds}s</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
