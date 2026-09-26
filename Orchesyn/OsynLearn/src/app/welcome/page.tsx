import type { Metadata } from 'next';
import Link from 'next/link';
import { OFFERS, formatMoney } from '@/lib/billing/plans';

export const metadata: Metadata = {
  title: 'OsynLearn — honest speaking practice for IELTS and everyday English',
  description:
    'AI-assisted speaking practice with a diagnostic-first adaptive plan, examiner-style feedback, full IELTS mocks and teacher review. Free on-device practice; practice in Bangla or English.',
};

/**
 * Public landing page. Rules this page must never break:
 *  - no invented testimonials, outcome statistics or product-market-fit claims
 *  - every capability sentence maps to a shipped feature
 *  - pricing is imported from the same OFFERS data the app bills against
 */
export default function WelcomePage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/header-dark.png" alt="OsynLearn — Learn more. Become more." width={290} height={79} className="mb-5 select-none" />
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">OsynLearn · pilot</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          Speaking practice that tells you the truth.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Record an answer, get rubric-based feedback on fluency, grammar, vocabulary and
          pronunciation, then retry with the correction in hand. A short diagnostic builds an
          adaptive plan; weak skills get extra time; mastered lessons come back for scheduled
          review. Practice in Bangla or English — the interface speaks Bangla too.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/diagnostic" className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white">
            Try the 3-minute screening
          </Link>
          <Link href="/impromptu" className="rounded-xl border border-line px-5 py-3 text-sm font-extrabold text-ink">
            Sample experience: answer a topic now
          </Link>
        </div>
        <p className="mt-2 text-[11px] text-faint">
          No microphone? Every speaking task has a typed fallback. No account needed to try it.
        </p>
      </header>

      <section className="mt-12" aria-labelledby="how">
        <h2 id="how" className="font-display text-xl font-extrabold text-ink">How it works</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['Diagnose', 'One unseen question per skill. Levels are labelled provisional until fuller diagnostics confirm them.'],
            ['Plan', 'Every skill appears weekly; weaker skills get more time. You set the minutes per day.'],
            ['Practise & get corrected', 'Explain → worked example → guided → independent attempts. Feedback shows the correction; you retry with it.'],
            ['Review & prove it', 'Mastered lessons are scheduled for later review. First-try answers on unseen items are what count as improvement.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs font-extrabold text-brand">{i + 1} · {t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="pricing">
        <h2 id="pricing" className="font-display text-xl font-extrabold text-ink">Pricing</h2>
        <p className="mt-1 text-xs text-faint">
          Managed AI assessments are a measured-cost budget, not a promise of infinity. On-device practice is unlimited on every plan.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {OFFERS.map((o) => (
            <div key={o.id} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-extrabold text-ink">{o.name}</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">
                {o.priceMonthly.usd === 0 ? 'Free' : formatMoney(o.priceMonthly.usd, 'USD')}
                {o.priceMonthly.usd > 0 && <span className="text-xs font-bold text-faint"> /month</span>}
              </p>
              <p className="text-xs text-faint">
                {o.priceMonthly.usd === 0 ? '' : `≈ ${formatMoney(o.priceMonthly.usd, 'BDT')}/month equivalent`}
              </p>
              <ul className="mt-3 space-y-1.5">
                {o.features.map((f) => (
                  <li key={f} className="text-xs leading-relaxed text-muted">· {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-faint">
          Payments currently run in sandbox while the pilot completes provider integration for Bangladesh (bKash/Nagad/SSLCommerz are the planned rails). You will not be charged during the pilot.
        </p>
      </section>

      <section className="mt-12 grid gap-3 sm:grid-cols-2" aria-labelledby="more">
        <h2 id="more" className="sr-only">More</h2>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-extrabold text-ink">For coaching centres & teachers</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Assign work, review submissions, override AI feedback with a permanent audit trail.
            Learner data stays inside your organisation.
          </p>
          <Link href="/partners" className="mt-3 inline-block text-xs font-extrabold text-brand hover:underline">Partnership details →</Link>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-extrabold text-ink">Privacy, plainly</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Practice works on-device; analytics stay on your device unless you connect cloud sync;
            recordings upload only with your explicit consent and can be erased from Settings.
          </p>
          <Link href="/privacy" className="mt-3 inline-block text-xs font-extrabold text-brand hover:underline">Full privacy notice →</Link>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-line bg-surface2 p-5" aria-labelledby="honesty">
        <h2 id="honesty" className="text-sm font-extrabold text-ink">What we do not claim</h2>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>· No band-score guarantees — feedback is rubric-based AI assistance, periodically human-reviewed where available.</li>
          <li>· No testimonials or outcome statistics yet: the product is in a supervised pilot with 30–50 consenting learners.</li>
          <li>· We are not affiliated with IELTS, the British Council, IDP or Cambridge.</li>
        </ul>
      </section>

      <footer className="mt-10 border-t border-line pt-5 text-xs text-faint">
        <p>
          Support during the pilot: through your pilot coordinator. Public support contact launches with production release.
          {' '}<Link href="/refer" className="font-bold text-brand hover:underline">Referral programme</Link>
          {' '}· <Link href="/partners" className="font-bold text-brand hover:underline">Partners</Link>
          {' '}· <Link href="/privacy" className="font-bold text-brand hover:underline">Privacy</Link>
        </p>
      </footer>
    </main>
  );
}
