# OsynLearn — Full Product Backlog (226 items)

Honest framing: the **core product is built, tested (249 tests green) and usable today**.
This is the complete backlog to take it to commercial, world-class quality — every missing
feature, upgrade and hardening task I can identify from inspecting the code. Items marked
✓-verified were confirmed absent (or present) in the code during the audit, not guessed.

Progress: 138 / 365

---

## 1. Recording & Capture (use-recorder / session-flow)

- [x] 1. Pause/resume during recording — DONE: snapshot-transcript pause in use-recorder + session-flow UI + AI mic toggle
- [ ] 2. Start/stop audio cues (beeps)
- [ ] 3. Live "too quiet / too loud" warnings
- [ ] 4. Clipping warning shown live while recording
- [ ] 5. Retake button that keeps the same prompt
- [ ] 6. Edit transcript before analysis (fix ASR mistakes) *(verified: absent)*
- [x] 7. Live word counter with target during speech — DONE: live "N words · ~wpm" chip under the transcript while recording
- [ ] 8. Pace metronome overlay for drills
- [ ] 9. Noise-floor / mic quality indicator
- [ ] 10. Input device picker (headset vs built-in mic)
- [ ] 11. Warning at 80% of max duration
- [ ] 12. Background-noise suppression toggle
- [ ] 13. Replay recording before submitting
- [ ] 14. Mic check step inside onboarding
- [x] 15. Session language switcher (en-US/GB/IN/AU) — DONE and exceeded: 20-language practice catalogue (lib/i18n/languages.ts), Settings picker, device-language auto-default, per-language fillers, Whisper language hint, Unicode tokeniser; see #242
- [ ] 16. Offline audio buffer when ASR is unavailable
- [ ] 17. Haptic feedback on mobile start/stop
- [ ] 18. Landscape recording layout for tablets

## 2. Speech Engine & Browser Compatibility

- [ ] 19. MediaRecorder capture path for Safari/Firefox *(verified: Chromium-only today)*
- [ ] 20. Cloud STT adapter: Deepgram
- [ ] 21. Cloud STT adapter: OpenAI Whisper
- [ ] 22. Cloud STT adapter: AssemblyAI
- [ ] 23. Server proxy route for STT keys
- [ ] 24. Automatic engine fallback chain cloud→WebSpeech→typed
- [ ] 25. Real word-level timestamps from cloud (replace synthesised)
- [ ] 26. Real word confidence from cloud
- [ ] 27. Analysis latency badge ("scored in 2.1s")
- [ ] 28. Engine health-check panel in Settings
- [ ] 29. Cost estimate per cloud session
- [ ] 30. Queued analysis for sessions recorded offline
- [ ] 31. Punctuation restoration from ASR output
- [ ] 32. Echo guard so TTS voice is never transcribed as user speech
- [ ] 33. Accent-aware ASR hints (Indian English etc.)

## 3. Scoring Engine

- [ ] 34. Phoneme-level pronunciation scoring with cloud data
- [ ] 35. Syllable-stress detection
- [ ] 36. Intonation contour analysis (rising/falling)
- [ ] 37. Expand grammar rules ~45 → 100+
- [ ] 38. L1 grammar rule packs (Bengali first, then Hindi/Arabic/Spanish)
- [ ] 39. Grammar false-positive audit harness (fixture corpus)
- [ ] 40. Hesitation-pattern detection (restarts, "uh-uh")
- [ ] 41. Topic lexicons (IELTS topics) for vocabulary relevance
- [ ] 42. Collocation-accuracy scoring
- [ ] 43. Per-sentence pace variance
- [ ] 44. Volume-dynamics component of clarity
- [ ] 45. Coherence dimension (IELTS 4-criteria alignment)
- [ ] 46. Discourse-marker usage scoring
- [ ] 47. Answer-relevance scoring vs the prompt
- [ ] 48. Score normalisation for short sessions
- [ ] 49. Confidence interval display for <15s speech
- [ ] 50. Calibration loop vs user-reported real IELTS bands
- [ ] 51. Per-dimension drill auto-recommendation from scores
- [ ] 52. Pronunciation: minimal-pair confusion detection
- [ ] 53. Repeated-error tracking across sessions (same rule twice = escalate tip)

## 4. Impromptu Speaking

- [ ] 54. Adaptive difficulty (weak scores → easier topics)
- [ ] 55. Topic bookmark/favourites
- [ ] 56. Reroll topic (limited per day)
- [ ] 57. No-repeat history for topics
- [ ] 58. Prep-time options (15/30/60s)
- [ ] 59. Speak-time options (30/60/90/120s)
- [ ] 60. Side-by-side "my answer vs model answer"
- [ ] 61. Key-vocab checklist ("did you use these words?")
- [ ] 62. Daily global challenge (same topic for everyone)
- [ ] 63. Topic packs (interview / business / IELTS)
- [ ] 64. Share result card
- [ ] 65. User-created custom topics
- [ ] 66. Per-topic performance memory

## 5. AI Coach Sarah

- [ ] 67. Persistent memory of past conversations
- [ ] 68. Personality setting (friendly / strict / examiner)
- [ ] 69. Barge-in: user speech stops TTS instantly
- [ ] 70. Gentle nudge when user is silent too long
- [ ] 71. Live vocabulary suggestion chips mid-conversation
- [ ] 72. End-of-chat summary report card
- [ ] 73. Conversation replay with corrections timeline
- [ ] 74. "How should I answer?" sample-answer button mid-chat
- [ ] 75. Coach-led pronunciation spot-checks
- [ ] 76. Themes matched to the user's goal
- [ ] 77. Weekly conversation targets
- [ ] 78. Natural turn latency (not instant robot replies)
- [ ] 79. Conversation export/share

