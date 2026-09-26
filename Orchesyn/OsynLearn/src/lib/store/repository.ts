import type {
  Achievement,
  ChatMessage,
  CoachSession,
  DailyProgress,
  FeedbackReport,
  IeltsMockResult,
  Notification,
  Plan,
  Profile,
  Session,
  StreakInfo,
} from '@/types';
import { isSupabaseConfigured, supabase, TABLES } from '@/lib/db/supabase';
import { localDateKey } from '@/lib/utils';

/**
 * Persistence.
 *
 * One interface, two implementations. `LocalRepository` keeps everything in
 * localStorage so the app is fully usable with no backend at all;
 * `SupabaseRepository` syncs the same shapes to Postgres behind RLS.
 * Screens never know which one they are talking to.
 */
export interface Repository {
  readonly mode: 'local' | 'supabase';

  getProfile(userId: string): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<Profile>;

  listSessions(userId: string, limit?: number): Promise<Session[]>;
  saveSession(session: Session): Promise<Session>;

  getReport(id: string): Promise<FeedbackReport | null>;
  saveReport(report: FeedbackReport): Promise<void>;

  listCoachSessions(userId: string): Promise<CoachSession[]>;
  saveCoachSession(session: CoachSession): Promise<CoachSession>;

  listMockResults(userId: string): Promise<IeltsMockResult[]>;
  saveMockResult(result: IeltsMockResult): Promise<IeltsMockResult>;

  listNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(userId: string, id: string): Promise<void>;

  /** wipe sessions + reports + coach + mocks + notifications; profile survives */
  clearHistory(userId: string): Promise<void>;
}

/* ------------------------------------------------------------------ *
 * Local implementation
 * ------------------------------------------------------------------ */

const KEY = {
  profile: (u: string) => `stim:profile:${u}`,
  sessions: (u: string) => `stim:sessions:${u}`,
  reports: 'stim:reports',
  coach: (u: string) => `stim:coach:${u}`,
  mocks: (u: string) => `stim:mocks:${u}`,
  notifications: (u: string) => `stim:notifications:${u}`,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded — drop the oldest reports rather than breaking the session
    try {
      const reports = read<Record<string, FeedbackReport>>(KEY.reports, {});
      const ids = Object.keys(reports).slice(0, Math.max(1, Math.floor(Object.keys(reports).length / 2)));
      for (const id of ids) delete reports[id];
      window.localStorage.setItem(KEY.reports, JSON.stringify(reports));
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // nothing else we can do; the in-memory state still works for this session
    }
  }
}

export class LocalRepository implements Repository {
  readonly mode = 'local' as const;

  async getProfile(userId: string) {
    return read<Profile | null>(KEY.profile(userId), null);
  }

  async saveProfile(profile: Profile) {
    write(KEY.profile(profile.userId), profile);
    return profile;
  }

