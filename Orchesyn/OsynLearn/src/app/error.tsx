'use client';

import { Button } from '@/components/ui';

/** Top-level error boundary: never show a learner a white screen. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0b0d12', color: '#e8eaf2', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 40 }} aria-hidden>🧯</p>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>OsynLearn hit an unexpected error</h1>
          <p style={{ fontSize: 14, opacity: 0.7, maxWidth: 420 }}>
            Your sessions and progress are stored on this device and are safe. Reload to continue.
          </p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 8, padding: '10px 22px', borderRadius: 12, border: 'none', background: '#7C5CFF', color: 'white', fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
          <p style={{ fontSize: 11, opacity: 0.5 }}>{(error.message || '').slice(0, 140)}</p>
        </div>
      </body>
    </html>
  );
}
