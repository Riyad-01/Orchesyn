import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy notice — OsynLearn',
  description:
    'What OsynLearn stores, where it goes, and how to delete it. Local-first by default: practice, scoring and analytics stay on your device unless you explicitly connect cloud services.',
};

/**
 * Privacy notice. Every statement here maps to shipped behaviour — when the
 * product changes, this page must change in the same commit.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Privacy</p>
      <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Your practice stays yours.
      </h1>
      <p className="mt-2 text-[11px] text-faint">Plain-language notice · pilot version · updated September 2026</p>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-extrabold text-ink">Stored on your device (default)</h2>
          <p className="mt-2 text-xs">
            Practice sessions, feedback reports, lesson progress, scheduled reviews, mistake book,
            writing drafts (autosaved so a crash never loses work) and product analytics are stored
            in this browser&rsquo;s local storage. Analytics contain event names, counts and durations
            only — never answer content, recordings, or identifiers. Nothing on this list is sent to
            us or to anyone else by the app.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-extrabold text-ink">Recordings &amp; AI feedback (your consent, your keys)</h2>
          <p className="mt-2 text-xs">
            Speech scoring runs on-device. Recordings leave your device only if you explicitly enable
            &ldquo;recording upload&rdquo; in Settings (it is off by default) and only to the transcription
            endpoint you or your institution configure. AI writing/speaking upgrades use the AI
            endpoint configured in Settings — we do not embed or route through hidden third-party
            keys. Prompts contain the text needed for assessment, not your personal details.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-extrabold text-ink">Cloud sync (optional, off until you connect it)</h2>
          <p className="mt-2 text-xs">
            Cross-device sync exists only if you connect your own Supabase project (Settings → Cloud
            sync). Until then the app is fully local. For teacher-supported organisations, learner
            data is isolated per organisation and enforced server-side; teachers see submissions and
            metadata for their own classes only.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-extrabold text-ink">Retention &amp; deletion</h2>
          <p className="mt-2 text-xs">
            Uploaded recordings are retained for the window you choose (30/90/365 days; 90 default).
            Settings → Clear history deletes sessions, reports, chats, mocks and on-device analytics
            immediately; your profile stays until you delete it. Cloud data deletion follows the
            documented backup/restore runbook.
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-extrabold text-ink">What we never do</h2>
          <ul className="mt-2 space-y-1.5 text-xs">
            <li>· No advertising, no third-party trackers, no selling of data.</li>
            <li>· No outreach or marketing contact lists built from app usage.</li>
            <li>· No automated decisions about people beyond in-app practice feedback.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-surface2 p-5">
          <h2 className="text-sm font-extrabold text-ink">Pilot participants</h2>
          <p className="mt-2 text-xs">
            Pilot learners join with explicit consent, may withdraw at any time, and their aggregate
            metrics are used only to evaluate the product honestly. Questions go to your pilot
            coordinator; a public support contact launches with production release.
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/welcome" className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white">Back to overview</Link>
        <Link href="/settings" className="rounded-xl border border-line px-5 py-3 text-sm font-extrabold text-ink">Manage your data</Link>
      </div>
    </main>
  );
}
