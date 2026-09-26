# OsynLearn — AI English Speaking Coach

A production-style rebuild of [stimuler.tech](https://stimuler.tech) as a real product (not the
marketing site). Next.js 15 App Router, TypeScript, Tailwind, installable PWA, Supabase-ready
with a fully offline local mode.

---

## What's in it

| Route | Feature |
|---|---|
| `/onboarding` | 5-step wizard → name, level, goal, daily minutes, target accent |
| `/home` | Dashboard: streak, daily goal ring, mode grid, today's topic, weak-dimension coach, achievements |
| `/impromptu` | 60-second impromptu speaking: 40+ topics, prep → record → analyze → report |
| `/coach` | Voice conversation with AI coach Sarah: 22 themes, 8 real-time scenarios, TTS replies, per-turn feedback |
| `/ai` | **AI Tutor** — powerful AI chat with 8 personas (Free Talk, Grammar Doctor, Vocabulary Builder, Writing Corrector, IELTS Examiner, Interview Coach, Pronunciation Guide, Role-Play). Streams replies, voice input, read-aloud, per-message copy, export, ⌘K command palette |
| `/ielts` | IELTS hub: 6 full mocks, Part 1/2/3 single-part practice, band descriptors, score history |
| `/ielts/mock/[id]` | Full-screen exam runner: Part 1 → Part 2 (prep+cue) → Part 3, official band calculation |
| `/roadmap` | 7/14/30-day adaptive plan rebuilt from your weakest dimensions, drills launch inline |
| `/insights` | Speech analytics: score trend, filler histogram, grammar-error breakdown, dimension bars |
| `/history` | All sessions, searchable and filterable, opens full reports |
| `/pricing` | Free / Plus / Pro comparison; local plan switching (billing not wired) |
| `/settings` | Profile, theme, engine capabilities, sign-in, JSON export, data wipe |
| `/login` | Magic-link + Google (Supabase), or continue as guest |
| `/report/[id]` | Standalone report view |

### The speech engine (the core, and it actually works)

`src/lib/scoring/` — deterministic, unit-tested (74 tests), **no API key required**:

- **Pronunciation** — phoneme-aware fuzzy match (Levenshtein → phoneme edit distance) of transcript
  vs. expected text, with an adaptive threshold and confidence-aware penalty.
- **Fluency** — words/minute, silence ratio, awkward pauses (>400 ms), self-corrections.
- **Grammar** — a ~45-rule real English grammar checker (articles, tense, S-V agreement, plural,
  determiners, run-ons, fragments, gerund/infinitive, preposition collocations).
- **Vocabulary** — TTR + MTLD (short-text aware), rare-word bonus (Google 10k list), filler penalty.
- **Fillers** — 22 filler words/phrases, frequency per 100 words.
- **Pace** — WPM scored against an ideal 110–165 range (no double-count with fluency).
- **Clarity** — filler ratio + pause ratio + transcript confidence.

Each dimension returns a 0–100 score plus a `verdict` and actionable `suggestions`. Everything
maps to a **CEFR level (A1–C2)** and an **overall 1–9 band** with a half-band snap, plus
**IELTS criteria** (FC / LR / GRA / PRA / overall band) from the official descriptors.

Pluggable adapters (`src/lib/speech/`):
- `web-speech` (default) — browser Web Speech API transcription.
- `cloud` — HTTP adapter for Deepgram/OpenAI/AssemblyAI when keys are provided.
- Typed fallback — paste a transcript when there's no microphone.

### The AI Tutor (powerful AI chat)

`src/app/(tabs)/ai` + `src/lib/ai/` is a full AI chat with **8 personas**, streaming replies,
voice input (Web Speech), read-aloud (TTS), per-message copy, conversation export, and an
advanced panel (temperature, provider status). It has **two interchangeable backends**:

- **On-device tutor (default, zero keys)** — `src/lib/ai/local-tutor.ts`. It is *not* a canned
  apology: it runs your message through the **real scoring engine** (grammar rules, fillers,
  vocabulary tier, WPM → band) and a curated knowledge base (definitions, idioms, grammar notes,
  pronunciation breakdowns, minimal pairs) to produce genuinely useful, persona-shaped answers.
  Fully offline in the PWA.
- **Cloud LLM (optional)** — `src/lib/ai/provider.ts` streams from any OpenAI-compatible endpoint
  (OpenAI, Groq, OpenRouter, or a local Ollama/vLLM server) when `NEXT_PUBLIC_AI_*` is set, and
  **gracefully falls back to the on-device tutor** if the call fails.

A global **⌘K / Ctrl-K command palette** (`src/components/layout/command-palette.tsx`) fuzzy-jumps
to any page, toggles the theme, and opens any AI persona.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Build + checks:

```bash
npm run build      # 15 routes compile clean
npm run test       # 74 scoring tests
npm run lint
```

**No API keys needed.** Everything runs locally out of the box.

---

## Cloud (optional)

`src/lib/db/supabase.ts` auto-detects credentials. Copy and fill:

```bash
cp .env.example .env.local
```

- Set `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` → auth + Postgres persistence (RLS). Apply
  `src/lib/db/schema.sql` in the Supabase SQL editor.
- Set `NEXT_PUBLIC_SPEECH_PROVIDER` + `SPEECH_ENDPOINT` → cloud pronunciation scoring.
- Leave everything blank → **guest mode**, persisted in `localStorage`. Fully functional.

The repository layer (`src/lib/store/repository.ts`) exposes one async API
(`createRepository()` → Supabase or Local), so the entire app works in both modes.

---

## Notes on fidelity & innovation

- **Faithful:** impromptu speaking, coach themes, IELTS mocks + band, 7-dimension feedback,
  day-wise roadmap, streaks/gamification, free vs premium tiers, PWA install.
- **Innovations added:** adaptive roadmap that rebuilds from your weakest dimension each day;
  grammar-error categorisation with counts in insights; filler-word histogram; achievement
  badges; typed fallback for mic-less practice; a "weakest dimension" drill launcher on home.

## Design

Hand-rolled SVG charts (no chart dependency), Framer Motion transitions, Inter + Manrope,
dark-first with a light mode. Bottom tab bar on mobile, sidebar + command-style nav on desktop.
