# OsynLearn — environments, deployment, backups, remaining dependencies

## Environments

| Env | Hosting | Auth | Billing | AI | Storage |
|---|---|---|---|---|---|
| dev | local `next dev` / `next start` | sandbox HMAC tokens (`/api/auth/sandbox-token` exists ONLY when `OSYN_AUTH_SECRET` is unset) | sandbox provider simulator | mock or none | `.data/*.json` + localStorage |
| staging | Node host (Vercel-class) | Supabase Auth (staging project) | sandbox until provider approval | real provider, test key | Supabase staging |
| prod | Node host | Supabase Auth (prod project) | live provider webhooks | real provider | Supabase prod |

**Static hosts (Surge) cannot run this feature set**: API routes (`/api/*`) do not execute there. The app still works there in local-guest mode; managed AI, billing and the teacher workspace need Node hosting.

## Environment variables (server-only; never NEXT_PUBLIC_)

```
OSYN_AI_PROVIDER=groq|openai|openrouter|custom   # managed AI on
OSYN_AI_API_KEY=…                                # required to enable managed AI
OSYN_AI_ENDPOINT=…                               # optional override (self-hosted gateways)
OSYN_AI_MODEL=…
OSYN_AI_TIMEOUT_MS=20000
OSYN_AI_MAX_RETRIES=2
OSYN_AI_RPM=6                                    # per-client requests/minute
OSYN_AI_DAILY_CAP_USD=2                          # daily spend cap
OSYN_WEBHOOK_SECRET=…                            # billing webhook HMAC (rotate per env)
OSYN_AUTH_SECRET=…                               # disables the sandbox token endpoint
SUPABASE_URL=…                                   # client + server
SUPABASE_ANON_KEY=…                              # client (RLS-enforced)
SUPABASE_SERVICE_ROLE_KEY=…                      # server-only (webhook writes)
```

## Database migrations

1. `supabase/migrations/0001_init.sql` — core tables + self-RLS.
2. `supabase/migrations/0002_production_services.sql` — orgs, teacher workflow, billing, consents, durable attempts.
Apply in order: `supabase db push` (or `psql "$DATABASE_URL" -f 0001_init.sql -f 0002_production_services.sql`).
Never edit an applied migration; add `0003_…` instead.

## Backups & tested restore

- `scripts/backup.sh` → `pg_dump` of the Supabase Postgres instance to `backups/YYYY-MM-DD.dump`.
- `scripts/restore.sh <file>` → restores into a FRESH target database, then runs a smoke query.
- Restore test (staging, monthly): restore latest dump into an ephemeral DB, boot the app against it, run `curl` smoke matrix + `/eval` pipeline checks. A restore that has not been tested is not a backup.

## Deploy steps (Node host)

1. Set env vars per environment above.
2. `npm ci && npx next build && npx next start -p 3000` (host 0.0.0.0 behind TLS).
3. Smoke: `/api/ai/status` (200), `/api/billing/entitlements` (401 unauth), `/eval` (200), webhook signature rejection (401).
4. Keep Surge as the static demo of the guest/local experience only.

## Payment providers by market

- International cards: Stripe (webhooks with HMAC — same verify+apply path as the sandbox).
- Bangladesh: SSLCommerz (bKash/Nagad/cards) — map its IPN onto the same `BillingEvent` types; sandbox mode stays until live credentials + launch approval exist.

## Remaining external dependencies (precise)

1. **Supabase project (staging+prod)** — auth, Postgres, RLS. Dependency: project URLs/keys.
2. **Payment provider credentials + approval** — Stripe and/or SSLCommerz; until then billing is sandbox-only and clearly labelled.
3. **Managed AI key** — any OpenAI-compatible provider or a self-hosted freellmapi gateway; measured-cost allowances already coded.
4. **Qualified human reviewers** — `/eval` disagreement/consistency workflow is ready but empty; live-model judgement remains UNVERIFIED without them.
5. **TLS + hosting** — Node host with HTTPS for prod (encrypted transport); no raw-IP deployments.

## Security checklist applied in this build

- Secrets server-side only; sandbox secret clearly labelled and auto-disabled when `OSYN_AUTH_SECRET` exists.
- Input validation at every route (400s), rate limits (managed AI), daily cost caps.
- Protected file access: `.data` store names whitelisted; recordings are never written to disk or served by URL (session-scoped object URLs only).
- Privacy-conscious logging: client ids hashed in the ledger; admin views are metadata-only.
- Authorisation tested: unauthenticated 401, role denial 403, cross-org isolation 403 (see curl matrix + `production.test.ts`).
