import Link from 'next/link';

/** Friendly 404 that keeps the learner inside the journey. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center">
      <p className="text-4xl" aria-hidden>🧭</p>
      <h1 className="font-display text-2xl font-extrabold text-ink">That room doesn't exist</h1>
      <p className="max-w-sm text-sm text-muted">No stress — your streak and progress are exactly where you left them.</p>
      <Link href="/home" className="tap mt-2 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-extrabold text-white">
        Back to Today
      </Link>
    </div>
  );
}
