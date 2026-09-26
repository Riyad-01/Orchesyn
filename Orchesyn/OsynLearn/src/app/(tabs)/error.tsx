'use client';

import { Button } from '@/components/ui';

/** Consistent error + retry for every tab route. */
export default function TabsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
      <p className="text-3xl" aria-hidden>🧯</p>
      <h1 className="mt-2 font-display text-lg font-extrabold text-ink">That page hit a snag</h1>
      <p className="mt-1 text-sm text-muted">Your progress is safe on this device. Try the page again.</p>
      <Button className="mt-4" onClick={() => reset()}>Try again</Button>
      <p className="mt-3 text-[11px] text-faint">{error.message.slice(0, 120)}</p>
    </div>
  );
}