  async listSessions(userId: string, limit = 100) {
    return read<Session[]>(KEY.sessions(userId), [])
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async saveSession(session: Session) {
    const all = read<Session[]>(KEY.sessions(session.userId), []);
    const next = [...all.filter((s) => s.id !== session.id), session];
    write(KEY.sessions(session.userId), next.slice(0, 500));
    return session;
  }

  async getReport(id: string) {
    return read<Record<string, FeedbackReport>>(KEY.reports, {})[id] ?? null;
  }

  async saveReport(report: FeedbackReport) {
    const all = read<Record<string, FeedbackReport>>(KEY.reports, {});
    all[report.id] = report;
    // keep the store bounded; the newest 200 reports are plenty
    const entries = Object.entries(all).sort((a, b) => b[1].createdAt.localeCompare(a[1].createdAt));
    write(KEY.reports, Object.fromEntries(entries.slice(0, 200)));
  }

  async listCoachSessions(userId: string) {
    return read<CoachSession[]>(KEY.coach(userId), []).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  async saveCoachSession(session: CoachSession) {
    const all = read<CoachSession[]>(KEY.coach(session.userId), []);
    write(KEY.coach(session.userId), [...all.filter((s) => s.id !== session.id), session].slice(0, 100));
    return session;
  }

  async listMockResults(userId: string) {
    return read<IeltsMockResult[]>(KEY.mocks(userId), []).sort((a, b) => b.date.localeCompare(a.date));
  }

  async saveMockResult(result: IeltsMockResult) {
    const all = read<IeltsMockResult[]>(KEY.mocks(result.userId), []);
    write(KEY.mocks(result.userId), [...all.filter((r) => r.id !== result.id), result].slice(0, 100));
    return result;
  }

  async listNotifications(userId: string) {
    return read<Notification[]>(KEY.notifications(userId), []);
  }

  async markNotificationRead(userId: string, id: string) {
    const all = read<Notification[]>(KEY.notifications(userId), []);
    write(
      KEY.notifications(userId),
      all.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async clearHistory(userId: string) {
    const sessions = read<Session[]>(KEY.sessions(userId), []);
    const reportIds = new Set(sessions.map((s) => s.reportId).filter(Boolean));
    const reports = read<Record<string, FeedbackReport>>(KEY.reports, {});
    // precise prune: only reports referenced by this user's sessions go
    for (const id of reportIds) delete reports[id];
    write(KEY.reports, reports);
    write(KEY.sessions(userId), []);
    write(KEY.coach(userId), []);
    write(KEY.mocks(userId), []);
    write(KEY.notifications(userId), []);
  }
}

/* ------------------------------------------------------------------ *
 * Supabase implementation
 * ------------------------------------------------------------------ */

export class SupabaseRepository implements Repository {
  readonly mode = 'supabase' as const;

  private get db() {
    const client = supabase();
    if (!client) throw new Error('Supabase is not configured');
    return client;
  }

  async getProfile(userId: string) {
    const { data } = await this.db
      .from(TABLES.profiles)
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data ? (mapProfile(data) as Profile) : null;
  }

  async saveProfile(profile: Profile) {
    await this.db.from(TABLES.profiles).upsert(unmapProfile(profile), { onConflict: 'id' });
    return profile;
  }

  async listSessions(userId: string, limit = 100) {
    const { data } = await this.db
      .from(TABLES.sessions)
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);
    return (data ?? []).map(mapSession);
  }

  async saveSession(session: Session) {
    await this.db.from(TABLES.sessions).upsert(
      {
        id: session.id,
        user_id: session.userId,
        mode: session.mode,
        title: session.title,
        status: session.status,
        topic_id: session.topicId ?? null,
        theme_id: session.themeId ?? null,
        scenario_id: session.scenarioId ?? null,
        drill_id: session.drillId ?? null,
        mock_id: session.mockId ?? null,
        started_at: session.startedAt,
        finished_at: session.finishedAt ?? null,
        spoken_sec: session.spokenSec,
        overall: session.overall,
        band: session.band,
        dimension_scores: session.dimensionScores,
        report_id: session.reportId,
      },
      { onConflict: 'id' },
    );
    return session;
  }

  async getReport(id: string) {
    const { data } = await this.db.from(TABLES.reports).select('payload').eq('id', id).maybeSingle();
    return (data?.payload as FeedbackReport) ?? null;
  }

  async saveReport(report: FeedbackReport) {
    await this.db.from(TABLES.reports).upsert(
      {
        id: report.id,
        user_id: report.sessionId.startsWith('guest') ? null : currentUserId(),
        session_id: null,
        mode: report.mode,
        overall: report.overall,
        band: report.band,
        cefr: report.cefr,
        transcript: report.transcript,
        payload: report,
      },
      { onConflict: 'id' },
    );
  }

  async listCoachSessions(userId: string) {
    const { data } = await this.db
      .from(TABLES.coachSessions)
      .select('*')
      .eq('user_id', userId)
      .order('last_at', { ascending: false });
    return (data ?? []).map(mapCoachSession);
  }

  async saveCoachSession(session: CoachSession) {
    await this.db.from(TABLES.coachSessions).upsert(
      {
        id: session.id,
        user_id: session.userId,
        theme_id: session.themeId ?? null,
        scenario_id: session.scenarioId ?? null,
        title: session.title,
        messages: session.messages,
        totals: session.totals,
        started_at: session.startedAt,
        last_at: session.lastAt,
      },
      { onConflict: 'id' },
    );
    return session;
  }

  async listMockResults(userId: string) {
    const { data } = await this.db
      .from(TABLES.mockResults)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    return (data ?? []).map(mapMockResult);
  }

  async saveMockResult(result: IeltsMockResult) {
    await this.db.from(TABLES.mockResults).upsert(
      {
        id: result.id,
        user_id: result.userId,
        mock_id: result.mockId,
        band: result.band,
        overall: result.overall,
        parts: result.parts,
        report_ids: result.reportIds,
        date: result.date,
      },
      { onConflict: 'id' },
    );
    return result;
  }

  async listNotifications(userId: string) {
    const { data } = await this.db
      .from(TABLES.notifications)
      .select('*')
      .eq('user_id', userId)
      .order('at', { ascending: false })
      .limit(50);
    return (data ?? []).map(mapNotification);
  }

  async markNotificationRead(userId: string, id: string) {
    await this.db.from(TABLES.notifications).update({ read: true }).eq('id', id).eq('user_id', userId);
  }

  async clearHistory(userId: string) {
    const { data } = await this.db.from(TABLES.sessions).select('report_id').eq('user_id', userId);
    const reportIds = (data ?? []).map((r: any) => r.report_id).filter(Boolean);
    await Promise.all([
      this.db.from(TABLES.sessions).delete().eq('user_id', userId),
      this.db.from(TABLES.coachSessions).delete().eq('user_id', userId),
      this.db.from(TABLES.mockResults).delete().eq('user_id', userId),
      this.db.from(TABLES.notifications).delete().eq('user_id', userId),
      reportIds.length ? this.db.from(TABLES.reports).delete().in('id', reportIds) : Promise.resolve(),
    ]);
  }
}

/* ------------------------------------------------------------------ *
 * mappers (snake_case rows <-> camelCase domain types)
 * ------------------------------------------------------------------ */

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    userId: row.id,
    name: row.name,
    email: row.email ?? undefined,
    avatarColor: row.avatar_color,
    level: row.level,
    goal: row.goal,
    accentTarget: row.accent_target,
    dailyGoalMin: row.daily_goal_min,
    availableMinPerDay: row.available_min_per_day,
    nativeLanguage: row.native_language ?? undefined,
    practiceLanguage: row.practice_language ?? undefined,
    examDate: row.exam_date ?? undefined,
    ieltsModule: row.ielts_module ?? undefined,
    targetOverall: row.target_overall ?? undefined,
    targetSpeaking: row.target_speaking ?? undefined,
    targetSections: row.target_sections ?? undefined,
    uiLanguage: row.ui_language ?? undefined,
    sectionLevels: row.section_levels ?? undefined,
    plan: row.plan as Plan,
    createdAt: row.created_at,
    onboardingCompleted: row.onboarding_completed,
  };
}

function unmapProfile(p: Profile) {
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? null,
    avatar_color: p.avatarColor,
    level: p.level,
    goal: p.goal,
    accent_target: p.accentTarget,
    daily_goal_min: p.dailyGoalMin,
    available_min_per_day: p.availableMinPerDay,
    native_language: p.nativeLanguage ?? null,
    practice_language: p.practiceLanguage ?? null,
    exam_date: p.examDate ?? null,
    ielts_module: p.ieltsModule ?? null,
    target_overall: p.targetOverall ?? null,
    target_speaking: p.targetSpeaking ?? null,
    target_sections: p.targetSections ?? null,
    ui_language: p.uiLanguage ?? null,
    section_levels: p.sectionLevels ?? null,
    plan: p.plan,
    onboarding_completed: p.onboardingCompleted,
  };
}

