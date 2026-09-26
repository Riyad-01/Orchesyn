# What the World's No.1 Speaking App Must Have
Deep research, 2026-09-17. Sources: 2026 competitive field (ELSA Speak, Speak, Loora, Praktika, TalkPal, Pimsleur, Rosetta Stone, Lingrow, Busuu, Cambly), ETS TOEFL iBT Speaking rubric & SpeechRater science, Microsoft Azure Pronunciation Assessment docs, CEFR phonological-control assessment research (Kallio et al. 2021; Wang et al. 2025).

Status key: ✅ shipped · 🟡 partial ·  gap (backlog #)

## A. The non-negotiables (every serious competitor has them)

| # | Must-have | Why it's table-stakes | OsynLearn |
|---|-----------|----------------------|---------|
| 1 | Real-time pronunciation feedback, word-level | ELSA's core; Speak scores every phrase; Lingrow rates per-letter | ✅ word timings + flags, cloud phoneme adapter ready |
| 2 | Word-stress & intonation (prosody) feedback | ELSA headline feature; TOEFL rubric scores rhythm/prosody/syllable stress; Azure ships a ProsodyScore with Monotone & UnexpectedBreak errors | ✅ shipped this round (prosody card, monotone risk, pace swing, abrupt breaks) |
| 3 | Fluency engineering: rate, pauses, hesitations, run length | ETS rubric: "speaking rate, length of uninterrupted runs, number of pauses/hesitations" | ✅ pauses/pace/disfluency metrics |
| 4 | Recognised scale alignment (CEFR / band) | TOEFL band↔CEFR map; buyers trust standardised labels | ✅ band + CEFR badge on every report |
| 5 | AI conversation with real-time correction + session summary | Loora/Speak/Praktika core loop; "say it like a native" compare is Loora's standout | ✅ coach + AI tutor ship; "Hear it like a native" A/B compare shipped |
| 6 | Multi-language coverage | TalkPal 130+, Pimsleur 51; English-only caps the market (ELSA's ceiling) | ✅ 20 languages, 0 MB packs (browser ASR + Whisper), per-language fillers |
| 7 | Exam prep with real mocks | IELTS/TOEFL are the purchase trigger for 100M+ learners | ✅ IELTS mocks; TOEFL mode = #249 |
| 8 | Progress tracking & learning paths | Capterra: Learning Paths 39% and Progress Tracking 33% — most-critical buyer features | ✅ roadmap, insights, mistake book, streaks |
| 9 | Generous free tier | 2026 field: free tiers of 5–20 min/day win trials | ✅ unlimited on-device practice |
| 10 | Honest scoring | "A speech check that passes or fails you isn't pronunciation feedback" (2026 roundup) | ✅ estimated-band framing, unmeasurable dims shown as — |

## B. The 2026 differentiators (how #1 is won)

| # | Differentiator | Who proves it | OsynLearn |
|---|----------------|---------------|---------|
| 11 | Web-first, installable PWA | Nearly all competitors are mobile-only; Loora's web+Android is called "a genuine advantage" | ✅ structural advantage |
| 12 | Privacy: on-device scoring by default | Speak ships audio to OpenAI/MS — a documented liability | ✅ structural advantage |
| 13 | Measurable gain protocol (4/3/2 fluency lab) | No competitor ships in-app before/after deltas | ✅ novelty asset |
| 14 | Mistake book + spaced revisits | Loora's auto-vocab-saving is a praised gap-filler; we generalise it to grammar/fillers | ✅ |
| 15 | Flaky-network resilience (emerging markets) | Nobody addresses it; 4G users hit silent failures | ✅ shipped this round (restart cap, banner, Whisper backstop, typed guard) |
| 16 | Professional/specialist layer | Loora wins business English; Azure-grade prosody errors are the assessment frontier | ✅ prosody card; pitch DSP = #250 |

## C. Assessment-science checklist (what the scorers actually measure)

From ETS SpeechRater + Azure + CEFR research — every item must surface in feedback:

- ✅ speaking rate & articulation rate
- ✅ pause count / longest pause / awkward pauses (≈ UnexpectedBreak)
- ✅ hesitation fillers
- ✅ run length (uninterrupted speech)
- ✅ vocabulary diversity (TTR/CTTR/MTLD) & richness
- ✅ grammaticality (23-rule local engine) **+ LLM examiner layer in ANY language** (schema-validated corrections, organisation, 3-step plan)
- ✅ discourse/organisation (coach notes; TOEFL Organization dim future)
- ✅ prosody: monotone detection (loudness-variety proxy), rhythm (pace swing), stress coaching tips
- ✅ pitch-contour intonation measured on-device (autocorrelation F0 @20fps; monotone/declination/final-rise)
- ⬜ phoneme accuracy via cloud adapter when a key is present (wired, optional)

## D. Smart multilingual, "less confused, less MB" design

1. **Zero language packs.** Recognition = browser/OS speech service; transcription = Whisper (90+ langs). Shipped data: one ~4 KB catalogue.
2. **Zero-conf default.** Device OS language preselected (`matchDeviceLanguage`); learner never touches the picker unless they want to.
3. **One picker, native names + flags + search** — no settings maze.
4. **Honest capability labels.** English: full analysis. Others: fluency/pace/fillers/clarity now, deep grammar "coming" — said in the UI, never faked.
5. **Per-language filler coaching** so "মানে…" or "pues…" counts, not just "um".

## E. Future-proofing commitments

- Pluggable engine interface (web-speech / cloud / manual) — new ASR vendors drop in without UI changes.
- Prosody proxy → pitch DSP upgrade path (#250) behind the same card.
- Storage versioned, guest→Supabase swap without data loss.
- Static-export PWA: every screen degrades gracefully, no network hang can freeze the UI (12 s caps + guards everywhere).
