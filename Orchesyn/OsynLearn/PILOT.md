# OsynLearn Pilot Plan

**Status:** ready to run · 30–50 consenting learners · 4–6 weeks
**Rule:** hypotheses and decision gates are fixed BEFORE any results are seen. No invented testimonials, outcome statistics, or product-market-fit claims — ever.

## Who

- **Learners (30–50):** Bangla-speaking IELTS candidates recruited through partner coaching centres and existing communities. Explicit written consent; withdrawal at any time without penalty; free access for the pilot duration.
- **Teaching support (2–3 qualified teachers):** examiner-trained or equivalent; review submission queues, override AI feedback (audit-trailed), answer learner questions within 24h on weekdays.
- **Coordinator (1):** consent handling, weekly office hours, incident comms.

## Instrumentation (already shipped, on-device, consented export)

`osyn:analytics` ring buffer (see `src/lib/analytics/`): diagnostic completion, first corrected retry, activity minutes/days, week-1/week-4 retention windows, conversion/cancellation events, AI cost per active day. Admin page shows per-device aggregates; export is manual, per-learner, with consent.

## Hypotheses (fixed in advance)

| # | Hypothesis | Metric | Gate (pass threshold) |
|---|-----------|--------|----------------------|
| H1 | Learners complete the screening diagnostic | diagnostic_completed / signups | ≥ 60% within first session |
| H2 | Feedback drives corrected retries | first_corrected_retry per mastered lesson | ≥ 0.5 |
| H3 | The habit forms | week-1 retention (any activity days 1–7) | ≥ 40% |
| H4 | The habit sticks | week-4 retention (activity days 22–28) | ≥ 20% |
| H5 | Willingness to pay exists | stated + sandbox-checkout conversions among week-1-retained | ≥ 10% expressed intent, ≥ 3 sandbox checkouts |
| H6 | Unit economics can work | AI cost per active learner per month (managed plan usage) | ≤ 35% of ৳1,150 prep price |
| H7 | Teachers find review workable | submissions reviewed within 48h | ≥ 80% |

## Decision gates

- **G1 (end of week 1):** H1 met? If not → fix onboarding/diagnostic funnel before recruiting more learners. Do not proceed to scale talk.
- **G2 (end of week 2):** crash/data-loss incidents = 0? Any P1 → freeze recruitment, fix, re-verify with `e2e/journeys.mjs`.
- **G3 (end of week 4):** H3 met? If not → retention work before any paid-conversion work.
- **G4 (end of pilot):** H3+H4+H5 all met → proceed to live-billing integration and production release checklist. Any missed → document honestly, choose fix-or-stop, no PMF language.

## Consent & privacy (matches shipped behaviour)

- Consent form covers: participation, on-device analytics, optional aggregate reporting, optional recording upload (off by default), withdrawal process.
- No learner is named in any report; aggregates only.
- Pilot data handling follows `privacy` page text and `DEPLOY.md` backup/restore runbook.

## What "success" is NOT

Band-score improvements are NOT a pilot gate: proving score gains needs unseen-assessment panels + human review at a scale the pilot cannot honestly support. We measure engagement, corrected-retry behaviour, retention, WTP signals and cost — and say so publicly.
