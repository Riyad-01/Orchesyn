# OsynLearn — Honest Limitations Report (2026-09-22, round 6)

Everything below is stated as fact about the current build, not aspiration.

## What is verified in this build

- **Deterministic assessment pipeline** — verified by `src/lib/eval/runner.test.ts` against
  `EVAL_SET_VERSION = eval-set-v1`: sufficiency gates (silent/short refused), copied-text
  overlap flagging, injection fencing (learner text is untrusted data, fenced with a
  per-request random boundary), band clamping to the half-band grid, verbatim-evidence
  enforcement (fabricated quotes are stripped), and the typed-input rule (typed practice
  can never carry fluency or pronunciation scores, enforced in the validator, not just the prompt).
- **Server call discipline** — `managed-server.test.ts`: timeouts, retry only on
  network/429/5xx within budget, no retry on 4xx, usage-based cost math.
- **Recoverable failures** — writing and speaking submissions are queued in
  localStorage when the managed service fails, with explicit retry; the learner's work is
  never lost and a failed AI call never degrades into invented scores (the UI shows the
  reason and keeps the provisional report).

## What is NOT verified (exact dependency)

- **Live model judgement** (does the LLM actually score like an examiner, obey the fence,
  and refuse injections?) — UNVERIFIED. Dependency: (1) server-side credentials
  `OSYN_AI_PROVIDER` + `OSYN_AI_API_KEY` (optional `OSYN_AI_ENDPOINT`, `OSYN_AI_MODEL`,
  `OSYN_AI_TIMEOUT_MS`, `OSYN_AI_MAX_RETRIES`, `OSYN_AI_RPM`, `OSYN_AI_DAILY_CAP_USD`) on a
  Node host, and (2) qualified human ratings through `/eval` (disagreement review,
  blind-duplicate consistency, subgroup analysis). Until both exist, managed band values
  must be treated as unvalidated estimates.
- **Static hosting caveat** — the current Surge deployment is fully static: API routes do
  not execute there. Managed assessment is available only on Node hosting (e.g. the local
  `next start` preview or Vercel-class hosts). On static hosts the app degrades to the
  on-device provisional engine and says so in the report UI.
- **Pronunciation measurement** — no phoneme-level engine. Local flags are heuristics
  (ASR confidence, syllable timing, self-repair); managed assessments return
  "insufficient evidence" for pronunciation unless real prosody measurements exist.
  We never infer pronunciation from a transcript, and never from typed text.
- **No official-accuracy claim** — every band shown is labelled estimate. No confidence
  percentages are fabricated anywhere; where evidence is insufficient the UI says so.

## Policies

- Accent variation is treated as fair by design; intelligibility is the criterion.
  The speaking prompt states this explicitly and the validator records "insufficient
  evidence" rather than guessing.
- Learner text is untrusted input: fenced in every prompt; validators strip any evidence
  quote that is not verbatim in the submission.
- Before/after comparisons flag high text overlap (≥ 0.5 Jaccard on content words):
  improvement on a near-identical rewrite is labelled practice, not new evidence.
- Fast provisional feedback (on-device) and completed assessment (managed AI / human
  review) are visually separated on every report.
