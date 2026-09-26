import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refer a friend — OsynLearn',
  description:
    'Share OsynLearn with a friend preparing for IELTS. During the pilot, referral credits are applied manually within 48 hours of your friend completing onboarding.',
};

/**
 * Referral programme — pilot mechanics, stated honestly:
 * attribution is recorded in-app; credits are applied manually during the pilot
 * because automated credit granting depends on live billing (a release step).
 */
export default function ReferPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Referrals · pilot</p>
      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Practising with a friend works better.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Share OsynLearn with someone preparing for IELTS or building everyday English. When they
        finish onboarding with your referral code, you both receive <strong className="text-ink">2 extra
        managed AI assessments</strong> on the Free plan.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm font-extrabold text-ink">How it works during the pilot</p>
        <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          <li>1. Your referral code is shown in Settings once your account exists (guest practice keeps working without one).</li>
          <li>2. Your friend signs up and enters the code — attribution is stored with their profile.</li>
          <li>3. Pilot coordinators verify the match and apply both credits manually, within 48 hours.</li>
        </ol>
        <p className="mt-3 text-[11px] text-faint">
          Automated crediting arrives with live billing — until then we keep it manual and honest rather than fake it.
          Referral data is limited to the code and signup date; no contact lists, no spam, ever.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/welcome" className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white">What is OsynLearn?</Link>
        <Link href="/privacy" className="rounded-xl border border-line px-5 py-3 text-sm font-extrabold text-ink">Privacy notice</Link>
      </div>
    </main>
  );
}