function mapSession(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    title: row.title,
    status: row.status,
    topicId: row.topic_id ?? undefined,
    themeId: row.theme_id ?? undefined,
    scenarioId: row.scenario_id ?? undefined,
    drillId: row.drill_id ?? undefined,
    mockId: row.mock_id ?? undefined,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    spokenSec: row.spoken_sec,
    overall: row.overall,
    band: row.band,
    dimensionScores: row.dimension_scores,
    reportId: row.report_id,
  };
}

function mapCoachSession(row: any): CoachSession {
  return {
    id: row.id,
    userId: row.user_id,
    themeId: row.theme_id ?? undefined,
    scenarioId: row.scenario_id ?? undefined,
    title: row.title,
    messages: row.messages as ChatMessage[],
    startedAt: row.started_at,
    lastAt: row.last_at,
    totals: row.totals,
  };
}

function mapMockResult(row: any): IeltsMockResult {
  return {
    id: row.id,
    userId: row.user_id,
    mockId: row.mock_id,
    date: row.date,
    band: row.band,
    parts: row.parts,
    overall: row.overall,
    reportIds: row.report_ids ?? [],
  };
}

function mapNotification(row: any): Notification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    at: row.at,
    read: row.read,
    kind: row.kind,
  };
}

let cachedUserId: string | null = null;
export function setCurrentUserId(id: string | null) {
  cachedUserId = id;
}
function currentUserId(): string | null {
  return cachedUserId;
}

