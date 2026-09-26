# OsynLearn — 20-Step Update Plan

Living checklist. Each step is ordered by impact — do them top to bottom.
Steps marked *(verified gap)* were confirmed missing in code during the QC audit, not guessed.

---

## Phase A — Make it dependable for daily use

- [ ] **1. Enforce plan limits** *(verified gap)*
  Pricing promises "3 sessions/day free, 2 coach calls/day, 1 mock/month" but **no page enforces it**.
  Add gating + a friendly upgrade prompt in `/impromptu`, `/coach`, `/ielts` using the existing `sessionsToday` + `PLAN_LIMITS`.

- [ ] **2. Implement PDF report export** *(verified gap)*
  Pricing promises "PDF export of reports" for Pro — not implemented.
  Add a print-optimized report view + browser print-to-PDF in `/report/[id]`.

- [ ] **3. Microphone permission & browser-compatibility UX**
  Web Speech only works in Chromium. Add: pre-record explainer card, permission-denied recovery steps,
  and auto-offer of typed fallback on Safari/Firefox instead of a dead mic button.

- [ ] **4. Data import** *(verified gap)*
  Settings exports JSON but cannot import it. Add file-picker import + merge so learners can move devices.

- [ ] **5. Auto-save & crash recovery**
  Persist in-progress sessions and AI chats to localStorage; on return show "Resume your interrupted session?".

- [ ] **6. Streak reminders via Notification API** *(verified gap)*
  `Notification` type + repository methods exist but nothing uses them.
  Add opt-in daily practice reminder + "streak at risk" evening alert.

## Phase B — Ship it to the world

- [ ] **7. Server-side AI proxy route** *(verified gap)*
  `NEXT_PUBLIC_AI_API_KEY` ships to the browser. Add `/api/chat` route handler that keeps the key server-side; point the AI Tutor at it.

- [ ] **8. Supabase connection + guest migration**
  Apply `src/lib/db/schema.sql`, add keys, verify RLS, and migrate guest localStorage data into the account on first sign-in.

- [ ] **9. Deploy to a permanent URL**
  Vercel (free tier) + env vars. Ends the sandbox restart cycle — preview always available.

- [ ] **10. Payments (Stripe, bKash later)**
  Checkout for Plus/Pro + webhook that flips `profile.plan`. Local switching stays as offline fallback.

## Phase C — Teaching quality (what makes learners improve)

- [ ] **11. Native-language-aware tips** *(verified gap)*
  `nativeLanguage` is stored but never used. Add Bengali/Hindi L1 error patterns
  (article drops, v/w confusion, tense transfer) into grammar tips, coach hints and AI Tutor context.

- [ ] **12. Grow IELTS library to 15+ mocks**
  Original product advertises 15+; we ship 6. Add 9+ mocks from the existing banks + new questions;
  the content-integrity test will enforce completeness automatically.

- [ ] **13. Word-level pronunciation upgrade**
  Wire the existing cloud adapter to a phoneme-capable provider (Deepgram/Azure) and improve
  on-device alignment; surface per-word scores in the report's transcript view.

- [ ] **14. Weekly progress review**
  Auto-generated weekly summary (score trend, top 3 errors fixed, wins) + a shareable streak card.

- [ ] **15. Minimal-pair pronunciation drills**
  The minimal-pair data already lives in the AI knowledge base. Build a record→compare→score drill,
  linked from Roadmap pronunciation days.

## Phase D — Polish & professional quality

- [ ] **16. Light-mode audit**
  Tokens exist; walk all 15 pages and fix contrast/legibility in light theme.

- [ ] **17. Accessibility pass**
  Aria labels on recorder controls, visible focus rings everywhere, `prefers-reduced-motion`,
  screen-reader-friendly score announcements.

- [ ] **18. E2E tests (Playwright)**
  Script the critical journey — onboarding → first speaking session → report renders — so releases can't regress.

- [ ] **19. Empty / loading / error states polish**
  Skeletons on first paint, retry buttons on failed cloud calls, offline banner when the service worker is serving cache.

- [ ] **20. App-store packaging (Capacitor)**
  Android/iOS wrappers with splash screens and store listing assets — the PWA is already install-ready.

---

**Rules:** one step per work session; after each step run `vitest run` + `next build` and tick the box.
