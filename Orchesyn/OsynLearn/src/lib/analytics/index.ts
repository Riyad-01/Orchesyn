/**
 * Privacy-conscious product analytics.
 *
 * Design rules (these ARE the privacy claims — keep code and copy in sync):
 *  - events stay on the learner's device (localStorage ring buffer) unless the
 *    learner explicitly connects cloud sync; nothing is sent to us or to any
 *    third party by this module, ever.
 *  - no identifiers, no IPs, no content of answers or recordings — only event
 *    names, counts, minute-granularity durations and plan labels.
 *  - the buffer is bounded (MAX_EVENTS) and the learner can erase it from
 *    Settings → privacy.
 *
 * The pilot uses these aggregates (exported manually with consent) to answer:
 * do learners finish diagnostics, retry after feedback, stay active in weeks
 * 1 and 4, convert, and what does AI cost per active learner?
 */

export const ANALYTICS_KEY = 'osyn:analytics';
export const MAX_EVENTS = 500;

export type AnalyticsEvent =
  | { name: 'diagnostic_completed'; kind: 'screening' | 'full'; skill?: string; at: number }
  | { name: 'first_corrected_retry'; lessonId: string; at: number }
  | { name: 'activity'; kind: 'session' | 'lesson' | 'writing' | 'mock'; minutes: number; at: number }
  | { name: 'conversion'; plan: string; at: number }
  | { name: 'cancellation'; plan: string; at: number }
  | { name: 'ai_cost'; usdCents: number; at: number };

export interface AnalyticsSummary {
  totalEvents: number;
  diagnosticsCompleted: number;
  firstCorrectedRetries: number;
  activeMinutes: number;
  activeDays: number;
  /** week-1 retention: any activity in days 1–7 after the first activity day */
  week1Retained: boolean | null;
  /** week-4 retention: any activity in days 22–28 after the first activity day */
  week4Retained: boolean | null;
  conversions: number;
  cancellations: number;
  aiCostUsdCents: number;
  /** ai cost per active learner — with one learner per device this is the device's own ratio */
  aiCostCentsPerActiveDay: number;
}

const DAY = 86_400_000;

export function readEvents(storage?: Pick<Storage, 'getItem'>): AnalyticsEvent[] {
  try {
    const s = storage ?? localStorage;
    return JSON.parse(s.getItem(ANALYTICS_KEY) ?? '[]') as AnalyticsEvent[];
  } catch {
    return [];
  }
}

/** Omit that distributes over the event union (plain Omit collapses it). */
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

export function track(
  event: DistributiveOmit<AnalyticsEvent, 'at'>,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): void {
  try {
    const s = storage ?? localStorage;
    const all = readEvents(s);
    all.push({ ...event, at: Date.now() } as AnalyticsEvent);
    // ring buffer: oldest events fall off, the device never grows unbounded
    s.setItem(ANALYTICS_KEY, JSON.stringify(all.slice(-MAX_EVENTS)));
  } catch {
    /* analytics must never break practice */
  }
}

export function clearAnalytics(storage?: Pick<Storage, 'removeItem'>): void {
  try {
    (storage ?? localStorage).removeItem(ANALYTICS_KEY);
  } catch {
    /* fine */
  }
}

export function summarise(
  events: AnalyticsEvent[],
  now: number = Date.now(),
): AnalyticsSummary {
  const activityDays = new Set(
    events.filter((e) => e.name === 'activity').map((e) => Math.floor(e.at / DAY)),
  );
  const firstDay = activityDays.size ? Math.min(...activityDays) : null;
  const inWindow = (from: number, to: number) => {
    if (firstDay == null) return null;
    if (now < firstDay * DAY + to * DAY) return null; // window not elapsed yet — unknown, not false
    for (const d of activityDays) if (d > firstDay + from - 1 && d <= firstDay + to) return true;
    return false;
  };
  const cost = events
    .filter((e): e is Extract<AnalyticsEvent, { name: 'ai_cost' }> => e.name === 'ai_cost')
    .reduce((s, e) => s + e.usdCents, 0);
  return {
    totalEvents: events.length,
    diagnosticsCompleted: events.filter((e) => e.name === 'diagnostic_completed').length,
    firstCorrectedRetries: events.filter((e) => e.name === 'first_corrected_retry').length,
    activeMinutes: events
      .filter((e): e is Extract<AnalyticsEvent, { name: 'activity' }> => e.name === 'activity')
      .reduce((s, e) => s + e.minutes, 0),
    activeDays: activityDays.size,
    week1Retained: inWindow(1, 7),
    week4Retained: inWindow(22, 28),
    conversions: events.filter((e) => e.name === 'conversion').length,
    cancellations: events.filter((e) => e.name === 'cancellation').length,
    aiCostUsdCents: cost,
    aiCostCentsPerActiveDay: activityDays.size ? Math.round(cost / activityDays.size) : 0,
  };
}
