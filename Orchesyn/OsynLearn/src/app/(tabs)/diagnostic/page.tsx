'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CURRICULUM } from '@/lib/curriculum/curriculum';
import { useApp } from '@/lib/store/app';
import { recordUnseenAttempt } from '@/lib/insights/mastery';
import { track } from '@/lib/analytics';
import { Badge, Button, Card } from '@/components/ui';
import type { ExerciseItem, Skill } from '@/lib/curriculum/types';

/**
 * Assessment ladder:
 *   1. short screening — labelled PROVISIONAL everywhere it appears
 *   2. fuller per-skill diagnostics — update the level once taken
 * Results feed the adaptive plan; first-try answers also count as unseen
 * evidence in the mastery ledger.
 */

const SKILLS: Skill[] = ['listening', 'reading', 'writing', 'speaking'];

/**
 * one objective unseen item per skill for the screening.
 * Speaking has no objective (mcq/tfng) items — its level comes from recorded
 * practice — so it yields null and is filtered out rather than blanking the run.
 */
function screeningItem(skill: Skill): ExerciseItem | null {
  const pool = CURRICULUM.filter((l) => l.skill === skill && l.status === 'published')
    .flatMap((l) => l.independent)
    .filter((i) => i.kind === 'mcq' || i.kind === 'tfng');
  return pool[0] ?? null;
}

/** fuller diagnostic: the remaining unseen objective items of the skill */
function diagnosticItems(skill: Skill): ExerciseItem[] {
  return CURRICULUM.filter((l) => l.skill === skill && l.status === 'published')
    .flatMap((l) => [...l.guided, ...l.independent])
    .filter((i) => i.kind === 'mcq' || i.kind === 'tfng')
    .slice(0, 4);
}

function check(item: ExerciseItem, answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return item.answer.toLowerCase() === a || item.options?.[Number(a)] === item.answer;
}

export default function DiagnosticPage() {
  const { profile, updateProfile } = useApp();
  const [stage, setStage] = useState<'intro' | 'screen' | 'full'>('intro');
  const [skill, setSkill] = useState<Skill>('listening');
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [results, setResults] = useState<{ skill: Skill; ok: boolean }[]>([]);
  const [provisional, setProvisional] = useState(false);

  const levels = profile?.sectionLevels ?? {};

  // safety net: never strand the learner on a blank step if a run's item list
  // is ever empty at the current index (e.g. data change mid-session)
  useEffect(() => {
    if ((stage === 'screen' || stage === 'full') && idx >= items.length) setStage('intro');
  }, [stage, idx, items.length]);

  const startScreen = () => {
    const list = SKILLS.map(screeningItem).filter((i): i is ExerciseItem => i !== null);
    if (!list.length) return;
    setItems(list);
    setIdx(0);
    setRight(0);
    setPicked(null);
    setProvisional(true);
    setStage('screen');
  };

  const startFull = (s: Skill) => {
    const list = diagnosticItems(s);
    if (!list.length) return; // skills without objective items keep their practice-based level
    setSkill(s);
    setItems(list);
    setIdx(0);
    setRight(0);
    setPicked(null);
    setProvisional(false);
    setStage('full');
  };

  const submit = () => {
    if (picked == null) return;
    const item = items[idx];
    const ok = check(item, picked);
    recordUnseenAttempt(item.skill, ok, true);
    const all = [...results, { skill: item.skill, ok }];
    setResults(all);
    setRight(right + (ok ? 1 : 0));
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setPicked(null);
      return;
    }
    // finished — write the level(s)
    if (stage === 'screen') {
      const perSkill = {} as Partial<Record<Skill, number>>;
      for (const r of all) perSkill[r.skill] = r.ok ? 100 : 25;
      void updateProfile({ sectionLevels: { ...levels, ...perSkill } });
    } else {
      const score = Math.round((all.filter((r) => r.ok).length / all.length) * 100);
      void updateProfile({ sectionLevels: { ...levels, [skill]: score } });
    }
    track({ name: 'diagnostic_completed', kind: provisional ? 'screening' : 'full', skill: provisional ? undefined : skill });
    setResults([]);
    setStage('intro');
  };

  const remember = (v: string) => setPicked(v);

  const item = items[idx];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted">Short screening first — labelled provisional until a fuller diagnostic confirms it.</p>
      </header>

      {stage === 'intro' && (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-extrabold text-ink">3-minute screening</p>
              <p className="mt-0.5 text-xs text-muted">One unseen question per skill. Fast, rough, honest.</p>
            </div>
            <Button onClick={startScreen}>Start screening</Button>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {SKILLS.map((s) => (
              <Card key={s} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold capitalize text-ink">{s}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {levels[s] != null ? `level ${levels[s]}/100` : 'no diagnostic yet'}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => startFull(s)} disabled={diagnosticItems(s).length === 0} title={diagnosticItems(s).length === 0 ? 'Speaking level comes from recorded practice — no objective items yet' : undefined}>
                  {diagnosticItems(s).length === 0 ? 'Practice-based' : 'Full diagnostic'}
                </Button>
              </Card>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-faint">
            Levels drive your adaptive plan: every skill appears weekly, weak ones get extra time.
            First-try answers count as unseen evidence in Progress — that is what real improvement looks like.
          </p>
        </>
      )}

      {(stage === 'screen' || stage === 'full') && item && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <Badge tone={provisional ? 'mid' : 'brand'}>
              {provisional ? 'PROVISIONAL screening' : `${skill} diagnostic`}
            </Badge>
            <span className="text-[11px] font-bold text-faint">{idx + 1} / {items.length}</span>
          </div>
          <p className="mt-3 text-sm font-extrabold capitalize text-faint">{item.skill}</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">{item.prompt}</p>
          <div className="mt-4 space-y-2">
            {(item.options ?? ['TRUE', 'FALSE', 'NOT GIVEN']).map((o) => (
              <button
                key={o}
                onClick={() => remember(o)}
                className={`tap w-full rounded-xl border p-3 text-left text-sm font-semibold ${picked === o ? 'border-brand/60 bg-brand/12 text-ink' : 'border-line bg-surface text-muted hover:text-ink'}`}
              >
                {o}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-faint">{item.explanation ? 'Explanation after you finish — no teaching to the test mid-flight.' : ''}</p>
          <div className="mt-4 flex justify-end">
            <Button onClick={submit} disabled={picked == null}>
              {idx + 1 < items.length ? 'Next' : 'Finish & save level'}
            </Button>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-faint">
        <Link href="/learn" className="font-bold text-brand hover:underline">← back to Learn</Link>
      </p>
    </div>
  );
}
