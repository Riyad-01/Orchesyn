'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import type { DimensionKey, FeedbackReport } from '@/types';
import { formatSeconds, mean, scoreTone, TONE_VAR } from '@/lib/utils';
import { Badge, Card, EmptyState, SectionTitle, ScoreBar, Stat } from '@/components/ui';

const DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: 'pronunciation', label: 'Pronunciation' },
  { key: 'fluency', label: 'Fluency' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'fillers', label: 'Filler control' },
  { key: 'pace', label: 'Pace' },
  { key: 'clarity', label: 'Clarity' },
];

/**
 * Insights: the 360° view.
 * Trend of overall scores, per-dimension averages, speaking volume, the
 * recurring grammar categories and filler histogram from recent reports,
 * and achievements.
 */
export default function InsightsPage() {
  const { sessions, daily, achievements, streak, repo } = useApp();
  const [reports, setReports] = useState<FeedbackReport[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = sessions.slice(0, 20).map((s) => s.reportId).filter(Boolean);
      const loaded = await Promise.all(ids.map((id) => repo.getReport(id)));
      if (!cancelled) setReports(loaded.filter((r): r is FeedbackReport => Boolean(r)));
    })();
    return () => {
      cancelled = true;
    };
  }, [sessions, repo]);

  const dimensionAverages = useMemo(() => {
    const agg: Record<string, number[]> = {};
    for (const s of sessions.slice(0, 30)) {
      for (const [k, v] of Object.entries(s.dimensionScores)) {
        if (typeof v === 'number' && v >= 0) (agg[k] ??= []).push(v);
      }
    }
    return DIMENSIONS.map((d) => ({
      ...d,
      avg: agg[d.key]?.length ? Math.round(mean(agg[d.key])) : -1,
      trend: trendOf(agg[d.key] ?? []),
    }));
  }, [sessions]);

  const overallTrend = useMemo(() => {
    const ordered = [...sessions].slice(0, 30).reverse();
    return ordered.map((s) => s.overall);
  }, [sessions]);

  const grammarCats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reports) {
      for (const g of r.grammarIssues) counts[g.category] = (counts[g.category] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [reports]);

  const fillerHist = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of reports) {
      for (const f of r.fillers) counts[f.phrase] = (counts[f.phrase] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [reports]);

  const totalSec = sessions.reduce((a, s) => a + s.spokenSec, 0);
  const avgWpm = mean(sessions.slice(0, 20).map((s) => (s.dimensionScores as any).pace ?? NaN).filter((n: number) => Number.isFinite(n) && n >= 0));
  void avgWpm;

  if (!sessions.length) {
    return (
      <EmptyState
        emoji="📈"
        title="No data yet"
        body="Complete a few sessions and this page becomes your speaking mirror: trends, weak dimensions, recurring errors and the fillers that sneak in."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Insights</h1>
        <p className="mt-1 text-sm text-muted">Everything the engine has learned about your speech.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat value={formatSeconds(totalSec)} label="total spoken" tone="brand" />
        <Stat value={sessions.length} label="sessions" />
        <Stat value={streak.longest} label="longest streak" tone="mid" />
        <Stat value={Math.round(mean(sessions.slice(0, 10).map((s) => s.overall)))} label="recent average" tone={scoreTone(mean(sessions.slice(0, 10).map((s) => s.overall)))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* trend */}
        <Card className="p-5">
          <SectionTitle title="Overall score trend" hint="Last 30 sessions, oldest → newest" />
          <TrendLine values={overallTrend} />
        </Card>

        {/* volume */}
        <Card className="p-5">
          <SectionTitle title="Speaking volume" hint="Minutes spoken per day, last 14 days" />
          <VolumeChart values={daily.slice(-14).map((d) => d.spokenSec)} />
        </Card>
      </div>

      {/* dimensions */}
      <Card className="p-5">
        <SectionTitle title="Dimension averages" hint="Based on your last 30 sessions." />
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {dimensionAverages.map((d) => (
            <div key={d.key}>
              <ScoreBar
                label={d.label}
                score={d.avg}
                hint={d.avg < 0 ? 'not enough data yet' : d.trend > 3 ? `↑ improving (+${d.trend})` : d.trend < -3 ? `↓ slipping (${d.trend})` : 'steady'}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* grammar */}
        <Card className="p-5">
          <SectionTitle title="Your recurring grammar patterns" hint="From your recent reports." />
          {grammarCats.length ? (
            <div className="space-y-2.5">
              {grammarCats.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-bold text-muted">{cat}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                    <div className="h-full rounded-full bg-warn" style={{ width: `${(count / grammarCats[0][1]) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-warn">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No grammar issues recorded recently — impressive.</p>
          )}
        </Card>

        {/* fillers */}
        <Card className="p-5">
          <SectionTitle title="Filler word histogram" />
          {fillerHist.length ? (
            <div className="flex flex-wrap gap-2">
              {fillerHist.map(([phrase, count]) => (
                <span key={phrase} className="chip">
                  {phrase} <span className="font-extrabold text-bad">×{count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No fillers detected in your recent sessions.</p>
          )}
        </Card>
      </div>

      {/* achievements */}
      <Card className="p-5">
        <SectionTitle title="Achievements" hint={`${achievements.filter((a) => a.earnedAt).length} of ${achievements.length} earned`} />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
          {achievements.map((a) => {
            const pct = a.progress ? Math.min(100, (a.progress.value / a.progress.target) * 100) : 0;
            return (
              <div
                key={a.id}
                className={
                  a.earnedAt
                    ? 'surface-inset flex flex-col items-center gap-1.5 p-3 text-center'
                    : 'flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line p-3 text-center opacity-50'
                }
                title={a.description}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-[10px] font-bold leading-tight text-ink">{a.title}</span>
                {!a.earnedAt && a.progress ? (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface2">
                    <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function trendOf(values: number[]): number {
  if (values.length < 4) return 0;
  const half = Math.floor(values.length / 2);
  const early = mean(values.slice(0, half));
  const late = mean(values.slice(half));
  return Math.round(late - early);
}

function TrendLine({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="py-8 text-center text-sm text-muted">Complete more sessions to see a trend.</p>;
  }
  const w = 560;
  const h = 160;
  const pad = 8;
  const step = (w - pad * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / 100) * (h - pad * 2);
    return `${x},${y}`;
  });
  const last = values[values.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        {[25, 50, 75].map((g) => (
          <line key={g} x1={pad} x2={w - pad} y1={h - pad - (g / 100) * (h - pad * 2)} y2={h - pad - (g / 100) * (h - pad * 2)} stroke="rgb(var(--line))" strokeDasharray="3 6" strokeWidth="1" />
        ))}
        <polyline fill="none" stroke={TONE_VAR[scoreTone(last)]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points.join(' ')} />
        <circle cx={pad + (values.length - 1) * step} cy={h - pad - (last / 100) * (h - pad * 2)} r="4" fill={TONE_VAR[scoreTone(last)]} />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-faint">
        <span>oldest</span>
        <span className="flex items-center gap-1 text-ink"><TrendingUp className="h-3 w-3" /> latest: {last}/100</span>
      </div>
    </div>
  );
}

function VolumeChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 60, 1);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {values.map((v, i) => {
        const minutes = Math.round(v / 60);
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[9px] font-bold text-faint opacity-0 transition-opacity group-hover:opacity-100">{minutes}m</span>
            <div className="flex w-full flex-1 items-end overflow-hidden rounded-md bg-surface2">
              <div
                className="w-full rounded-md"
                style={{
                  height: `${Math.max(3, (v / max) * 100)}%`,
                  background: v >= 600 ? TONE_VAR.good : 'rgb(var(--brand))',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
