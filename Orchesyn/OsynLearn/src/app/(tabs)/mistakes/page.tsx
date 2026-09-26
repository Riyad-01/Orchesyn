'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { buildMistakeBook, type MistakeKind } from '@/lib/insights/mistakes';
import { LESSON_FOR_MISTAKE, lessonById } from '@/lib/curriculum/curriculum';
import { effectiveStatus } from '@/lib/curriculum/studio';
import { seedDemoData } from '@/lib/data/seed';
import type { FeedbackReport } from '@/types';
import { Badge, Button, Card, EmptyState, SectionTitle, Segmented, Skeleton, Stat } from '@/components/ui';

const KIND_META: Record<MistakeKind, { label: string; tone: 'good' | 'mid' | 'bad' | 'brand' | 'neutral' }> = {
  filler: { label: 'Fillers', tone: 'bad' },
  grammar: { label: 'Grammar', tone: 'mid' },
  pronunciation: { label: 'Pronunciation', tone: 'brand' },
  vocab: { label: 'Word choice', tone: 'good' },
  pause: { label: 'Pauses', tone: 'neutral' },
};

export default function MistakesPage() {
  const { sessions, repo, profile, toast, refresh } = useApp();
  const [reports, setReports] = useState<FeedbackReport[] | null>(null);
  const [tab, setTab] = useState<'all' | MistakeKind>('all');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      sessions.slice(0, 80).map((s) => repo.getReport(s.reportId)),
    ).then((rs) => {
      if (!cancelled) setReports(rs.filter((r): r is FeedbackReport => r !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [sessions, repo]);

  const book = useMemo(() => (reports ? buildMistakeBook(reports) : null), [reports]);

  const assigned = useMemo(() => {
    if (!book) return [];
    const kinds = [...new Set(book.entries.map((e) => e.kind))];
    return kinds
      .map((k) => lessonById(LESSON_FOR_MISTAKE[k]))
      .filter((l): l is NonNullable<typeof l> => Boolean(l) && effectiveStatus(l!.id) === 'published');
  }, [book]);

  const seed = async () => {
    setSeeding(true);
    try {
      const { sessions: n } = await seedDemoData(repo, profile?.userId ?? 'guest');
      toast({ tone: 'success', title: `Loaded ${n} sample sessions`, body: 'Two weeks of realistic practice — explore every screen.' });
      await refresh();
    } finally {
      setSeeding(false);
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl p-5">
        <EmptyState
          emoji="📕"
          title="Your Mistake Book is empty"
          body="Every filler, grammar slip, mispronounced word and long pause you produce is collected here automatically — with a concrete fix for each. Speak once and it starts filling."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/impromptu">
                <Button>Start speaking</Button>
              </Link>
              <Button variant="secondary" loading={seeding} icon={<Sparkles className="h-4 w-4" />} onClick={() => void seed()}>
                Load 2 weeks of sample data
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const entries = book?.entries.filter((e) => tab === 'all' || e.kind === tab) ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Mistake Book</h1>
        <p className="mt-1 text-sm text-muted">
          Everything the engine caught across {book?.reportsScanned ?? '…'} sessions — counted, trended, and paired with a fix.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fillers caught" value={String(book?.totals.filler ?? 0)} />
        <Stat label="Grammar slips" value={String(book?.totals.grammar ?? 0)} />
        <Stat label="Words to drill" value={String(book?.totals.pronunciation ?? 0)} />
        <Stat label="Improving" value={`${book?.improving ?? 0}/${book?.entries.length ?? 0}`} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'all', label: 'All' },
          { value: 'filler', label: 'Fillers' },
          { value: 'grammar', label: 'Grammar' },
          { value: 'pronunciation', label: 'Pronunciation' },
          { value: 'vocab', label: 'Words' },
          { value: 'pause', label: 'Pauses' },
        ]}
      />

      {!book ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nothing in this category yet — clean record.</Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const trend =
              e.secondHalf < e.firstHalf ? 'down' : e.secondHalf > e.firstHalf ? 'up' : 'flat';
            return (
              <Card key={e.id} className="space-y-2.5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={KIND_META[e.kind].tone}>{KIND_META[e.kind].label}</Badge>
                  <p className="font-display text-sm font-extrabold text-ink">{e.title}</p>
                  <span className="ml-auto flex items-center gap-2">
                    <Badge tone="neutral">×{e.count}</Badge>
                    {trend === 'down' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-good">
                        <TrendingDown className="h-3.5 w-3.5" /> improving
                      </span>
                    )}
                    {trend === 'up' && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-bad">
                        <TrendingUp className="h-3.5 w-3.5" /> rising
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted">{e.detail}</p>
                <div className="rounded-xl border border-good/25 bg-good/10 p-3 text-[13px] leading-relaxed text-ink">
                  <span className="font-extrabold text-good">Fix: </span>
                  {e.fix}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <SectionTitle title="Act on it" />
      <div className="flex flex-wrap gap-2">
        <Link href="/impromptu">
          <Button variant="secondary">Practise now</Button>
        </Link>
        <Link href="/lab">
          <Button variant="secondary">Run the Fluency Lab</Button>
        </Link>
      </div>
    </div>
  );
}
