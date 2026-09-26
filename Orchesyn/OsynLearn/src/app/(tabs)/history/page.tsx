'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowUpRight, RotateCcw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { dayKey, historyStats, sortSessions, type HistorySort } from '@/lib/insights/history-stats';
import { formatSeconds, relativeTime, scoreTone, TONE_VAR } from '@/lib/utils';
import { Chip, EmptyState, ScoreRing, SectionTitle, Segmented } from '@/components/ui';

const MODE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'impromptu', label: 'Impromptu' },
  { id: 'coach', label: 'Coach' },
  { id: 'drill', label: 'Drills' },
  { id: 'ielts', label: 'IELTS' },
  { id: 'toefl', label: 'TOEFL' },
  { id: 'interview', label: 'Interview' },
  { id: 'weak', label: '⚠ Needs work' },
] as const;

type FilterId = (typeof MODE_FILTERS)[number]['id'];

/** History, but smarter: trends up top, day grouping, sorting, practice-again. */
export default function HistoryPage() {
  const { sessions } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<HistorySort>('newest');

  const stats = useMemo(() => historyStats(sessions), [sessions]);

  const filtered = useMemo(() => {
    const list = sessions.filter((s) => {
      const modeOk =
        filter === 'all' ||
        (filter === 'weak'
          ? s.overall < 60
          : filter === 'ielts'
            ? s.mode.startsWith('ielts')
            : s.mode === filter);
      const queryOk = !query || s.title.toLowerCase().includes(query.toLowerCase());
      return modeOk && queryOk;
    });
    return sortSessions(list, sort);
  }, [sessions, filter, query, sort]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const k = dayKey(s.startedAt);
      (map.get(k) ?? map.set(k, []).get(k)!).push(s);
    }
    return [...map.entries()];
  }, [filtered]);

  if (!sessions.length) {
    return (
      <EmptyState
        emoji="🗂️"
        title="Nothing here yet"
        body="Every completed session lands here with its full feedback report, ready to re-read — and re-do."
        action={<Link href="/impromptu" className="inline-flex"><span className="tap inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-bold text-white">Start your first rep</span></Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">History</h1>
        <p className="mt-1 text-sm text-muted">Your evidence trail — every rep, scored and searchable.</p>
      </div>

      {/* smart stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="sessions" value={String(stats.count)} />
        <Stat label="this week" value={String(stats.weekCount)} />
        <Stat label="total spoken" value={`${Math.floor(stats.totalMin / 60)}h ${stats.totalMin % 60}m`} />
        <div className="card p-3 text-center">
          <p className="font-display text-lg font-extrabold text-ink">
            {stats.avg || '—'}
            {stats.trendPct !== 0 && stats.prevAvg > 0 ? (
              <span className={`ml-1 inline-flex items-center text-xs font-extrabold ${stats.trendPct > 0 ? 'text-good' : 'text-bad'}`}>
                {stats.trendPct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stats.trendPct > 0 ? '+' : ''}{stats.trendPct}
              </span>
            ) : null}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-faint">7-day avg · trend</p>
        </div>
      </div>

      {/* controls */}
      <div className="space-y-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {MODE_FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)} className="shrink-0">
              {f.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'best', label: 'Best' },
              { value: 'longest', label: 'Longest' },
            ]}
          />
          <div className="relative min-w-[150px] flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              className="h-9 w-full rounded-full border border-line bg-surface2 pl-8 pr-3 text-xs text-ink outline-none focus:border-brand/60"
            />
          </div>
        </div>
      </div>

      {/* grouped list */}
      {grouped.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No sessions match that filter.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <SectionTitle title={day} hint={`${list.length} session${list.length === 1 ? '' : 's'}`} />
              <div className="mt-2 space-y-2">
                {list.map((s) => (
                  <div
                    key={s.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/report?id=${s.reportId}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/report?id=${s.reportId}`)}
                    className="tap card flex cursor-pointer items-center gap-3 p-3.5 hover:border-brand/40 sm:gap-4 sm:p-4"
                  >
                    <ScoreRing score={s.overall} size={48} stroke={5} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{s.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {modeLabel(s.mode)} · {formatSeconds(s.spokenSec)} · {relativeTime(s.startedAt)}
                      </p>
                    </div>
                    <div className="hidden items-center gap-3 md:flex">
                      {(['pronunciation', 'fluency', 'grammar'] as const).map((k) => {
                        const v = s.dimensionScores[k];
                        return typeof v === 'number' && v >= 0 ? (
                          <div key={k} className="text-center">
                            <p className="text-sm font-extrabold" style={{ color: TONE_VAR[scoreTone(v)] }}>{v}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-faint">{k.slice(0, 4)}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <span className="hidden rounded-lg border border-line bg-surface2 px-2 py-1 text-[10px] font-bold text-muted sm:block">
                      band {Number(s.band).toFixed(1)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(practiceHref(s.mode));
                      }}
                      aria-label="practice this again"
                      title="Practice this again"
                      className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface2 text-muted hover:border-brand/50 hover:text-brand"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-faint" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {stats.best ? (
        <p className="text-center text-[11px] text-faint">
          Personal best: <b className="text-ink">{stats.best.title}</b> · {stats.best.overall} — chase it. 🏁
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="font-display text-lg font-extrabold text-ink">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{label}</p>
    </div>
  );
}

function modeLabel(mode: string): string {
  const map: Record<string, string> = {
    impromptu: 'Impromptu',
    coach: 'Coach',
    drill: 'Drill',
    'ielts-part1': 'IELTS Part 1',
    'ielts-part2': 'IELTS Part 2',
    'ielts-part3': 'IELTS Part 3',
    toefl: 'TOEFL Speaking',
    interview: 'Interview',
  };
  return map[mode] ?? mode;
}

function practiceHref(mode: string): string {
  if (mode.startsWith('ielts')) return '/ielts';
  if (mode === 'toefl') return '/toefl/speaking';
  if (mode === 'interview') return '/interview';
  if (mode === 'coach') return '/coach';
  if (mode === 'drill') return '/roadmap';
  return '/impromptu';
}
