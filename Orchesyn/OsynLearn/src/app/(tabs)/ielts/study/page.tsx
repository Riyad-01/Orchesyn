'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BrainCircuit, CalendarRange, Flame, RotateCcw, Volume2 } from 'lucide-react';
import { speak } from '@/lib/speech/tts';
import { VOCAB } from '@/lib/data/ielts-vocab';
import { buildPlan, dueCards, gradeCard, newCard, planFeasible, streakOf, type SrsCard } from '@/lib/scoring/srs';
import { Badge, Button, Card, SectionTitle, Segmented } from '@/components/ui';

/**
 * IELTS Smart Study — the deep-learning layer:
 *   • Word Bank: spaced-repetition flashcards (your misses come back sooner)
 *   • Band Planner: honest, adaptive weekly plan from current → target band
 * Nothing here fakes progress: the SRS state and the plan are plain, explainable math.
 */

const LS = 'osyn:srs';

function load(): SrsCard[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS) ?? '[]') as SrsCard[];
  } catch {
    return [];
  }
}

function persist(cards: SrsCard[]) {
  try {
    window.localStorage.setItem(LS, JSON.stringify(cards));
  } catch {
    /* private mode */
  }
}

export default function IeltsStudyPage() {
  const [tab, setTab] = useState<'words' | 'plan'>('words');

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/ielts" className="flex min-h-11 w-fit items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> IELTS hub
      </Link>

      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-ink">
          <BrainCircuit className="h-6 w-6 text-brand" /> Smart Study
        </h1>
        <p className="mt-1 text-sm text-muted">
          The deep-learning layer: spaced-repetition vocabulary and an honest band plan. Ten minutes here outperforms an hour of rereading.
        </p>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'words', label: 'Word Bank', icon: <span aria-hidden>🃏</span> },
          { value: 'plan', label: 'Band Planner', icon: <CalendarRange className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'words' ? <WordBank /> : <Planner />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WordBank() {
  const [cards, setCards] = useState<SrsCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const stored = load();
    const now = Date.now();
    const merged = VOCAB.map((v) => stored.find((c) => c.id === v.id) ?? newCard(v.id, now));
    setCards(merged);
  }, []);

  const due = useMemo(() => dueCards(cards, Date.now()), [cards, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const queue = due.length ? due : cards.slice(0, 5); // when nothing is due, offer fresh cards
  const card = queue[idx % Math.max(1, queue.length)];
  const item = VOCAB.find((v) => v.id === card?.id);
  const totalReps = streakOf(cards);

  const grade = (g: 'again' | 'good') => {
    if (!card) return;
    const now = Date.now();
    const next = cards.map((c) => (c.id === card.id ? gradeCard(c, g, now) : c));
    setCards(next);
    persist(next);
    setShown(false);
    setIdx((i) => i + 1);
    setTick((t) => t + 1);
  };

  if (!item || !card) {
    return <Card className="p-6 text-sm text-muted">Loading your Word Bank…</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{due.length} due now</Badge>
        <Badge tone="neutral"><Flame className="h-3 w-3" /> {totalReps} lifetime reps</Badge>
        <Badge tone="neutral">{VOCAB.length} academic words mined from your passages</Badge>
      </div>

      <Card className="relative overflow-hidden p-6 text-center">
        <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-brand/10 blur-2xl" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-faint">band-{item.band} word</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">
          {item.word} <span className="text-base font-semibold text-muted">{item.pos}</span>
        </h2>
        <button
          onClick={() => void speak(shown ? `${item.word}. ${item.example}` : item.word, { rate: 0.95 })}
          className="tap mx-auto mt-2 flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface2 px-3.5 py-1 text-[11px] font-bold text-muted hover:text-brand"
        >
          <Volume2 className="h-3.5 w-3.5" /> hear it
        </button>

        {!shown ? (
          <Button className="mt-5" onClick={() => setShown(true)}>
            Show meaning
          </Button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-ink">{item.def}</p>
            <p className="mx-auto max-w-md rounded-xl bg-surface2 p-3 text-xs italic leading-relaxed text-muted">“{item.example}”</p>
            <div className="flex justify-center gap-2 pt-1">
              <Button variant="ghost" className="border-bad/40 text-bad" onClick={() => grade('again')}>
                <RotateCcw className="h-4 w-4" /> Still learning
              </Button>
              <Button className="border-good/40 bg-good/15 text-good hover:bg-good/25" onClick={() => grade('good')}>
                Knew it · schedule next review
              </Button>
            </div>
            <p className="text-[11px] text-faint">“Still learning” brings it back in 10 minutes; “knew it” doubles the spacing (1d → 2d → 4d…).</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Planner() {
  const [current, setCurrent] = useState(5.5);
  const [target, setTarget] = useState(7);
  const [weeks, setWeeks] = useState(12);
  const plan = useMemo(() => buildPlan(current, target, weeks), [current, target, weeks]);
  const feas = planFeasible(current, target, weeks);

  const Band = ({ label, v, set, min, max }: { label: string; v: number; set: (n: number) => void; min: number; max: number }) => (
    <div className="flex-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-faint">{label}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={v}
        onChange={(e) => set(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[var(--brand)]"
      />
      <p className="font-display text-xl font-extrabold text-brand">{v.toFixed(1)}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap gap-6">
          <Band label="current band (honest guess)" v={current} set={setCurrent} min={3} max={9} />
          <Band label="target band" v={target} set={setTarget} min={4} max={9} />
          <Band label="weeks" v={weeks} set={setWeeks} min={4} max={26} />
        </div>
        <div className={`mt-4 rounded-xl p-3 text-xs leading-relaxed ${feas.ok ? 'bg-good/10 text-good' : 'bg-warn/10 text-warn'}`}>
          {feas.note}
        </div>
      </Card>

      <SectionTitle title="Your weekly cycle" hint="rotates all skills — interleaving is the science" />
      <ol className="space-y-2">
        {plan.map((w) => (
          <li key={w.week} className="card flex items-start gap-3 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/12 font-display text-xs font-extrabold text-brand">
              W{w.week}
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">{w.focus}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{w.action}</p>
            </div>
          </li>
        ))}
      </ol>

      <Card className="p-4 text-xs leading-relaxed text-muted">
        <p className="font-bold text-ink">Why the cycle works:</p>
        <p className="mt-1">Rotating skills (interleaving) feels slower but transfers better; weekly mocks close the feedback loop; and the planner never promises more than ~0.5-1 band per 2-3 months — because that is what the evidence supports. No false hope, ever.</p>
      </Card>

      <div className="flex justify-end">
        <Link href="/ielts/">
          <Button variant="ghost">
            Start today's practice <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
