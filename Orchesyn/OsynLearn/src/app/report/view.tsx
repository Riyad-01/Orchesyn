'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/lib/store/app';
import { ReportView } from '@/components/report/report-view';
import type { FeedbackReport } from '@/types';
import { Button, EmptyState, Skeleton } from '@/components/ui';

/**
 * Single prerendered route: /report?id=xyz. Query params (not path params)
 * so every runtime report id works on the fully static build.
 */
export default function ReportPage() {
  const id = useSearchParams().get('id') ?? '';
  const { repo } = useApp();
  const router = useRouter();
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    void repo.getReport(id).then((r) => {
      if (cancelled) return;
      if (r) {
        setReport(r);
        setState('ready');
      } else {
        setState('missing');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, repo]);

  /* progressive pipeline: background upgrades announce themselves here */
  useEffect(() => {
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent).detail !== id) return;
      void repo.getReport(id).then((r) => {
        if (r) {
          setReport(r);
          setState('ready');
        }
      });
    };
    window.addEventListener('osyn:report-updated', onUpdate);
    return () => window.removeEventListener('osyn:report-updated', onUpdate);
  }, [id, repo]);

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (state === 'missing' || !report) {
    return (
      <EmptyState
        emoji="🧾"
        title="Report not found"
        body="This feedback report isn't stored on this device. If you switched accounts or cleared storage, older reports may be gone."
        action={
          <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => router.push('/history')}>
            Back to history
          </Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        back
      </button>
      <ReportView report={report} />
    </div>
  );
}