## 6. AI Tutor

- [ ] 80. Server proxy for LLM key *(verified: NEXT_PUBLIC key today)*
- [ ] 81. Streaming reconnect on network drop
- [ ] 82. Regenerate response button
- [ ] 83. Search across past conversations
- [ ] 84. Pin/favourite answers
- [ ] 85. Floating "check my sentence" action anywhere in app
- [ ] 86. Grammar diff view (strike → fix)
- [ ] 87. Turn chat vocabulary into flashcards
- [ ] 88. Cloud sync of conversations
- [ ] 89. Usage stats per persona
- [ ] 90. Rate limiting / abuse guard
- [ ] 91. Model selector when multiple LLMs configured
- [ ] 92. Explain-in-Bangla mode (L1 explanations)
- [ ] 93. Export conversation to PDF study notes
- [ ] 94. Suggested daily prompt on Home

## 7. IELTS Module

- [ ] 95. Grow library to 15+ mocks (6 today)
- [ ] 96. Real-exam per-part countdown timers
- [ ] 97. Examiner intro audio ("This is the speaking test…")
- [ ] 98. Part-2 notepad UI during 1-min prep
- [ ] 99. Auto-advance toggle between questions
- [ ] 100. Pause/resume a mock mid-exam
- [ ] 101. Per-question band breakdown in results
- [ ] 102. Compare attempts view (mock 1 vs mock 2)
- [ ] 103. Re-practice weakest question button
- [ ] 104. Certificate-style band summary card
- [ ] 105. Full transcript export per mock
- [ ] 106. Strategy tips per part
- [ ] 107. Mock difficulty tags
- [ ] 108. Exam-date countdown widget *(examDate stored, verify usage depth)*
- [ ] 109. One-part "quick mock" (10 min) mode

## 8. Roadmap & Drills

- [ ] 110. "Too easy / too hard" feedback regenerates plan
- [ ] 111. Difficulty progression within a dimension
- [ ] 112. Missed-day catch-up mode
- [ ] 113. Roadmap completion % ring
- [ ] 114. Streak freeze earn/use *(verified: freezeCount stored, no UI)*
- [ ] 115. Rest-day scheduling
- [ ] 116. Daily plan item as notification
- [ ] 117. Personal-best tracking per drill
- [ ] 118. Custom drill builder
- [ ] 119. Calendar view of the plan
- [ ] 120. Plan sharing ("my 30-day plan")

## 9. Insights & Analytics

- [ ] 121. Period selector (7/30/90 days)
- [ ] 122. Per-dimension time-series charts
- [ ] 123. Best/worst session callouts
- [ ] 124. Time-of-day performance analysis
- [ ] 125. Filler-word trend over time
- [ ] 126. Vocabulary growth curve
- [ ] 127. Grammar-category trend chart
- [ ] 128. Speaking-minutes heatmap calendar
- [ ] 129. Personal records page
- [ ] 130. CSV export of insights
- [ ] 131. AI-written weekly summary
- [ ] 132. Benchmark vs level/goal averages

## 10. Gamification & Retention

- [ ] 133. XP system
- [ ] 134. Level progression tree
- [ ] 135. Shareable achievement cards
- [ ] 136. Weekly challenges
- [ ] 137. Friends leaderboard (needs accounts)
- [ ] 138. Practice-buddy pairing
- [ ] 139. Milestone celebration animations
- [ ] 140. Seasonal 30-day events
- [ ] 141. Reward store (streak freezes, themes)

## 11. Accounts, Sync & Data

- [ ] 142. Supabase keys + apply schema.sql
- [ ] 143. Guest → account data migration
- [ ] 144. RLS policy security audit
- [ ] 145. Multi-device live sync
- [ ] 146. Offline edit conflict resolution
- [x] 147. JSON import — DONE: Settings → Import data (validated file, confirm, reload)
- [ ] 148. Automatic cloud backup
- [ ] 149. Account deletion flow
- [ ] 150. Email change / session management
- [ ] 151. localStorage quota monitoring + warning
- [ ] 152. Data portability API

## 12. Monetisation

- [ ] 153. Stripe checkout for Plus/Pro
- [ ] 154. Payment webhook → plan sync
- [ ] 155. bKash/Nagad for Bangladesh market
- [ ] 156. Annual plan + promo codes
- [ ] 157. Upgrade prompts at limit hit-points
- [ ] 158. 7-day Pro trial flow
- [ ] 159. Referral system
- [ ] 160. Receipts/invoices
- [ ] 161. Restore-purchase flow (store builds)

## 13. Notifications

- [ ] 162. Web-push infrastructure in service worker *(verified: absent)*
- [ ] 163. Daily practice reminder
- [ ] 164. Streak-at-risk evening alert
- [ ] 165. Weekly report notification
- [ ] 166. Re-engagement sequence (day 3 / day 7)
- [ ] 167. Notification preferences screen
- [ ] 168. Timezone-aware scheduling

## 14. i18n & Accessibility

