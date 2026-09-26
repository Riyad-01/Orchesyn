# OsynLearn — Five-Expert Strategic Review

*Panel: Strategist · Analyst · Researcher · Scientist · Godmode. Grounded in 2026 market data
and published SLA research. Every move maps to a backlog item (see BACKLOG.md, now 225 items).*

---

## 1. The Strategist — positioning & business model

**Diagnosis.** The 2026 market is a barbell: premium AI tutors at $12–30/mo (Speak ~$14–20,
ELSA ~$12–18, Duolingo Max ~$30) on one end, and **free ChatGPT Advanced Voice** on the other.
You cannot out-spend them. You must out-position them. Two documented weaknesses define the gap:
1. **The big apps reset learner memory between sessions** (2026 comparison reviews list "remembers
   you: ❌" for Speak and ELSA).
2. **All of them require constant connectivity**, and price in USD — painful for South Asia,
   the world's densest IELTS-prep market (TalkDrill validates ₹299/mo regional pricing).

**Moves.**
- **Positioning line:** *"The English coach that remembers you — and works offline."*
  OsynLearn's repository architecture already supports cross-session memory; competitors' doesn't.
- **Wedge market:** Bangladesh + India. Bengali UI, Bengali L1 error pack, bKash/Nagad pricing,
  IELTS + job-interview dual focus. Home-market advantage none of the US apps will chase.
- **Free tier as the anti-ChatGPT moat:** ChatGPT gives free conversation but zero curriculum,
  zero scoring, zero progress. Our free tier = structured curriculum + 7-dimension scoring +
  streaks + roadmap. That is the product ChatGPT can't be.
- **Unit economics edge:** on-device scoring = **$0 marginal cost per session**. Speak/ELSA pay
  cloud ASR/LLM costs per minute. We can afford a genuinely generous free tier and still win margin.
- **Sequencing:** deploy → 100 real users → retention data → only then payments & growth spend.

**Don't.** No AI avatars (Praktika's turf). No new languages. No Duolingo-depth gamification.
No paid user acquisition before D7 retention is proven.

## 2. The Analyst — market facts & the numbers that decide

**Market facts (2026):** Speak leads AI speaking (~$14–20/mo, GPT-powered, weak pronunciation
scoring); ELSA owns phoneme-level pronunciation (~$12–18/mo, weak open conversation, no memory);
Duolingo Max owns habit ($30/mo, shallow speaking); Cambly owns human tutors ($50–200/mo);
ChatGPT Voice is the free substitute that caps everyone's pricing power.

