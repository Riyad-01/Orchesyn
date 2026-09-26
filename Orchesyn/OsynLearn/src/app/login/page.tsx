'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Chrome, Mail } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { useApp } from '@/lib/store/app';
import { Button, Card } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/db/supabase';

/**
 * Account screen. With Supabase configured: magic-link email + Google OAuth.
 * Without it: explains guest mode and still lets you continue.
 */
export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<false | 'email' | 'google'>(false);
  const [sent, setSent] = useState(false);
  const configured = isSupabaseConfigured();

  const sendLink = async () => {
    if (!email.includes('@')) return;
    setBusy('email');
    const result = await signInWithEmail(email.trim());
    setBusy(false);
    if (!result.error) setSent(true);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-6">
      <div className="mb-8 flex justify-center">
        <Logo size={44} withWord />
      </div>

      <Card className="p-6">
        <h1 className="font-display text-xl font-extrabold text-ink">Sync your progress</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {configured
            ? 'Sign in to keep your streaks, reports and roadmap across devices.'
            : 'This build is running without a cloud backend, so everything is stored safely on this device. Add Supabase keys to enable accounts.'}
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-good/30 bg-good/10 p-4">
            <p className="text-sm font-extrabold text-ink">Check your inbox ✉️</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              We sent a magic link to <span className="font-bold text-ink">{email}</span>. Click it and you will be signed in.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void sendLink()}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-line bg-surface2 px-4 text-sm text-ink outline-none focus:border-brand/60"
            />
            <Button block icon={<Mail className="h-4 w-4" />} loading={busy === 'email'} disabled={!email.includes('@') || !configured} onClick={() => void sendLink()}>
              Email me a magic link
            </Button>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-faint">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <Button
              block
              variant="secondary"
              icon={<Chrome className="h-4 w-4" />}
              loading={busy === 'google'}
              disabled={!configured}
              onClick={() => {
                setBusy('google');
                void signInWithGoogle();
              }}
            >
              Continue with Google
            </Button>
          </div>
        )}
      </Card>

      <div className="mt-5 text-center">
        <Link href="/home" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Continue as guest
        </Link>
      </div>
    </div>
  );
}