- [ ] 169. i18n framework (next-intl) + switcher *(verified: absent)*
- [ ] 170. Bangla UI translation
- [ ] 171. Hindi UI translation
- [ ] 172. Screen-reader audit (recorder, charts, scores)
- [ ] 173. prefers-reduced-motion support
- [ ] 174. High-contrast mode
- [ ] 175. Font-size control
- [ ] 176. Keyboard-only navigation audit
- [ ] 177. Visible focus rings everywhere

## 15. Performance & PWA

- [ ] 178. Bundle-budget + code-splitting audit
- [x] 179. Full offline caching — DONE: sw v2 precaches all 13 routes + LRU-trimmed static cache
- [ ] 180. Background sync for offline-recorded sessions
- [ ] 181. Custom "Install app" prompt button
- [ ] 182. iOS PWA mic-permission workarounds
- [ ] 183. Startup splash optimisation
- [ ] 184. Core Web Vitals → Lighthouse 95+
- [ ] 185. Privacy-friendly analytics (Plausible-class) *(verified: absent)*

## 16. Security & Quality

- [ ] 186. Fix npm audit findings — PARTIAL: critical fixed (vitest 2→4, suite 97/97 green); 7→2 findings; remaining next/postcss chain is build-time only and needs the Next 16 migration
- [ ] 187. E2E tests (Playwright) on critical journeys
- [ ] 188. Visual regression tests
- [ ] 189. Error tracking (Sentry-class)
- [ ] 190. Rate limiting on all API routes
- [ ] 191. Content-Security-Policy headers
- [ ] 192. Input sanitisation audit
- [ ] 193. Load test the AI/STT proxies

## 17. App Stores

- [ ] 194. Capacitor Android build
- [ ] 195. iOS build + TestFlight
- [ ] 196. Store listing copy + screenshots
- [ ] 197. In-app update prompt
- [ ] 198. Native share sheet integration

## 18. Trust, Legal & Content Ops

- [ ] 199. Privacy policy page *(verified: absent)*
- [ ] 200. Terms of service page *(verified: absent)*
- [ ] 201. "Where does my audio go?" explainer
- [ ] 202. About + contact page
- [ ] 203. Content pipeline doc (adding topics/mocks weekly)
- [ ] 204. Community feedback channel (in-app)
- [ ] 205. Changelog page ("what's new")
- [ ] 206. Teacher/tutor dashboard (multi-student view)
- [ ] 207. School bulk licences
- [ ] 208. Public score-verification links for reports
- [ ] 209. Sample-answers library (searchable)
- [ ] 210. Blog/SEO content hub (organic growth)


## 19. Evidence & Growth (added by the five-expert review — see STRATEGY.md)

