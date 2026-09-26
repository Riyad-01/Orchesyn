import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let runtime: { url: string; anonKey: string } | null = null;

/**
 * Runtime (in-app) Supabase config — the learner pastes their OWN free-tier
 * project URL + anon key in Settings; stored on device, never in the build.
 * The anon key is public-by-design in Supabase (RLS protects the data).
 */
const LS_SUPABASE = 'stim:supabase';

export function getRuntimeSupabase(): { url: string; anonKey: string } | null {
  if (runtime) return runtime;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_SUPABASE);
    runtime = raw ? (JSON.parse(raw) as { url: string; anonKey: string }) : null;
    return runtime;
  } catch {
    return null;
  }
}

export function setRuntimeSupabase(cfg: { url: string; anonKey: string } | null): void {
  runtime = cfg;
  client = null; // force reconnect with the new config
  try {
    if (cfg) window.localStorage.setItem(LS_SUPABASE, JSON.stringify(cfg));
    else window.localStorage.removeItem(LS_SUPABASE);
  } catch {
    /* private mode */
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
      getRuntimeSupabase(),
  );
}

/**
 * Returns a Supabase client, or null when the app is running in local-only mode.
 * Every caller must handle null — the app is fully functional without a backend.
 */
export function supabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const rt = getRuntimeSupabase();
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? rt!.url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? rt!.anonKey,
    );
  }
  return client;
}

export const TABLES = {
  profiles: 'profiles',
  sessions: 'sessions',
  reports: 'reports',
  coachSessions: 'coach_sessions',
  mockResults: 'ielts_mock_results',
  notifications: 'notifications',
} as const;
