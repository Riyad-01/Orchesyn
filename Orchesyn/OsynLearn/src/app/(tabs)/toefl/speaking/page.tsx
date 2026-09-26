'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Ear, GraduationCap, MessageSquareQuote } from 'lucide-react';
import { TOEFL_TASKS, getToeflTask, type ToeflTask } from '@/lib/data/toefl';
import { SessionFlow } from '@/components/recorder/session-flow';
import { speak } from '@/lib/speech/tts';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';
import { useApp } from '@/lib/store/app';

/**
 * TOEFL iBT Speaking (2026 format): Listen-&-Repeat + Interview tasks,
 * scored with the ETS-style weighting (fluency + intelligibility first).
 */
export default function ToeflPage() {
  const { profile } = useApp();
  const params = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(params.get('task'));
  const [playing, setPlaying] = useState(false);
  const active = activeId ? getToeflTask(activeId) : undefined;

  if (active) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveId(null)}
          className="flex items-center gap-2 text-sm font-bold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> choose another task
        </button>

        {active.kind === 'repeat' ? (
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <Button
              size="sm"
              icon={<Ear className="h-4 w-4" />}
              loading={playing}
              onClick={() => {
                setPlaying(true);
                void speak(active.prompt, { rate: 0.95, onEnd: () => setPlaying(false), onError: () => setPlaying(false) });
              }}
            >
              Play the sentence
            </Button>
            <p className="min-w-0 flex-1 text-xs leading-snug text-muted">{active.tip}</p>
          </Card>
        ) : null}

        <SessionFlow
          config={{
            mode: 'toefl',
            title: active.kind === 'repeat' ? 'Listen & repeat' : 'Interview response',
            emoji: '🎓',
            prompt:
              active.kind === 'repeat'
                ? 'Press “Play the sentence”, listen carefully, then repeat it exactly as you heard it — same words, same stress.'
                : active.prompt,
            prepSec: active.prepSec,
            targetSec: active.targetSec,
            focusDimension: active.kind === 'repeat' ? 'pronunciation' : undefined,
            topicId: active.id,
            language: profile?.practiceLanguage,
          }}
        />
      </div>
    );
  }

  const repeats = TOEFL_TASKS.filter((t) => t.kind === 'repeat');
  const interviews = TOEFL_TASKS.filter((t) => t.kind === 'interview');

  const TaskCard = ({ task }: { task: ToeflTask }) => (
    <button
      onClick={() => setActiveId(task.id)}
      className="card w-full rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand/50"
    >
      <div className="flex items-center gap-2">
        {task.kind === 'repeat' ? (
          <Ear className="h-4 w-4 text-brand" />
        ) : (
          <MessageSquareQuote className="h-4 w-4 text-accent" />
        )}
        <span className="text-xs font-bold uppercase tracking-widest text-muted">
          {task.kind === 'repeat' ? 'Listen & repeat' : `Interview · ${task.targetSec}s`}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug text-ink">{task.prompt}</p>
    </button>
  );

  return (
    <div className="space-y-6">
      <Link href="/toefl" className="mb-1 flex min-h-11 w-fit items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Guide Library
      </Link>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink">TOEFL Speaking Practice</h1>
          <p className="text-xs text-muted">2026 format · Listen-&-Repeat + Interview · ETS-style rubric</p>
        </div>
      </div>

      <div>
        <SectionTitle title="Listen & Repeat" hint="Hear the sentence once, repeat it exactly. Intelligibility is the score." />
        <div className="grid gap-3 sm:grid-cols-2">{repeats.map((t) => <TaskCard key={t.id} task={t} />)}</div>
      </div>

      <div>
        <SectionTitle title="Interview" hint="A question, a few seconds to think, 45 seconds to shine." />
        <div className="grid gap-3 sm:grid-cols-2">{interviews.map((t) => <TaskCard key={t.id} task={t} />)}</div>
      </div>
    </div>
  );
}
