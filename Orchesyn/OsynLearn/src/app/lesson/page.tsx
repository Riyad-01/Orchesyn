'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { lessonById, CURRICULUM } from '@/lib/curriculum/curriculum';
import { effectiveStatus } from '@/lib/curriculum/studio';
import { recordUnseenAttempt } from '@/lib/insights/mastery';
import { useApp } from '@/lib/store/app';
import { Badge, Button, Card, Progress } from '@/components/ui';
import { track } from '@/lib/analytics';
import type { ExerciseItem } from '@/lib/curriculum/types';

/**
 * The lesson cycle, exactly as specified:
 * explanation → worked example → guided practice (hints on) →
 * independent attempt (hints off, unseen evidence) → feedback →
 * retry if below mastery → later review (spaced, via osyn:srs).
 */

type Phase = 'explain' | 'worked' | 'guided' | 'independent' | 'feedback' | 'review' | 'done';

const LS_PROGRESS = 'stim:lesson-progress';

interface Stored {
  [lessonId: string]: { attempts: { phase: string; correct: number; total: number; at: number }[]; masteredAt?: number };
}

function readProgress(): Stored {
  try {
    return JSON.parse(window.localStorage.getItem(LS_PROGRESS) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

function saveProgress(p: Stored) {
  window.localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
}

function scheduleReview(lessonId: string) {
  try {
    const srs = JSON.parse(window.localStorage.getItem('osyn:srs') ?? '[]') as { id: string; due: number }[];
    if (!srs.some((c) => c.id === `lesson:${lessonId}`)) {
      srs.push({ id: `lesson:${lessonId}`, due: Date.now() + 86_400_000 });
      window.localStorage.setItem('osyn:srs', JSON.stringify(srs));
    }
  } catch {
    /* fine */
  }
}

function checkTyped(item: ExerciseItem, text: string): boolean {
  const t = text.toLowerCase();
  return item.answer.toLowerCase().split('|').some((k) => k.trim() && t.includes(k.trim()));
}

function check(item: ExerciseItem, answer: string): boolean {
  if (item.kind === 'mcq' || item.kind === 'tfng') return answer === item.answer;
  return checkTyped(item, answer);
}

function ItemRunner({
  item,
  withHint,
  onDone,
}: {
  item: ExerciseItem;
  withHint: boolean;
  onDone: (ok: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState('');
  const objective = item.kind === 'mcq' || item.kind === 'tfng';
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold leading-relaxed text-ink">{item.prompt}</p>
      {item.tts ? (
        <button
          className="tap inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface2 px-3 text-xs font-bold text-muted hover:text-ink"
          onClick={() => {
            const u = new SpeechSynthesisUtterance(item.tts);
            u.lang = 'en-GB';
            window.speechSynthesis.speak(u);
          }}
        >
          🔊 play practice audio <span className="text-[10px] text-faint">(device voice — practice, not exam)</span>
        </button>
      ) : null}
      {withHint && item.hint ? <p className="text-xs font-semibold italic text-brand/80">hint: {item.hint}</p> : null}
      {objective ? (
        <div className="space-y-2">
          {(item.options ?? ['TRUE', 'FALSE', 'NOT GIVEN']).map((o) => (
            <button
              key={o}
              onClick={() => setPicked(o)}
              className={`tap w-full rounded-xl border p-3 text-left text-sm font-semibold ${picked === o ? 'border-brand/60 bg-brand/12 text-ink' : 'border-line bg-surface text-muted hover:text-ink'}`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={item.kind === 'spoken' ? 'Speak it, then type what you said…' : 'Your answer…'}
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink outline-none focus:border-brand/60"
        />
      )}
      <div className="flex justify-end">
        <Button size="sm" disabled={objective ? picked == null : text.trim().length < 3} onClick={() => onDone(check(item, objective ? (picked as string) : text))}>
          Check
        </Button>
      </div>
    </div>
  );
}

export default function LessonPage() {
  const params = useSearchParams();
  const id = params.get('id') ?? 'L1';
  const lesson = lessonById(id);
  const { profile } = useApp();
  const [phase, setPhase] = useState<Phase>('explain');
  const [slot, setSlot] = useState(0);
  const [phaseRight, setPhaseRight] = useState(0);
  const [retries, setRetries] = useState(0);
  const [lastOk, setLastOk] = useState<boolean | null>(null);

  const visible = lesson && effectiveStatus(lesson.id) === 'published';

  const nextLesson = useMemo(() => {
    if (!lesson) return null;
    const done = readProgress();
    return (
      CURRICULUM.find(
        (l) =>
          l.id !== lesson.id &&
          effectiveStatus(l.id) === 'published' &&
          l.prereqs.every((p) => (done[p]?.attempts.length ?? 0) > 0) &&
          !done[l.id]?.masteredAt &&
          (profile?.ieltsModule === 'general' ? l.path !== 'academic' : profile?.ieltsModule === 'academic' ? l.path !== 'general' : true),
      ) ?? null
    );
  }, [lesson, profile]);

  if (!lesson || !visible) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <p className="text-3xl">🔒</p>
        <p className="mt-2 text-sm font-extrabold text-ink">This lesson isn't published yet</p>
        <p className="mt-1 text-xs text-muted">Content moves through draft → review → published before it reaches learners.</p>
        <Link href="/learn" className="tap mt-4 inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-extrabold text-white">Back to Learn</Link>
      </Card>
    );
  }

  const pool = phase === 'guided' ? lesson.guided : lesson.independent;
  const item = pool[slot];

  const onItemDone = (ok: boolean) => {
    setLastOk(ok);
    if (phase === 'independent') recordUnseenAttempt(lesson.skill, ok, true);
    const nr = phaseRight + (ok ? 1 : 0);
    setPhaseRight(nr);
    if (slot + 1 < pool.length) {
      setSlot(slot + 1);
      return;
    }
    // phase complete
    const acc = nr / pool.length;
    if (phase === 'independent') {
      const store = readProgress();
      const rec = (store[lesson.id] ??= { attempts: [] });
      rec.attempts.push({ phase, correct: nr, total: pool.length, at: Date.now() });
      if (acc >= lesson.mastery.threshold) {
        rec.masteredAt = Date.now();
        saveProgress(store);
        scheduleReview(lesson.id);
        setPhase('review');
      } else if (retries < 2) {
        saveProgress(store);
        if (retries === 0) track({ name: 'first_corrected_retry', lessonId: lesson.id });
        setRetries(retries + 1);
        setPhase('feedback');
      } else {
        saveProgress(store);
        setPhase('feedback');
      }
      return;
    }
    setPhase(phase === 'guided' ? 'independent' : 'done');
    setSlot(0);
    setPhaseRight(0);
  };

  const stepIndex = ['explain', 'worked', 'guided', 'independent'].indexOf(phase);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand">{lesson.skill} · {lesson.module} · v{lesson.version}</p>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{lesson.title}</h1>
        </div>
        <Badge tone="neutral">~{lesson.minutes} min</Badge>
      </header>
      {lesson.aiGenerated ? (
        <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-[11px] font-bold text-warn">AI-assisted material, expert-reviewed before publication.</p>
      ) : null}

      {stepIndex >= 0 && <Progress value={((stepIndex + 1) / 4) * 100} />}

      {phase === 'explain' && (
        <Card className="space-y-4 p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">1 · explanation</p>
          <p className="text-sm leading-relaxed text-ink">{lesson.explain}</p>
          <ul className="space-y-1 text-xs text-muted">
            {lesson.objectives.map((o) => (
              <li key={o}>• {o}</li>
            ))}
          </ul>
          <div className="flex justify-end"><Button onClick={() => setPhase('worked')}>Show me an example →</Button></div>
        </Card>
      )}

      {phase === 'worked' && (
        <Card className="space-y-3 p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">2 · worked example</p>
          <p className="text-sm font-semibold text-ink">{lesson.worked.prompt}</p>
          <p className="rounded-xl bg-surface2 p-3 text-sm text-ink">{lesson.worked.solution}</p>
          <p className="text-xs italic text-muted">{lesson.worked.notes}</p>
          <div className="flex justify-end"><Button onClick={() => { setPhase('guided'); setSlot(0); setPhaseRight(0); }}>Try one with hints →</Button></div>
        </Card>
      )}

      {(phase === 'guided' || phase === 'independent') && item && (
        <Card className="space-y-3 p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">
            {phase === 'guided' ? '3 · guided practice (hints on)' : `4 · independent attempt (no hints)${retries ? ` · retry ${retries}` : ''}`}
          </p>
          <ItemRunner key={`${phase}-${slot}-${retries}`} item={item} withHint={phase === 'guided'} onDone={onItemDone} />
          {lastOk != null && <p className={`text-xs font-bold ${lastOk ? 'text-good' : 'text-warn'}`}>{lastOk ? '✓ correct' : '✗ not quite — the explanation lands in feedback'}</p>}
        </Card>
      )}

      {phase === 'feedback' && (
        <Card className="space-y-3 p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">5 · feedback</p>
          <p className="text-sm text-ink">
            Independent accuracy {Math.round((phaseRight / pool.length) * 100)}% — mastery needs {Math.round(lesson.mastery.threshold * 100)}%.
          </p>
          <ul className="space-y-2">
            {pool.map((i) => (
              <li key={i.id} className="rounded-xl bg-surface2 p-3 text-xs text-muted"><b className="text-ink">Why:</b> {i.explanation}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            {retries <= 2 ? (
              <Button onClick={() => { setPhase('independent'); setSlot(0); setPhaseRight(0); setLastOk(null); }}>Retry the independent pass</Button>
            ) : (
              <Link href="/learn" className="tap inline-flex min-h-11 items-center rounded-xl bg-surface2 px-4 text-xs font-extrabold text-ink">Save it for tomorrow</Link>
            )}
          </div>
        </Card>
      )}

      {phase === 'review' && (
        <Card className="space-y-3 border-good/40 p-5">
          <p className="text-xs font-extrabold uppercase tracking-widest text-good">mastered · 6 · later review scheduled</p>
          <p className="text-sm text-ink">Nice. This lesson enters spaced review tomorrow, then at widening intervals — retention, not streaks.</p>
          <div className="flex flex-wrap justify-end gap-2">
            {nextLesson ? (
              <Link href={`/lesson?id=${nextLesson.id}`} className="tap inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-xs font-extrabold text-white">Next: {nextLesson.title} →</Link>
            ) : (
              <Link href="/learn" className="tap inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-xs font-extrabold text-white">Back to Learn</Link>
            )}
          </div>
        </Card>
      )}

      <p className="text-[11px] text-faint"><Link href="/learn" className="font-bold text-brand hover:underline">← leave lesson (progress on this phase is discarded)</Link></p>
    </div>
  );
}