/** Choose the implementation once, at startup. */
export function createRepository(): Repository {
  return isSupabaseConfigured() ? new SupabaseRepository() : new LocalRepository();
}

/* ------------------------------------------------------------------ *
 * Derived progress — identical maths for both implementations
 * ------------------------------------------------------------------ */

export function computeStreak(sessions: Session[], dailyGoalMin: number): StreakInfo {
  const goalSec = dailyGoalMin * 60;
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = localDateKey(new Date(s.startedAt));
    byDay.set(key, (byDay.get(key) ?? 0) + s.spokenSec);
  }
  const qualifying = [...byDay.entries()].filter(([, sec]) => sec >= goalSec).map(([d]) => d).sort();
  const today = localDateKey();

  let current = 0;
  const cursor = new Date();
  // a streak survives today not being finished yet
  if (!qualifying.includes(today)) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    const key = localDateKey(cursor);
    if (qualifying.includes(key)) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of qualifying) {
    const date = new Date(`${d}T00:00:00`);
    run = prev && (date.getTime() - prev.getTime()) / 86400000 === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  const todaySec = byDay.get(today) ?? 0;
  return {
    current,
    longest,
    days: qualifying,
    dailyGoalMin,
    goalMetToday: todaySec >= goalSec,
    atRisk: current > 0 && !qualifying.includes(today),
    freezeCount: 0,
  };
}

export function computeDailyProgress(sessions: Session[], days = 30): DailyProgress[] {
  const out: DailyProgress[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = localDateKey(date);
    const daySessions = sessions.filter(
      (s) => s.status === 'completed' && localDateKey(new Date(s.startedAt)) === key,
    );
    const spokenSec = daySessions.reduce((a, s) => a + s.spokenSec, 0);
    const dims: DailyProgress['dimensions'] = {};
    for (const s of daySessions) {
      for (const [k, v] of Object.entries(s.dimensionScores)) {
        if (typeof v !== 'number' || v < 0) continue;
        const key2 = k as keyof typeof dims;
        dims[key2] = Math.max(dims[key2] ?? 0, v);
      }
    }
    out.push({
      date: key,
      spokenSec,
      sessions: daySessions.length,
      goalSec: 0,
      bestOverall: daySessions.reduce((a, s) => Math.max(a, s.overall), 0),
      dimensions: dims,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Achievements
 * ------------------------------------------------------------------ */

export function computeAchievements(sessions: Session[], streak: StreakInfo): Achievement[] {
  const totalSec = sessions.reduce((a, s) => a + s.spokenSec, 0);
  const bestBand = sessions.reduce((a, s) => Math.max(a, s.band), 0);
  const mockCount = sessions.filter((s) => s.mockId).length;
  const defs: Achievement[] = [
    { id: 'first-speech', title: 'First words', description: 'Complete your first speaking session.', emoji: '🎙️', progress: { value: sessions.length, target: 1 } },
    { id: 'ten-sessions', title: 'Getting serious', description: 'Complete 10 speaking sessions.', emoji: '🔟', progress: { value: sessions.length, target: 10 } },
    { id: 'hour-spoken', title: 'One hour spoken', description: 'Speak for a cumulative hour.', emoji: '⏱️', progress: { value: Math.round(totalSec / 60), target: 60 } },
    { id: 'streak-3', title: 'Three days running', description: 'Keep a 3-day streak.', emoji: '🔥', progress: { value: streak.current, target: 3 } },
    { id: 'streak-7', title: 'Week warrior', description: 'Keep a 7-day streak.', emoji: '📅', progress: { value: streak.current, target: 7 } },
    { id: 'streak-30', title: 'Habit formed', description: 'Keep a 30-day streak.', emoji: '🏆', progress: { value: streak.current, target: 30 } },
    { id: 'band-6', title: 'Band 6', description: 'Score an IELTS band 6 or higher.', emoji: '🎯', progress: { value: bestBand, target: 6 } },
    { id: 'band-7', title: 'Band 7', description: 'Score an IELTS band 7 or higher.', emoji: '🥇', progress: { value: bestBand, target: 7 } },
    { id: 'first-mock', title: 'Exam ready', description: 'Finish a full IELTS mock.', emoji: '📝', progress: { value: mockCount, target: 1 } },
  ];
  return defs.map((a) => {
    const value = a.progress?.value ?? 0;
    const target = a.progress?.target ?? 1;
    const earned = value >= target;
    return { ...a, earnedAt: earned ? new Date().toISOString() : undefined };
  });
}
