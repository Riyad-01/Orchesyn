'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/lib/store/app';
import { useT } from '@/lib/i18n/use-t';
import { stashOnboardingDestination } from '@/lib/onboarding-dest';
import { ToastViewport } from '@/components/ui';
import { Logo } from '@/components/layout/logo';
import { CommandPalette } from '@/components/layout/command-palette';

/**
 * Global shell: splash screen, onboarding gate, service-worker registration and
 * the toast viewport. Everything else lives in the per-group layouts.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { loading, profile, toasts, dismissToast } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  /* PWA service worker */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  /* Self-update: when a NEW worker takes control, reload once so devices can
   * never silently sit on a stale build. First-ever activation is skipped. */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  /* Onboarding gate: first run goes to the wizard; auth pages stay free */
  useEffect(() => {
    if (loading) return;
    const freePaths = ['/onboarding', '/login', '/welcome', '/refer', '/partners', '/privacy', '/pricing'];
    const isFree = freePaths.includes(pathname);
    if (!profile) return;
    if (!profile.onboardingCompleted && !isFree) {
      // remember where the learner was headed; onboarding returns them there
      stashOnboardingDestination(pathname);
      router.replace('/onboarding');
    } else if (profile.onboardingCompleted && pathname === '/onboarding') {
      router.replace('/home');
    } else if (pathname === '/' ) {
      router.replace(profile.onboardingCompleted ? '/home' : '/onboarding');
    }
  }, [loading, profile, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg">
        <Logo size={56} />
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          warming up your coach
        </div>
      </div>
    );
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-extrabold focus:text-white"
      >
        Skip to content
      </a>
      <ToastViewport toasts={toasts} dismiss={dismissToast} />
      {profile?.onboardingCompleted ? <CommandPalette /> : null}
      <InstallPrompt />
      <OfflineBanner />
      {children}
    </>
  );
}

/** Honest offline state: practice continues locally; queued updates wait. */
function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const recount = () => {
      try {
        setPending((JSON.parse(window.localStorage.getItem('stim:sync-queue') ?? '[]') as unknown[]).length);
      } catch { /* fine */ }
    };
    recount();
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('osyn:sync-changed', recount);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('osyn:sync-changed', recount);
    };
  }, []);
  const t = useT();
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[65] flex items-center justify-center gap-2 bg-warn/95 px-4 py-2 text-xs font-extrabold text-black">
      📡 {t('offline.title')} — {t('offline.sub')}
      {pending > 0 && <span className="rounded bg-black/20 px-1.5 py-0.5">{pending} update{pending === 1 ? '' : 's'} queued to sync</span>}
    </div>
  );
}

/** PWA install campaign: surface the native prompt as a friendly pill once. */
function InstallPrompt() {
  const [deferred, setDeferred] = useState<Event & { prompt?: () => void } | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(typeof window !== 'undefined' && window.localStorage.getItem('osyn:install-dismissed') === '1');
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as Event & { prompt?: () => void });
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!deferred || dismissed) return null;
  return (
    <div className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-2xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-glow backdrop-blur lg:bottom-6">
      <span className="text-xs font-bold text-ink">Install OsynLearn — works offline</span>
      <button
        onClick={() => {
          deferred.prompt?.();
          setDeferred(null);
        }}
        className="tap rounded-xl bg-brand px-2.5 py-1 text-xs font-extrabold text-white"
      >
        Install
      </button>
      <button
        onClick={() => {
          window.localStorage.setItem('osyn:install-dismissed', '1');
          setDismissed(true);
        }}
        aria-label="Dismiss install prompt"
        className="tap px-1 text-xs font-bold text-muted"
      >
        ✕
      </button>
    </div>
  );
}
