/**
 * Offers, entitlements and AI allowances.
 *
 * AI allowances are NOT assumed unlimited: they derive from the measured
 * delivery cost recorded by the managed engine (see /eval usage dashboard).
 * MEASURED_ASSESSMENT_USD defaults to the value actually observed in round 6
 * ($0.00058 per validated assessment) and is configurable per deployment.
 */

export type OfferId = 'free' | 'prep' | 'teacher';

export interface Offer {
  id: OfferId;
  name: string;
  /** monthly price in the shop currency */
  priceMonthly: { usd: number; bdt: number };
  blurb: string;
  features: string[];
  /** managed AI assessments included per month, computed from cost budget */
  aiAssessmentsPerMonth: number;
  teacherTools: boolean;
}

export const MEASURED_ASSESSMENT_USD = 0.00058; // observed round-6: $0.00058 per validated assessment

const aiBudget = (usd: number) => Math.floor(usd / MEASURED_ASSESSMENT_USD);

export const OFFERS: Offer[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: { usd: 0, bdt: 0 },
    blurb: 'On-device coaching forever. Managed AI is a small daily taste.',
    features: ['Unlimited on-device practice & provisional feedback', '3 managed AI assessments / month', 'Progress, mistake book, adaptive plan'],
    aiAssessmentsPerMonth: aiBudget(0.002), // ~3 — a token budget, not a promise of infinity
    teacherTools: false,
  },
  {
    id: 'prep',
    name: 'Paid Preparation',
    priceMonthly: { usd: 9, bdt: 1150 },
    blurb: 'Full examiner-style feedback within a sustainable AI budget.',
    features: ['Everything in Free', '≈3,100 managed AI assessments / month (measured-cost budget)', 'Detailed reports & PDF export', 'Full mock library'],
    aiAssessmentsPerMonth: aiBudget(1.8),
    teacherTools: false,
  },
  {
    id: 'teacher',
    name: 'Teacher-Supported',
    priceMonthly: { usd: 29, bdt: 3700 },
    blurb: 'A human teacher on top of the AI: assignments, review, overrides.',
    features: ['Everything in Paid Preparation', 'Teacher workspace: assign, review, override with audit trail', 'Class progress monitoring', 'Human-reviewed assessment queue'],
    aiAssessmentsPerMonth: aiBudget(3.5),
    teacherTools: true,
  },
];

export const offerById = (id: string): Offer | undefined => OFFERS.find((o) => o.id === id);

/* ------------------------------ currencies -------------------------------- */

export type Currency = 'USD' | 'BDT';

/** One presentation rule everywhere: symbol + code + 2dp (0dp for whole BDT). */
export function formatMoney(usd: number, currency: Currency, rateUsdToBdt = 127): string {
  if (currency === 'BDT') return `৳${Math.round(usd * rateUsdToBdt).toLocaleString('en-US')} BDT`;
  return `$${usd.toFixed(2)} USD`;
}

/* ----------------------------- entitlements ------------------------------- */

export interface Entitlements {
  offer: OfferId;
  status: 'active' | 'past_due' | 'cancelled' | 'none';
  aiAssessmentsPerMonth: number;
  detailedReport: boolean;
  exportPdf: boolean;
  teacherTools: boolean;
  /** server-computed; the client may display but never decide */
  currentPeriodEnd: string | null;
}

export const FREE_ENTITLEMENTS: Entitlements = {
  offer: 'free',
  status: 'none',
  aiAssessmentsPerMonth: offerById('free')!.aiAssessmentsPerMonth,
  detailedReport: false,
  exportPdf: false,
  teacherTools: false,
  currentPeriodEnd: null,
};

export function entitlementsFor(offer: OfferId, status: 'active' | 'past_due' | 'cancelled', periodEnd: string | null): Entitlements {
  const o = offerById(offer)!;
  // past_due keeps access until the retry window ends; cancelled drops to Free immediately
  if (status === 'cancelled') return { ...FREE_ENTITLEMENTS, status: 'cancelled' };
  const active = status === 'active';
  return {
    offer: active ? offer : 'free',
    status,
    aiAssessmentsPerMonth: active ? o.aiAssessmentsPerMonth : FREE_ENTITLEMENTS.aiAssessmentsPerMonth,
    detailedReport: active ? true : false,
    exportPdf: active ? offer !== 'free' : false,
    teacherTools: active ? o.teacherTools : false,
    currentPeriodEnd: periodEnd,
  };
}
