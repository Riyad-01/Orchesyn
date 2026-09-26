/**
 * Destination preservation across onboarding.
 * The shell gate stashes where the learner was headed; the wizard returns
 * them there after completion instead of always dumping them on /home.
 */

export const ONBOARDING_NEXT_KEY = 'osyn:next';

export function stashOnboardingDestination(pathname: string): void {
  if (pathname === '/') return;
  try {
    window.sessionStorage.setItem(ONBOARDING_NEXT_KEY, pathname);
  } catch {
    /* private mode */
  }
}

export function consumeOnboardingDestination(): string | null {
  try {
    const next = window.sessionStorage.getItem(ONBOARDING_NEXT_KEY);
    if (next) window.sessionStorage.removeItem(ONBOARDING_NEXT_KEY);
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  } catch {
    return null;
  }
}
