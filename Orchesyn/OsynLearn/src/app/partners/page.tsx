import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'For coaching centres & teachers — OsynLearn',
  description:
    'Bring OsynLearn into your coaching centre: assignments, human review with an immutable audit trail, organisation-isolated learner data, and qualified teaching support during the pilot.',
};

/**
 * Partnership page. Mechanics that exist today: teacher workspace with invite
 * codes, org-isolated data, assignments, submission review, feedback overrides
 * with an immutable audit trail (Teacher-Supported plan). Everything else is
 * labelled as pilot process, not product.
 */
export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Partners · pilot</p>
      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        For coaching centres and independent teachers.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        OsynLearn gives your students daily AI-assisted speaking practice between your classes —
        and gives you the oversight to keep it honest.
      </p>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5" aria-labelledby="tools">
        <h2 id="tools" className="text-sm font-extrabold text-ink">What your teachers get (shipped today)</h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          <li>· <strong className="text-ink">Invite codes &amp; classes</strong> — enrol learners into your organisation in seconds.</li>
          <li>· <strong className="text-ink">Assignments</strong> — set speaking/writing tasks; submissions land in a review queue.</li>
          <li>· <strong className="text-ink">Human review with override</strong> — adjust AI feedback; every override is recorded in an immutable audit trail visible to the learner.</li>
          <li>· <strong className="text-ink">Organisation isolation</strong> — your learners&rsquo; data is invisible to other organisations, enforced server-side.</li>
        </ul>
        <p className="mt-3 text-[11px] text-faint">Teacher-Supported plan: $29 / ≈৳3,700 per month per teacher seat.</p>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface p-5" aria-labelledby="pilot">
        <h2 id="pilot" className="text-sm font-extrabold text-ink">The pilot partnership</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          We are running a supervised pilot (30–50 consenting learners) with qualified teaching
          support. Partner centres get: onboarding help for teachers, a direct line to the product
          team, and a say in the post-pilot roadmap. In exchange we ask for honest usage feedback —
          no marketing obligations, no exclusivity, no data rights beyond what the privacy notice
          already limits.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface2 p-5" aria-labelledby="contact">
        <h2 id="contact" className="text-sm font-extrabold text-ink">Talk to us</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Pilot coordination is handled directly by the founding team. Reach us through your pilot
          coordinator; a public partnership email launches with production release. We do not run
          outreach campaigns or advertising — partners come to us or through referrals.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/welcome" className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white">See the product</Link>
        <Link href="/privacy" className="rounded-xl border border-line px-5 py-3 text-sm font-extrabold text-ink">Privacy notice</Link>
      </div>
    </main>
  );
}
