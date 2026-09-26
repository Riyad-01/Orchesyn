'use client';

import { track } from '@/lib/analytics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Achievement,
  CoachSession,
  DailyProgress,
  FeedbackReport,
  IeltsMockResult,
  Plan,
  Profile,
  Session,
  StreakInfo,
  SubscriptionState,
} from '@/types';
import {
  computeAchievements,
  computeDailyProgress,
  computeStreak,
  createRepository,
  setCurrentUserId,
  type Repository,
} from './repository';
import { supabase } from '@/lib/db/supabase';
import { localDateKey, uid } from '@/lib/utils';
import { SyncQueue } from '@/lib/sync/queue';

const GUEST_ID = 'guest';

export const PLAN_LIMITS: Record<Plan, SubscriptionState['limits']> = {
  free: {
    dailySessions: 3,
    ieltsMocksPerMonth: 1,
    detailedReport: false,
    roadmap: false,
    exportPdf: false,
    coachVoiceCallsPerDay: 2,
  },
  plus: {
    dailySessions: 'unlimited',
    ieltsMocksPerMonth: 8,
    detailedReport: true,
    roadmap: true,
    exportPdf: false,
    coachVoiceCallsPerDay: 'unlimited',
  },
  pro: {
    dailySessions: 'unlimited',
    ieltsMocksPerMonth: 'unlimited',
    detailedReport: true,
    roadmap: true,
    exportPdf: true,
    coachVoiceCallsPerDay: 'unlimited',
  },
};

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: 'info' | 'success' | 'warn' | 'bad';
}

interface AppState {
  repo: Repository;
  storageMode: 'local' | 'supabase';
  profile: Profile | null;
  isGuest: boolean;
  loading: boolean;
  sessions: Session[];
  streak: StreakInfo;
  daily: DailyProgress[];
  achievements: Achievement[];
  subscription: SubscriptionState;
  theme: 'dark' | 'light';
  toasts: Toast[];

  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  completeOnboarding: (patch: Partial<Profile>) => Promise<void>;
  recordSession: (session: Session, report: FeedbackReport) => Promise<void>;
  clearHistory: () => Promise<void>;
  saveCoachSession: (session: CoachSession) => Promise<void>;
  coachSessions: CoachSession[];
  mockResults: IeltsMockResult[];
  saveMockResult: (result: IeltsMockResult) => Promise<void>;
  sessionsToday: number;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  /** re-read everything from the repository (after seeding / importing) */
  refresh: () => Promise<void>;
}

import { matchDeviceLanguage } from '@/lib/i18n/languages';

const AppContext = createContext<AppState | null>(null);