**Instrument before you iterate (backlog #185):**
- North-star metric: **weekly spoken minutes per learner** (not DAU — speaking apps live on output)
- D1 / D7 / D30 retention; benchmark to beat: D7 ≥ 20%, D30 ≥ 10%
- Free→paid conversion benchmark: 2–5% at D30
- Score-velocity: average overall-score gain per 30 days (the efficacy proof that sells subscriptions)

**Pricing analysis.** Global $4.99 Plus / $7.99 Pro is already under the market (good). Add
**purchasing-power parity**: ~৳499/mo or ৳2,999/yr for BD, ₹299–499 for India. Annual-first
presentation. Free tier: 3 sessions/day forever (matches what winning apps offer).

**Don't.** Don't optimise conversion before retention. A leaky bucket with payments is churn with
extra steps.

## 3. The Researcher — what the learning science actually says

**Evidence base:** Cambridge *Studies in Second Language Acquisition* (2021, 2024) on task
repetition & spacing; Frontiers in Education (2025) on spaced retrieval; meta-analyses on
distributed practice (1.5–2× retention).

1. **Task repetition reliably improves fluency** (reduced conceptualisation load) — BUT **massed
   repetition is double-edged**: it cuts breakdown pauses while degrading speed and increasing
   verbatim repetition. **1-week spaced repetition produced the largest reduction in filled pauses.**
2. **Spaced retrieval practice** correlates directly with oral-fluency gains (mean length of run,
   articulation rate) and 1.5–2× retention.
3. **Repetition + post-task transcription (TRPT)** beats repetition alone for *accuracy*, and the
   accuracy carries over to new contexts.
4. Recommended time split: **30–40% comprehensible input**, 20–25% SRS vocabulary, 20–25% output,
   10–15% pronunciation, 5–10% targeted grammar.

**Product implications — and one honest indictment:** OsynLearn is 100% output practice. Research
says output should be ~25% of the diet. The single biggest pedagogical gap is the **missing input
module** (new backlog #216). Also: our "no-repeat topics" plan (backlog #57) is *backwards* —
the science says strategically repeat weak topics at ~7-day spacing (#212).

**New evidence-based features:** 4/3/2 fluency protocol mode (#211 — speak the same topic in 4,
then 3, then 2 minutes; the classic fluency drill), spaced revisit engine (#212), post-task
corrected-transcript read-aloud (#213), personal Mistake Book with weekly retrieval reviews
(#214), vocabulary SRS wired to "did you use it in your next speech?" detection (#215).

## 4. The Scientist — measurement validity & intellectual honesty

**Audit of our own engine.** The scoring engine is deterministic, well-tested (97 tests) and
useful — but the band mapping is **anchor-based, not calibrated against human raters**. Claiming
"IELTS Band 7.0" without criterion validity is a trust risk (and in some markets a legal one).

**Protocol:**
1. **Label honestly:** "Estimated band" everywhere, never "Your IELTS score" (#218).
2. **Confidence intervals** for short samples (<15s already flagged internally — surface it) (#49).
3. **Test–retest reliability:** show learners their score variance; don't chase noise (#218).
4. **Calibration harness (#217):** collect optional user-reported real IELTS results → compute
   Spearman ρ → when ρ ≥ 0.6, publish it. A published correlation is marketing no competitor has.
5. **Grammar false-positive corpus (#39):** every rule audited against a fixture corpus; precision
   > recall — a wrong correction destroys trust faster than a missed one.
6. **Closed-loop efficacy:** measure whether learners who follow a tip improve on that dimension
   next session. If feedback → improvement is provable, the product sells itself.
7. **Goodhart guard:** pace is scored against a range, not "faster = better" (already true —
   protect it in all future scoring work).

## 5. Godmode — the 10× plays

1. **WhatsApp growth loop (#219):** every finished session auto-generates a beautiful share card
   (band, streak, one tip). WhatsApp is the distribution layer of South Asia. Every practice
   session becomes an acquisition event. Zero-ad-budget growth.
2. **Live karaoke pronunciation (#220):** word-level scoring *while* the learner speaks, painted
   under the live transcript in real time. No mainstream app does mid-speech visual scoring.
3. **Sell the engine (#224 B2B):** license the scoring API to the thousands of IELTS coaching
   centres in Dhaka/Chennai/Lahore. One teacher dashboard (#206) = 50 students each. B2B2C
   distribution that Speak/ELSA don't have in this region.
4. **The data flywheel:** with consent, aggregate anonymised error patterns per L1. In 18 months
   you own the world's best model of *Bengali-speaker English errors*. That's a moat no amount of
   GPT funding replicates.
5. **Offline as a feature, not a fallback:** "works during load-shedding, works on 2G, works on
   a ৳8,000 phone" — turn the constraint into the campaign.
6. **Interview panel mode:** three AI interviewers (friendly, technical, stress) in one room,
   sequential questioning, joint debrief. Job-anxiety is the highest willingness-to-pay emotion
   in the market.

---

## Synthesis — the Top 12 moves, in order

| # | Move | Backlog | Why first |
|---|---|---|---|
| 1 | Deploy to a public URL | #9 | Nothing else exists until strangers can open it |
| 2 | Privacy-friendly analytics | #185 | Fly instrumented, not blind |
| 3 | Bangla UI + Bengali L1 error pack | #170, #38 | Home-market edge; cheap to build |
| 4 | Regional pricing + generous free tier | #223 | Matches purchasing power; anti-ChatGPT moat |
| 5 | WhatsApp share cards | #219 | The growth engine |
| 6 | 4/3/2 fluency mode | #211 | Evidence-backed differentiator, ~1 day of work |
| 7 | Spaced revisit of weak topics | #212 | Turns the science into retention |
| 8 | Mistake Book + corrected read-aloud | #214, #213 | Accuracy gains; daily-return hook |
| 9 | Honest scoring labels + calibration harness | #218, #217 | Trust = conversion |
| 10 | Learner memory across sessions | #67 | The documented competitor weakness |
| 11 | bKash/Nagad checkout | #155 | Monetise the home market first |
| 12 | Coaching-centre pilot (10 centres) | #225 | Distribution before advertising |

**The one-sentence version:** become the *remembering, offline, evidence-based* speaking coach of
South Asia — priced for it, shared through WhatsApp, validated by published calibration — while
the US-funded apps fight each other over $20/mo Americans.