- [x] 211. 4/3/2 fluency-protocol mode — DONE: /lab Fluency Lab, 3 rounds with live per-round scoring, delta dashboard, saves to history
- [x] 212. Spaced revisit engine — DONE: 1/3/7/14-day intervals, "Due for a revisit" card on Home, unit-tested (computeDueReviews)
- [ ] 213. Post-task corrected-transcript read-aloud (TRPT: proven accuracy gains)
- [x] 214. My Mistake Book — DONE: /mistakes page aggregating fillers/grammar/pronunciation/vocab/pauses with counts, trends & fixes; demo seeder ships 2 weeks of engine-real data
- [ ] 215. Vocabulary SRS with "used it in your next speech?" detection
- [ ] 216. Comprehensible input module (listening/reading at level — the biggest pedagogical gap: app is 100% output today)
- [ ] 217. Score-calibration harness (optional user-reported real IELTS results → publish Spearman ρ)
- [x] 218. Honest scoring UX — DONE: "est. band" labels on report hero; estimate disclaimers on lab; (variance display remains a future refinement)
- [x] 219. WhatsApp-ready share cards — DONE: offline canvas PNG cards on every report + lab results, Web Share API with download fallback
- [ ] 220. Live karaoke-style pronunciation overlay while speaking
- [ ] 221. Peer duel / challenge mode
- [ ] 222. Interview panel mode (3 AI interviewers: friendly, technical, stress)
- [ ] 223. Regional pricing engine (BDT/INR PPP) + hardened generous free tier
- [ ] 224. Scoring-API licensing (B2B2C — sell the engine to coaching centres/edtech)
- [ ] 225. Coaching-centre pilot programme (10 centres, teacher dashboard = #206)
- [ ] 226. Consent-based anonymised L1 error data flywheel (best Bengali-speaker error model)

---

**How to run this:** work top-to-bottom (dependencies flow downward), one cluster per session.
After every item: `vitest run` + `next build` must stay green, then tick the box and bump the
progress counter at the top.


## 20 · Competitive upgrades (from COMPETITIVE.md deep-dive, 2026-09-16)

- [x] 227. Live correction nudges — DONE: real-time filler + silence nudges in the recording UI (src/lib/insights/nudges.ts, unit-tested)
- [x] 228. One key takeaway — DONE: "One fix today" headline on every report (oneKeyTakeaway, unit-tested)
- [x] 229. Word-stress & intonation hints in pronunciation flags (ELSA specialisation) — DONE: lib/insights/prosody.ts (energy-variety monotone risk, pace swing, abrupt-break detection à la Azure UnexpectedBreak) + "Word stress & intonation" report card with coach tips; unit-tested
- [ ] 230. Act on accentTarget: US/UK/AU model answers + phoneme targets
- [ ] 231. Bangla L1 scaffolding for beginner steps (ties #170)
- [ ] 232. Input module: 60-90s video/podcast + comprehension (Langua; ties #216)
- [ ] 233. Vocab SRS flashcards from vocabHighlights (Langua; ties #215)
- [ ] 234. Selectable coach voices/avatars (Praktika parity)
- [ ] 235. Post-v1 language breadth roadmap (Talkio/TalkPal positioning)
- [ ] 236. Weekly human-review add-on tier (Cambly/Preply hybrid)
- [ ] 237. Web-first advantage push: desktop hotkeys, keyboard flows, PWA install campaign
- [ ] 238. School/enterprise analytics dashboard (Talaera; ties #224)
- [ ] 239. Repeat-after-me phrase scoring with per-phrase score (Pimsleur/ELSA; ties #220)
- [ ] 240. Privacy-first positioning: "your voice never leaves your device by default" (vs Speak sending audio to OpenAI/MS)
- [x] 241. Whisper cloud ASR (Groq whisper-large-v3-turbo) — DONE: raw mic audio recorded; on stop, cloud transcript + word timings replace Web Speech text when a key is configured; on-device fallback kept; endpoint + merge unit/API-verified

## 9. World-No.1 push (research 2026-09-17 — see MUSTHAVE.md)

- [x] 242. Smart multilingual practice, zero extra MB — DONE: 20-language catalogue (BCP-47 + Whisper codes + native names + per-language filler lists), OS-language auto-default, searchable Settings picker, language-aware scoring (grammar dimension honestly unmeasurable outside English), language badge + note on reports
- [x] 243. Mobile bottom-nav duplicate "Speak" label — DONE: centre raised button is Speak; left slot now History
- [x] 244. Flaky-network recognition hardening — DONE: Web Speech network-error restart cap (no more silent infinite restart on 4G), inline caption-issue banner while recording, Whisper still transcribes on stop, empty-capture guard routes to typed fallback instead of fabricating a report
- [x] 245. Recording timer clarity — DONE: elapsed counts up next to "/ target" (no more ambiguous 0:00 countdown)
- [x] 246. Practice-language picker in Settings — DONE: searchable sheet, native names, capability hints, toast on change
- [x] 247. Prosody report card (word stress & intonation) — DONE: see #229
- [x] 248. "Hear it like a native" compare-after-correction (Loora's standout) — DONE: "Hear the fix" on every grammar correction + "Hear it like a native" on model answers (browser TTS, offline-capable)
- [x] 249. TOEFL Speaking mode — DONE: /toefl with 4 Listen-&-Repeat (TTS prompt + pronunciation-focused scoring) + 4 Interview tasks, ETS-style weights, nav entry, history/home labels, SW precache
- [x] 250. Pitch-tracked intonation — DONE: estimateF0 autocorrelation DSP in audio-meter (20 fps F0 contour), prosody card now uses measured pitch variety/median/declination with loudness fallback; unit-tested on synthetic tones
- [ ] 251. Per-language pace & pause baselines (current wpm bands are English-calibrated)
- [x] 252. Install-prominent PWA campaign + offline shell — DONE: beforeinstallprompt pill in shell (dismissable, once), SW bumped to v4 with /toefl precached

## 10. Real-device feedback reliability (user report 2026-09-17)

- [x] 253. Whisper backstop hardening — DONE: 20 s cap per attempt + one automatic retry, so 4G races no longer kill the only transcript source
- [x] 254. Script intelligence — DONE: deep grammar/vocab analysis follows the script actually spoken (Latin text analysed as English even under a Bangla profile; Bangla speech never gets Latin rules)
- [x] 255. Report never leaves the learner without guidance — DONE: focus-areas fallback for empty AND strong sessions; empty transcript explains mic/network causes with concrete fixes; transcript card labels its source (Whisper cloud / on-device / typed)
- [x] 256. Live "not catching words" hint after 8 s of silence with no captions — DONE in session-flow

## 11. Understanding & control upgrade (user report 2026-09-17)

- [x] 257. Clear practice history (profile & settings survive; two-tap confirm) — DONE in Settings, local + Supabase repos
- [x] 258. LLM understanding layer — DONE: lib/insights/llm-feedback.ts; schema-validated examiner JSON (grammar fixes with verbatim quotes, organisation note, 3-step plan, CEFR read), 15 s cap, local engine remains the floor; live-proven with real corrections
- [x] 259. Whisper-first ASR hardening — DONE: topic prompt biasing, detected-language stored on report, underflow guard never erases a good on-device transcript
- [x] 260. "Examiner's improvement plan" card on reports — DONE with model attribution

## 12. Core-loop architecture rebuild (expert audit 2026-09-18)

- [x] 261. Progressive reports — DONE: local report paints in <1 s; Whisper + LLM examiner upgrade the same report in background; report screen live-refreshes via osyn:report-updated; bounded rescue only when nothing was captured
- [x] 262. Single shared mic stream — DONE: one getUserMedia for recognition meter + MediaRecorder (kills the Android double-acquisition flake); idempotent stop()
- [x] 263. Stale-build immunity — DONE: APP_BUILD stamp in Settings, SW controllerchange self-reload (skips first activation), surge no-cache headers for sw.js/html
- [x] 264. Diagnostics row (App build) in Settings for remote triage — DONE

## 13. Production-grade pass (14-workstream release 2026-09-18)

- [x] 265. Per-language pace bands (#251) — DONE: 19 languages carry comfortable wpm bands; pace scoring/verdicts/directions follow them; unit-tested
- [x] 266. Mic release on paused-stop — DONE: stopping from pause finalises the MediaRecorder so tracks (and the OS mic indicator) release
- [x] 267. Smart language suggestion — DONE: when Whisper hears a different language than configured, a once-per-session toast suggests switching (Settings)
- [x] 268. Production hygiene — DONE: OpenGraph/Twitter meta for professional shares; sweep now audits horizontal overflow on desktop + mobile for every route

- [x] 269. Mobile horizontal overflow audit found + fixed the impromptu difficulty-chip row (634px overflow on 360px phones) — chips now swipe

## 14. IELTS full-suite release (all four skills)

- [x] 270. IELTS Listening — DONE: 2 sets × 4 sections narrated on-device via TTS (0 MB audio), play/pause/replay + 0.9-1.25× speed, per-set band from the official Academic listening table, transcripts after check
- [x] 271. IELTS Reading — DONE: 3 Academic passages (MCQ + True/False/Not Given), count-up timer, instant band from the official reading table, targeted next-step coaching per band
- [x] 272. IELTS Writing — DONE: Task 1 (×2) + Task 2 (×3) with AI examiner returning TA/CC/LR/GRA + overall half-bands, verbatim fixes, strengths, band-raising tips; honest local estimate fallback; model answers; recent reports stored on device
- [x] 273. IELTS hub = 4-skill launcher + one-time CoachTip on home ("how OsynLearn works", dismissible) + band-conversion/writing-parser unit tests (8 new)

## 15. GodMode release — Guide Library, IELTS deep learning, modern Roadmap, elite UI

- [x] 274. TOEFL section renamed Guide Library (nav + home + palette) with TOEFL practice preserved at /toefl/speaking
- [x] 275. 20 Learning & Motivation articles + 20 Career articles, each with unique SVG cover art + data infographic + takeaways + related reading; reader with back button
- [x] 276. IELTS Smart Study — DONE: SRS Word Bank (30 academic words, 10min→1d→2d… spacing) + honest Band Planner (feasibility-checked weekly cycle); unit-tested
- [x] 277. IELTS back buttons everywhere + Smart Study card on hub
- [x] 278. Roadmap redesigned: gradient hero with live stats, skill-mastery depth panel from real sessions, vertical timeline; day cards kept
- [x] 279. Elite UI pass: grouped sidebar nav with gradient active state, .lift hover, fade-up, focus-visible rings, selection colour; +6 tests

## 16. Smart-UX continuation pass

- [x] 280. Library search (title/tag/intro) + reading memory (✓ read badges, continue-reading card, "you have read X/40") + photographic category banners (AI-generated, served locally)
- [x] 281. Roadmap checkmarks now persist across refreshes (localStorage)
- [x] 282. Word Bank "hear it" — TTS pronunciation of word + example
- [x] 283. Home "Jump back in" smart card — due cards / last guide / last report / first-rep nudge, computed live
- [x] 284. filterGuides unit test (+1) — 159/159 green

## 17. Live Interview system + 20 long interview masterclasses

- [x] 285. FIRST LIVE INTERVIEW SYSTEM — DONE: 4 tracks (HR, Behavioural·STAR, English Job, Curveballs) — the app asks out loud (TTS), listens on mic (typed fallback), instant per-answer debrief (score/wpm/fillers/grammar/STAR beats), final senior-interviewer verdict (LLM or honest local floor); new SpeakingMode 'interview' + weight profile + unit tests (STAR detector)
- [x] 286. 20 LONG interview/career masterclass articles in the Library (9-10 min reads) with covers + infographics + photographic Interview banner — Library now 60 guides
- [x] 287. Sidebar: new "Live Interview" nav under Career & Exams; library gains Interview Mastery tab
- [x] 288. guides/star tests green (162/162)

## 19. Today + History optimisation & mobile-flex pass

- [x] 289. Home: smart Coach Note card (trend-aware headline + weakest-dimension action, pure coachNote() with tests) + quick-start row becomes a horizontal snap-scroll rail on mobile (flexible one-thumb use)
- [x] 290. History rebuilt smarter: 4-stat strip incl. 7-day avg with trend arrow, sort (Newest/Best/Longest), 8 filters incl. "Needs work" + TOEFL + Interview, day-grouped list, per-row "practice again" deep-link, personal-best footer; historyStats/sortSessions unit-tested
- [x] 291. Mobile sweep list unchanged (already covers home/history); 360px screenshots verified

## 20. Perfect-mobile + central smart-engine round

- [x] 295. Shell min-width fix — app-shell root + main get min-w-0/overflow-x-clip so horizontal rails can no longer inflate the whole layout to their min-content (measured: /home 1024→0, /ai 800→0, /ielts 433→0; ALL 19 routes at 360px now measure 0px overflow)
- [x] 296. Bottom nav fixed w-16 columns → fluid min-w-0 flex-1 (6 slots fit 360px) + raised Speak button shrink-0
- [x] 297. Tap-target floor ≥36px everywhere: Chip min-h-10, Button sm h-10, Segmented min-h-10, header logo/streak/avatar h-10, roadmap complete-toggle h-11 w-11 + item rows min-h-11, back-links min-h-11, CoachTip dismiss h-10 — 360px audit finds zero sub-36px targets
- [x] 298. JumpBackIn cards min-w-0 — labels truncate inside the card instead of bursting the grid at 360px
- [x] 299. Central smart engine smartNextActions() in src/lib/insights/next-action.ts: ranked streak-risk → SRS word-bank due → overdue drill review → weakest dimension (<65 only) → goal countdown → guide/report/first-rep; every card carries its evidence line ("why"); 11 unit tests; Home JumpBackIn now fully engine-driven (SRS + streak + daily + sessions all real state)
- [x] 300. Engine correctness: brand-new learners see "first rep" instead of a goal countdown (test caught, engine fixed)
- [x] 301. iv-90days guide icon 🗓️ + APP_BUILD → v2026-09-22.1
- [x] 302. Redeploy: surge osynlearn-live + osynlearn-english both Success; SWEEP CLEAN (22 routes); screenshots mobile-home-v2 / mobile-history-v2 / home-smart-v2

## 21. GodMode III — five-destination IA, IELTS onboarding, i18n foundation

- [x] 303. IA reorganised to five primary destinations — Today /home, Learn /learn, Practise /practise (raised centre button on mobile), Mocks /mocks, Progress /progress; coach, vocab (Word Bank), mistake book, history, roadmap consolidated inside Learn/Practise/Progress; billing & settings hang off the profile (avatar → Settings, Plans in More); desktop sidebar regrouped to match; new hub pages consolidate with LIVE status (guides read x/60, cards due, roadmap done/total, last mock overall)
- [x] 304. IELTS-specific onboarding: Academic vs General Training, target overall + target speaking (0.5-step band chips), optional exam date — shown only when goal = IELTS; plus an explanation-language step (English / বাংলা); profile extended (ieltsModule, targetOverall, targetSpeaking, uiLanguage) and Mocks hub shows the target chip
- [x] 305. Destination preservation: shell gate stashes the intercepted path (sessionStorage osyn:next), onboarding consumes it and returns the learner to where they were headed instead of always /home (pure helpers in lib/onboarding-dest.ts)
- [x] 306. i18n foundation: lib/i18n/ui.ts holds ALL UI copy (en + bn) separate from logic; useT() binds to profile.uiLanguage; applied to bottom bar, sidebar groups, greeting, Next-up, hubs, install pill; Settings → Interface language segmented toggle; parity unit tests (every key in every language, no orphans)
- [x] 307. Focused Today: "Next up" hero card = top smartNextAction with purpose line + honest ~minutes estimate (engine now returns minutes on every action) + Start CTA; compact alternatives below; translated greeting; insights badge now points at Progress
- [x] 308. Learner-screen hygiene: removed developer configuration copy ("Settings → AI key unlocks the examiner brain") from CoachTip; install prompt now only appears after 2+ completed sessions (value first, ask second)
- [x] 309. Sweep upgraded to the new IA (asserts all five destinations + More-sheet History) and 26 routes; SWEEP CLEAN on production Surge after deploy
- [x] 310. Key-journey screenshots: onboarding-ielts.png, mobile-home-ia.png, mobile-home-bn.png, desktop-home-ia.png, desktop-progress.png

## Route map (current)

| Route | Purpose | Status |
|---|---|---|
| / | gate → /home or /onboarding | working |
| /onboarding | 6–7 step wizard (IELTS step conditional), returns to stashed destination | working |
| /home (Today) | next-up hero, coach note, goal/streak, start rail | working |
| /learn | hub → Guide Library, Word Bank, Roadmap, IELTS kit (live statuses) | working |
| /practise | hub → Free Speak, Coach, Fluency Lab, Live Interview, AI Tutor | working |
| /mocks | hub → IELTS suite (module-aware), TOEFL Speaking, Writing; target chip | working |
| /progress | hub → Insights, History, Mistake Book + 4 stat tiles | working |
| /impromptu /coach /lab /interview /ai | practice surfaces | working |
| /ielts (+listening/reading/writing/study/mock) | IELTS suite + Word Bank | working |
| /toefl /toefl/speaking | Guide Library + TOEFL speaking | working |
| /insights /history /mistakes /roadmap | progress surfaces | working |
| /settings | profile incl. language & targets, engine, data; billing via /pricing | working |
| /login /pricing | auth & plans | working |
| /diagnostic /lesson /studio | screening+diagnostics, lesson cycle player, content workflow | working |

## 22. GodMode IV — personalization depth + consistent states (deploy held to end of arc)

- [x] 311. Section-score targets: profile.targetSections {L,R,W,S}; onboarding IELTS step gains compact per-section selects; Mocks hub renders a 4-tile target board (measured speaking delta coloured good/warn when a mock exists)
- [x] 312. lib/insights/personalize.ts — pure personalization math, unit-tested (8 tests): examCountdown (urgency ≤21d, silent after exam), targetGap (1dp vs learner's own target), paceAdvice (honest +band/week, silent when target beaten), personalStartOrder (weakest dimension reorders the start rail)
- [x] 313. Today personalization: exam-plan card (days-to-exam + final-stretch badge + measured band vs target + pacing advice) shown only for IELTS learners with real dates; start rail now data-ordered with an honest "ordered for your X focus (~N)" caption
- [x] 314. Consistent states: (tabs)/loading.tsx skeleton on every route change; (tabs)/error.tsx + root error.tsx with retry (no white screens); friendly not-found.tsx; shell OfflineBanner (online/offline listeners, translated) — practice-continues-local messaging
- [x] 315. Accessibility: skip-to-content link + #main target; global :focus-visible ring already present and now reachable everywhere
- [x] 316. Tablet tier: sidebar + five-group navigation now appears from md (768px) instead of lg; bottom bar + top bar are phone-only; verified 0 overflow at 768px and 360px
- [x] 317. i18n growth: offline.* keys in en+bn (parity tests enforce completeness)
- [x] 318. Verified locally (deploy intentionally held): tsc clean, 191 passed + 1 skipped, SWEEP CLEAN (26 routes, localhost), screenshots mobile-home-personal / mobile-mocks-personal / tablet-home

## 23. Learning system — curriculum, diagnostics, adaptive plan, lessons, content workflow (deploy held to end of arc)

- [x] 319. lib/curriculum: typed curriculum (skills, modules w/ prerequisites, objectives, difficulty, question types, duration, mastery evidence), 12 seeded lessons across L/R/W/S incl. GT letter + Task 2 + Speaking Parts 1–3; coverage.ts coverage matrix; studio.ts authoring overlay (draft → review → published → correction, version bumps, source+rights labels, AI-drafted badge)
- [x] 320. lib/curriculum/planner.ts (11 unit tests): weeklyAllocation (every skill ≥1/wk, +weakness/+under-target top-ups, cap 4), buildAdaptivePlan (prereq-ordered, capacity-aware, ≤1 overdue review/day), reschedule (missed days roll forward, ≤2 carry/day, 90-min ceiling, nothing vanishes), levelToBand
- [x] 321. lib/insights/mastery.ts (4 unit tests): unseen-attempt ledger per skill — progress = repeated performance on unseen material; Progress hub shows overall + per-skill unseen-accuracy tiles
- [x] 322. /diagnostic: 3-min provisional screening (1 unseen item per skill, PROVISIONAL label) + fuller per-skill diagnostics that confirm sectionLevels; wired to Learn + Home CTAs
- [x] 323. /lesson?id= player: explanation → worked example → guided (hints on) → independent (hints off, counted as unseen evidence) → feedback w/ explanations → retry (≤2) → mastered: SRS entry + mastery ledger; next-lesson respects prerequisites/module/status; locked card for unpublished
- [x] 324. Mistake book assigns lessons (filler/pronunciation→S1, grammar→G1, vocab→V1, pause→S3) shown as an "assigned lessons" strip
- [x] 325. /studio: status workflow UI (publish / request correction / pull for review / back to draft), rights + AI-drafted labels, coverage matrix table
- [x] 326. Honesty fixes: Listening gains Practice vs Exam modes (exam = audio plays ONCE, no replay/speed/live transcript); Reading scores labelled "practice estimate, NOT an official band"; device TTS labelled "practice audio, not exam"
- [x] 327. Learn hub: provisional levels card + adaptive weekly plan preview (today's lessons, overdue reviews ↻ rescheduled); plan respects minutes/day, targets, weakness, overdue reviews
- [x] 328. Settings: freellmapi provider option (self-hosted gateway; learner pastes their own base URL, key optional, nothing hardcoded; base URL normalized to /v1/chat/completions) + keyless-Bearer fix in provider streaming
- [x] 329. Verified locally (deploy intentionally held): tsc clean; vitest 205 passed + 1 skipped; next build 39 pages clean; SWEEP CLEAN incl. /diagnostic /lesson /studio; screenshots round5-diagnostic / round5-lesson-explain / round5-lesson-guided / round5-plan-card / round5-studio / round5-ai-engine-freellm

## 24. Managed AI coaching & assessment without learner keys (deploy held to end of arc)

- [x] 330. Server-side managed AI: env-only credentials (OSYN_AI_*), configurable provider/endpoint/model, per-client rate limit, daily cost cap, timeout + bounded retries (network/429/5xx only), token-usage cost math + latency, disk ledger; routes /api/ai/status, /api/ai/assess/writing, /api/ai/assess/speaking. Live-verified: 400 short, 422 silent, 502 provider-failure (work preserved), full success path against a schema-conform provider with exact cost ($0.00058 for 800+120 tokens at default prices)
- [x] 331. Injection safety + strict validation: per-request random fences mark learner text UNTRUSTED; validator clamps half-bands, strips non-verbatim evidence and injected content, ALWAYS nulls pronunciation (no prosody reaches the server), forces null fc/pr for typed input
- [x] 332. Writing v2: three labelled tiers (managed AI / learner key / local provisional), Task Achievement vs Task Response by task type, combined band weights Task 2 ×2, verbatim evidence, three prioritised improvements, targeted-exercise link, rewrite action
- [x] 333. Before/after honesty: Jaccard overlap ≥ 0.5 flags "practice, not new evidence" with per-criterion deltas (verified live at 97% overlap)
- [x] 334. Speaking journey: mic check (level/silence/clipping), recording playback (session-scoped audio bus), completed-assessment panel on /report with four public criteria, insufficient-evidence states, ≈-timestamped evidence quotes, rerecord + targeted exercise actions
- [x] 335. Recoverable failures: writing & speaking submissions queue on managed failure with explicit retry; reasons shown; provisional report stands; no invented scores anywhere
- [x] 336. Evaluation: eval-set-v1 (good/short/irrelevant/copied/silent/noisy/adversarial/typed) + runner verifying deterministic layers (32/32 checks); /eval human-rating workflow with qualified-reviewer flag, disagreement review (|Δ|≥1), blind-duplicate consistency, subgroup analysis
- [x] 337. Usage/cost/latency dashboard on /eval (client ledger + server ledger)
- [x] 338. Contextual coaching: TutorContext.evidence from mastery ledger + diagnostic levels + lesson progress; local tutor plan-intent answers with the learner's real evidence; cloud system prompt references it
- [x] 339. LIMITATIONS.md: exact dependencies (server credentials + qualified reviewers; static-host caveat), no official-accuracy claims, accent-fairness policy
- [x] 340. Tests 234 green incl. managed, managed-server (retry/cost/limits) and eval-runner suites
- [x] 341. Verified: tsc clean; next build 0 errors; SWEEP CLEAN incl. /eval; API smoke matrix; screenshots round6-writing-managed / round6-writing-overlap / round6-eval / round6-eval-limits

## 25. Production services: auth, billing, roles, teacher & admin, ops (deploy held to end of arc)

- [x] 342. Auth hardening: Supabase recovery-link flow, guest→account merge with dedupe + newer-wins conflicts + idempotency (unit-tested); sandbox HMAC tokens keep every authorisation path testable until live Supabase creds exist
- [x] 343. Durable storage: migrations 0001_init + 0002_production_services (orgs, memberships, invites, assignments, submissions, feedback_overrides, subscriptions, webhook_events, writing_attempts, consents) with RLS mirroring lib/rbac; backup.sh/restore.sh + tested-restore procedure documented
- [x] 344. Autosaved writing (debounced drafts, restore chip) + recoverable practice sessions (typed-draft autosave, resume banner ≤24 h)
- [x] 345. Offline: sync queue (ordered, key-deduped, attempts counted), recordSession queues on cloud failure, flush-on-reconnect with toast, OfflineBanner shows queued count; cloud AI states its online requirement on failure
- [x] 346. Privacy center: accurate per-provider data map, recording consent gates cloud transcription, retention control, recovery links, deletion request; recordings never persisted or served by URL
- [x] 347. Server-enforced subscriptions: Free / Paid Preparation / Teacher-Supported; AI allowances from measured delivery cost (3 / 3,103 / 6,034 per month); BDT ৳ + USD consistent presentation
- [x] 348. Verified idempotent webhooks (HMAC, event-id dedupe), failed→past_due, cancelled→Free, refund→revoked; client success proves nothing (sandbox simulator runs the same verify+apply); Stripe + SSLCommerz/bKash mapped for BD, sandbox until approval
- [x] 349. Roles learner/teacher/org_admin/platform_admin with server-side authorize()+orgScope; unauthorised + cross-org isolation tested (unit + curl matrix: 401/403)
- [x] 350. Teacher workspace: invites, assignments, submission review, feedback override with immutable audit trail, class progress — org-isolated
- [x] 351. Platform admin: billing visibility, org overview, quality monitor (scrubbed ledger), metadata-only support lookup
- [x] 352. Security: whitelisted file store, hashed ledger ids, validation at every route, rate limits + cost caps, server-only secrets; DEPLOY.md env matrix + steps + remaining-dependencies list
- [x] 353. Verified: tsc clean; vitest 249 passed; build 0 errors; SWEEP CLEAN incl. /teacher /admin; 20-step curl matrix; screenshots round7-*

## §26 Round 8 — release-owner audit, pilot readiness (items 354–365)

- [x] 354. e2e/journeys.mjs: all 7 release journeys executed with real UI interactions + robustness battery (mic denial, empty submit, keyboard, h1, 2G-throttle) — 24/24 PASS
- [x] 355. P1 FIX: diagnostic screening blanked on speaking (no objective items) so provisional levels were never saved — null-filtered items, stage guard, honest "Practice-based" label; re-verified in journeys + sweep
- [x] 356. P2 FIX: offline recovery — SW precache was missing /report + 16 routes and query-string navigations fell back to the home shell; 38-URL precache, ignoreSearch fallback, cache v5; offline session→report verified
- [x] 357. src/lib/analytics: privacy-conscious on-device ring buffer (no ids, no content, bounded 500, erasable) + summarise() with honest unknown-until-elapsed retention windows — 7 unit tests
- [x] 358. Instrumented: diagnostic_completed, first_corrected_retry, activity (session minutes from timestamps, mock durationMin), conversion/cancellation on verified webhook outcomes, ai_cost cents at the single place cost is known
- [x] 359. Admin "Pilot analytics (this device)" panel; Settings clear-history now erases analytics too (privacy promise kept in code)
- [x] 360. Public pages /welcome (truthful positioning, sample-experience CTAs, pricing imported from billing data, "what we do not claim" block), /refer (manual-credit honesty), /partners (shipped teacher mechanics only) — guest-accessible, SEO metadata verified
- [x] 361. /privacy notice page written against shipped behaviour (consent defaults off, retention windows, org isolation) + gate freePaths for public routes
- [x] 362. Claims audit: no guarantees/testimonials/PMF claims anywhere; "60 guides" = 60 real items; band outputs labelled estimates; content carries source/rights; privacy copy matches code
- [x] 363. PILOT.md (hypotheses + gates fixed before results), GROWTH-90.md (Bangla IELTS beachhead, evidence-gated expansion), RELEASE-SCORECARD.md, RUNBOOK.md (rollback, SW version pinning, monitoring, gotchas)
- [x] 364. Staging deploy — DONE: OsynLearn rebrand shipped; static demo published to osynlearn-live.surge.sh under the owner's verified-pending Surge account; live billing remains an explicit release step
- [x] 365. Final verification: tsc clean, vitest all green incl. analytics, build 0 errors, sweep CLEAN on localhost, journeys 24/24