function defaultProfile(userId: string): Profile {
  return {
    id: userId,
    userId,
    name: 'Learner',
    avatarColor: '#7C5CFF',
    level: 'B1',
    goal: 'general',
    accentTarget: 'neutral',
    dailyGoalMin: 10,
    availableMinPerDay: 15,
    practiceLanguage: matchDeviceLanguage().bcp47,
    plan: 'free',
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createRepository(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [coachSessions, setCoachSessions] = useState<CoachSession[]>([]);
  const [mockResults, setMockResults] = useState<IeltsMockResult[]>([]);
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ---------------- theme ---------------- */
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('stim:theme') : null;
    const next = (stored === 'light' ? 'light' : 'dark') as 'dark' | 'light';
    setThemeState(next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = useCallback((next: 'dark' | 'light') => {
    setThemeState(next);
    try {
      window.localStorage.setItem('stim:theme', next);
    } catch {
      // ignore
    }
  }, []);

  /* ---------------- toasts ---------------- */
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = uid('toast');
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /* ---------------- bootstrap ---------------- */
  const [userId, setUserId] = useState(GUEST_ID);

  const load = useCallback(
    async (userId: string) => {
      setUserId(userId);
      setCurrentUserId(userId);
      const [stored, sessionList, coachList, mocks] = await Promise.all([
        repo.getProfile(userId),
        repo.listSessions(userId, 200),
        repo.listCoachSessions(userId),
        repo.listMockResults(userId),
      ]);
      setProfile(stored ?? defaultProfile(userId));
      setSessions(sessionList);
      setCoachSessions(coachList);
      setMockResults(mocks);
      setLoading(false);
    },
    [repo],
  );

  const refresh = useCallback(() => load(userId), [load, userId]);

  useEffect(() => {
    let cancelled = false;
    const client = supabase();
    if (!client) {
      void load(GUEST_ID);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (cancelled) return;
      await load(user?.id ?? GUEST_ID);
      const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
        const nextId = session?.user?.id ?? GUEST_ID;
        void load(nextId);
      });
      if (cancelled) sub.subscription.unsubscribe();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  /* ---------------- derived ---------------- */
  const streak = useMemo(
    () => computeStreak(sessions, profile?.dailyGoalMin ?? 10),
    [sessions, profile?.dailyGoalMin],
  );
  const daily = useMemo(() => computeDailyProgress(sessions, 30), [sessions]);
  const achievements = useMemo(() => computeAchievements(sessions, streak), [sessions, streak]);
  const sessionsToday = useMemo(
    () =>
      sessions.filter(
        (s) => s.status === 'completed' && localDateKey(new Date(s.startedAt)) === localDateKey(),
      ).length,
    [sessions],
  );

  const plan: Plan = profile?.plan ?? 'free';
  const subscription = useMemo<SubscriptionState>(
    () => ({ plan, trialing: false, limits: PLAN_LIMITS[plan] }),
    [plan],
  );

  /* ---------------- actions ---------------- */
  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      setProfile((prev) => {
        const next = prev ? { ...prev, ...patch } : null;
        if (next) void repo.saveProfile(next);
        return next;
      });
    },
    [repo],
  );

  const completeOnboarding = useCallback(
    async (patch: Partial<Profile>) => {
      await updateProfile({ ...patch, onboardingCompleted: true });
    },
    [updateProfile],
  );

  const recordSession = useCallback(
    async (session: Session, report: FeedbackReport) => {
      track({
        name: 'activity',
        kind: 'session',
        minutes: Math.max(
          1,
          Math.round(((session.finishedAt ? Date.parse(session.finishedAt) : Date.now()) - Date.parse(session.startedAt)) / 60000) || 1,
        ),
      });
      try {
        await Promise.all([repo.saveReport(report), repo.saveSession(session)]);
      } catch (e) {
        // offline / cloud hiccup: NEVER lose the attempt — queue for sync
        if (repo.mode === 'supabase') {
          SyncQueue.fromLocalStorage('stim:sync-queue').enqueue(`sess-${session.id}`, 'session', { session, report });
          window.dispatchEvent(new CustomEvent('osyn:sync-changed'));
          toast({ tone: 'warn', title: 'Saved on this device', body: 'Cloud sync failed (offline?). The attempt is queued and will upload when you are back online.' });
        } else {
          throw e;
        }
      }
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
    },
    [repo, toast],
  );

  /* queued synchronisation: flush on reconnect, in order, deduped by id */
  useEffect(() => {
    const flush = async () => {
      const q = SyncQueue.fromLocalStorage('stim:sync-queue');
      if (q.list().length === 0) return;
      const r = await q.flush(async (op) => {
        try {
          const { session, report } = op.payload as { session: Session; report: FeedbackReport };
          await Promise.all([repo.saveReport(report), repo.saveSession(session)]);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: String(e).slice(0, 100) };
        }
      });
      window.dispatchEvent(new CustomEvent('osyn:sync-changed'));
      if (r.applied > 0) toast({ tone: 'success', title: 'Back online', body: `${r.applied} queued update${r.applied === 1 ? '' : 's'} synced to the cloud.` });
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [repo, toast]);

  const clearHistory = useCallback(async () => {
    const userId = profile?.userId ?? GUEST_ID;
    await repo.clearHistory(userId);
    setSessions([]);
    setCoachSessions([]);
    setMockResults([]);
  }, [repo, profile]);

  const saveCoachSession = useCallback(
    async (session: CoachSession) => {
      await repo.saveCoachSession(session);
      setCoachSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
    },
    [repo],
  );

  const saveMockResult = useCallback(
    async (result: IeltsMockResult) => {
      await repo.saveMockResult(result);
      setMockResults((prev) => [result, ...prev.filter((r) => r.id !== result.id)]);
    },
    [repo],
  );

  const signInWithGoogle = useCallback(async () => {
    const client = supabase();
    if (!client) {
      toast({ tone: 'warn', title: 'Sign-in is not configured', body: 'Add your Supabase keys in .env.local to enable accounts. Everything still works locally.' });
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    if (error) toast({ tone: 'bad', title: 'Sign-in failed', body: error.message });
  }, [toast]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      const client = supabase();
      if (!client) {
        toast({ tone: 'warn', title: 'Sign-in is not configured', body: 'Add your Supabase keys in .env.local to enable accounts.' });
        return { error: 'not-configured' };
      }
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
      });
      if (error) {
        toast({ tone: 'bad', title: 'Could not send the link', body: error.message });
        return { error: error.message };
      }
      toast({ tone: 'success', title: 'Check your inbox', body: 'We sent you a magic link.' });
      return {};
    },
    [toast],
  );

  const signOut = useCallback(async () => {
    const client = supabase();
    if (client) await client.auth.signOut();
    setCurrentUserId(GUEST_ID);
    setProfile(null);
    setSessions([]);
    setCoachSessions([]);
    setMockResults([]);
    await load(GUEST_ID);
  }, [load]);

  const value: AppState = {
    repo,
    storageMode: repo.mode,
    profile,
    isGuest: !profile || profile.userId === GUEST_ID,
    loading,
    sessions,
    streak,
    daily,
    achievements,
    subscription,
    theme,
    toasts,
    updateProfile,
    completeOnboarding,
    recordSession,
    clearHistory,
    saveCoachSession,
    coachSessions,
    mockResults,
    saveMockResult,
    sessionsToday,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    setTheme,
    toast,
    dismissToast,
    refresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export { GUEST_ID };
