'use client';

import { useState } from 'react';
import { CURRICULUM } from '@/lib/curriculum/curriculum';
import { COVERAGE_MATRIX } from '@/lib/curriculum/coverage';
import { publish, recordFor, requestCorrection, toDraft, toReview } from '@/lib/curriculum/studio';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';

/**
 * Content Studio — authoring workflow on device:
 * draft → review → published, corrections bump the version and pull items
 * off learner surfaces until re-published. AI-drafted items are labelled.
 * Sources & usage rights are recorded per item.
 */

const STATUS_TONE = { draft: 'neutral', review: 'mid', published: 'good' } as const;

export default function StudioPage() {
  const [, bump] = useState(0);
  const rerender = () => bump((n) => n + 1);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Content Studio</h1>
        <p className="mt-1 text-sm text-muted">Author → review → publish → correct → version. Learners only ever see published items.</p>
      </header>

      <Card className="p-5">
        <SectionTitle title="Lessons" hint="Status changes are instant and on-device; published changes bump the version." />
        <div className="space-y-2.5">
          {CURRICULUM.map((l) => {
            const r = recordFor(l.id);
            return (
              <div key={l.id} className="rounded-xl border border-line bg-surface2/50 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-ink">
                    <span className="mr-2 text-faint">{l.id}</span>{l.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    <span className="text-[10px] font-bold text-faint">v{r.version}</span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {l.skill} · difficulty {l.difficulty}/5 · {l.minutes} min · {r.rights ?? 'original'}
                  {r.aiGenerated ? ' · 🤖 AI-drafted' : ''}
                </p>
                {r.corrections.length > 0 && (
                  <p className="mt-1 text-[11px] text-warn">
                    corrections: {r.corrections.map((c) => c.note).join(' · ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.status !== 'published' && <Button size="sm" onClick={() => { publish(l.id); rerender(); }}>Publish</Button>}
                  {r.status === 'published' && (
                    <Button size="sm" variant="secondary" onClick={() => { const note = window.prompt('Correction needed?'); if (note) { requestCorrection(l.id, note); rerender(); } }}>
                      Request correction
                    </Button>
                  )}
                  {r.status === 'published' && <Button size="sm" variant="ghost" onClick={() => { toReview(l.id); rerender(); }}>Pull for review</Button>}
                  {r.status !== 'draft' && <Button size="sm" variant="ghost" onClick={() => { toDraft(l.id); rerender(); }}>Back to draft</Button>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          New lessons are authored in <code>src/lib/curriculum/curriculum.ts</code> as drafts, reviewed here, then published.
          Every item records its source and usage rights; AI-drafted material is labelled until an expert publishes it.
        </p>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Coverage matrix" hint="An honest map: implemented, partial, missing. Missing rows are the authoring queue." />
        <div className="space-y-1.5">
          {COVERAGE_MATRIX.map((c) => (
            <div key={c.skill + c.questionType} className="flex flex-wrap items-center gap-2 rounded-lg border border-line/60 bg-surface px-3 py-2">
              <span className="w-20 shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-faint">{c.skill}</span>
              <span className="min-w-0 flex-1 text-xs font-semibold text-ink">{c.questionType}</span>
              <Badge tone={c.status === 'implemented' ? 'good' : c.status === 'partial' ? 'mid' : 'bad'}>{c.status}</Badge>
              <span className="w-full text-[10px] text-faint sm:w-auto sm:flex-1">{c.note}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
