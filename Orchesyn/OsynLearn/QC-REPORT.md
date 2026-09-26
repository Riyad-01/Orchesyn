# OsynLearn — QC Report

**Date:** 2026-09-09 · **Build:** Next.js 15.5.25 production · **Verdict: ✅ COMPLETE for use — 3 gaps fixed during this pass**

---

## Automated checks (all run, all green)

| Check | Command | Result |
|---|---|---|
| Unit tests (scoring engine) | `vitest run` | ✅ 74/74 |
| Unit tests (AI tutor, all 8 personas + intents) | `vitest run` | ✅ 12/12 |
| **Content-integrity gate (new)** | `vitest run` | ✅ 11/11 |
| Production build + full type-check | `next build` | ✅ 16/16 routes |
| Route smoke test (15 pages + 2 dynamic + PWA assets) | curl | ✅ 17/17 HTTP 200 |
| Link integrity (every internal path vs real routes) | grep audit | ✅ 0 dead links |
| Leftover TODO/FIXME/HACK markers | grep audit | ✅ 0 |
| PWA assets (icon.svg, 192, 512, apple-touch, manifest, sw.js) | file check | ✅ all present |
| Brand consistency (no "Stimuler" in served HTML/manifest) | curl + grep | ✅ 0 |

## Content inventory (verified by the new integrity tests, not claims)

- **50 topics** — every one with prompts, sample answer (>40 chars), 2+ key vocab, valid category & difficulty
- **22 coach themes** — starter, 2+ follow-ups, sample answer, key vocab each
- **8 role-play scenarios** — 4+ beats with 2+ user turns, opening line, key phrases each
- **6 full IELTS mocks** — each 4× Part 1 + Part 2 cue card + 3× Part 3, **every question now has a sample answer**
- **24 drills** — valid dimensions, prompts, durations; 7/14/30-day roadmaps build with valid item references
- **Band descriptors 5–9** (matches `descriptorForBand` clamping)

## Issues found & fixed in this QC pass

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | **High** | 31 of 46 IELTS questions (15 Part-1, 16 Part-3) had **no sample answer** — a core "sample answers + tips" feature silently empty | Wrote 31 band-7+ model answers (Part 1 personal, Part 3 opinion→reason→example); now enforced by test |
| 2 | Medium | `session-flow.tsx` used `h-4.5 w-4.5` with **no valid fallback** — icon rendered 24px instead of 18px (5 other files had a harmless duplicate) | Normalised all 6 occurrences to `h-[18px] w-[18px]` |
| 3 | Medium | README claimed "18 themes, 14 scenarios, 5 mocks" — actual: 22/8/6 | Corrected README |
| 4 | Low | AI Tutor not linked from the Home dashboard (only sidebar/More/⌘K) | Added 4th home card → `/ai` |

## Known limitations (by design, not defects)

1. **Payments** — plan switching is local; no billing provider connected.
2. **Accounts/sync** — guest mode (localStorage) until Supabase keys are added (`schema.sql` ready).
3. **AI Tutor cloud mode** — optional; on-device tutor is the default and needs no keys. A production deploy should proxy the LLM key server-side instead of `NEXT_PUBLIC_`.
4. **Sandbox preview** — this environment wipes `node_modules`/`.next` between sessions; ask to "restart the app" to bring the preview back.

## Feature completeness vs original product spec

| Requirement | Status |
|---|---|
| 60s impromptu speaking, feedback <30s | ✅ |
| AI coach voice chat, 20+ themes, scenarios | ✅ (22 themes, 8 scenarios) |
| Daily speaking tests + day-wise roadmap | ✅ (7/14/30-day adaptive) |
| Full-length IELTS mocks + band estimate | ✅ (6 mocks, official criteria) |
| 7-dimension scoring (pronunciation, fluency, grammar, vocabulary, fillers, pace, clarity) | ✅ (tested engine) |
| Word-level pronunciation marking | ✅ (cloud adapter; heuristic on-device) |
| Speech insights (fillers, tone, awkward pauses) | ✅ |
| Sample answers + improvement tips | ✅ (fixed gap #1 this pass) |
| Streaks / gamification / progress | ✅ |
| Free tier + premium pricing | ✅ UI (billing unwired — limitation #1) |
| **Innovations beyond original** | ✅ AI Tutor (8 modes), ⌘K palette, typed fallback, adaptive roadmap, achievements |
