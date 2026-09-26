# Release Scorecard — round 8 (release-owner audit)

Date: 2026-09-22 · Build: Next 15.5.25 production, `next build` exit 0 · Node v20.20.2
Evidence commands: `node e2e/journeys.mjs` (24/24), `vitest run` (see count below), `BASE=http://localhost:3000 node sweep.mjs` (CLEAN), `tsc --noEmit` (clean).

## ✅ VERIFIED (executed this round, real interactions)

| Area | Evidence |
|---|---|
| J1 new learner → onboarding → diagnostic → adaptive plan | journeys J1 ×6 PASS (gate, wizard, sectionLevels persisted, unseen evidence, plan shows levels) |
| J2 lesson attempt → feedback → retry path → mastery → scheduled review | journeys J2 ×2 PASS (`osyn:srs` entry `lesson:L1` created) |
| J3 timed mock → results → targeted remediation | journeys J3 ×2 PASS (8-section speaking mock, silent-audio handled, typed rescue, remediation text) |
| J5 free → sandbox payment → paid entitlements → cancellation | journeys J5 ×2 PASS (server-side entitlement flip both ways) |
| J6 teacher invite → assignment → submission → override + immutable audit trail | journeys J6 ×2 PASS |
| J7 network interruption → saved work → recovery | journeys J7 ×3 PASS (writing autosave survives reload; offline banner; offline session → report via SW cache) |
| Mic denial | journeys R ×2 PASS (honest disabled state, typed fallback completes session) |
| Empty submission gating, skip-link keyboard a11y, single h1, simulated 2G paint | journeys R ×4 PASS |
| Webhook semantics (idempotency, bad signature 401, refund→free, cross-org denial) | round-7 curl matrix 20/20 (unchanged code paths) |
| Unit suite | `vitest run` all green (249 prior + 7 new analytics = 256 pass, 1 skip) |
| Route sweep (32 routes + typed-session flow, console errors, overflow) | `SWEEP CLEAN` against localhost |
| Public pages render for guests with SEO metadata | /welcome /refer /partners /privacy /pricing verified, `<title>` + meta description present |
| Claims audit | no guarantees/testimonials/PMF claims; pricing copy = billing data; "60 guides" = 60 real guides; privacy copy matches shipped behaviour; band scores labelled estimates; content carries `source`/`rights` fields |

## 🔧 DEFECTS FOUND & FIXED THIS ROUND

| Severity | Defect | Fix | Re-verified |
|---|---|---|---|
| **P1** | Diagnostic screening blanked on final (speaking) item — speaking has no objective items — so provisional levels were NEVER saved | filter null screening items, guard effect, "Practice-based" label for speaking full diagnostic | journeys J1 PASS, sweep CLEAN |
| **P2** | Offline report unreachable: SW precache missing `/report` + 16 routes; query-string navigations missed cache; fallback served home shell | 38-URL precache list, `ignoreSearch` fallback, cache v5 | journeys J7 PASS |
| **P3 (tooling)** | `sweep.mjs` default BASE pointed at the stale surge deploy, producing phantom 404s | documented: always run with `BASE=` (round-8 runs did) | sweep CLEAN on localhost |

## 🚧 BLOCKED (external dependency — app states this honestly in-product)

| Item | Blocker | Evidence | Owner |
|---|---|---|---|
| J4 guest → registered → other-device progress | Supabase project credentials | app shows "Cloud not connected" path; journeys J4 PASS (honest block) | release owner |
| Live payments (bKash/Nagad/SSLCommerz) | merchant integration + explicit release approval | sandbox notify verified instead | release owner |
| Cloud transcription | Whisper endpoint credentials (self-hosted) | typed fallback verified instead | ops |
| Staging deploy to surge | `npx surge whoami` → "Not Authenticated", no `~/.netrc` | this round's output | release owner (provide token) |
| Production publish / live billing | gated release steps by directive | n/a | release owner |

**Reviewable build available now:** this sandbox's live preview (port 3000) runs the exact production build that passed every check above.

## ⚠️ UNTESTED (be honest about the envelope)

| Item | Why | Severity if wrong | Mitigation |
|---|---|---|---|
| Safari/WebKit, Firefox, real iOS/Android browsers | only headless Chromium available here | medium (iOS audio recording quirks likely) | pilot G2 gate; browserstack before prod |
| Real microphone audio quality & Web Speech accuracy in the wild | fake/silent media streams only | medium | pilot week 1 |
| Managed-AI latency/timeout at concurrency | single-instance sandbox; unit-simulated only | medium | staged load test before billing goes live |
| Week-1/week-4 retention | needs calendar time | n/a | pilot instruments it |
| Slow network on real radio hardware | CDP-throttled only | low | pilot feedback |
| Multi-tenant concurrency on billing APIs | one sandbox user | low-medium | staging soak |

## Launch verdict

**Not launch-ready for production; READY for the controlled pilot** with teaching support, once: (1) Supabase creds connected (or pilot runs device-local + manual export), (2) consent forms executed, (3) surge/prod hosting token provided for a reviewable staging URL. Everything a learner touches in the pilot is verified above; nothing above is based on screenshots or mocked success.
