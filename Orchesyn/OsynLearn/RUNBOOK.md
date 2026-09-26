# Runbook — staging & pilot operations

## Deploy / rollback

**Deploy (staging):** `npm ci` → `./node_modules/.bin/next build` → serve `./node_modules/.bin/next start -p 3000 -H 0.0.0.0`. Never `npx next` (it silently fetches the latest major when `node_modules` is missing — this happened and produced a misleading "no production build" failure).

**Surge static staging** (when a token exists): requires static output per `DEPLOY.md`; API routes (`/api/billing/*`, `/api/auth/*`) need the Node host or a separate API deployment — a pure static surge site must point `NEXT_PUBLIC_API_BASE` at the API host. Authenticate once (`surge token` → `~/.netrc`), then `npx -y surge <dir> osynlearn-staging.surge.sh`. **Production domain deploys remain an explicit release step.**

**Rollback:** static hosting keeps the previous build directory — redeploy the prior `out/` (keep the last 3 tagged builds: `out-<gitsha>.tar.gz`). For the Node host: `git checkout <last-good-sha> && npm ci && next build && pm2/systemd restart`. Database rollbacks use `scripts/restore.sh` against the latest `scripts/backup.sh` dump (verify with its built-in smoke queries before pointing traffic back).

**Service worker note:** clients pin cached shells until `osynlearn-vN` bumps. Any change to navigations/offline behaviour must bump `CACHE`/`STATIC` versions in `public/sw.js` or rolled-back users keep the new shell.

## Monitoring (pilot-scale, no new infra)

1. **Uptime:** external ping on `/welcome` (static, no auth) every 5 min; alert on 2 consecutive failures.
2. **API health:** ping `/api/billing/entitlements` unauthenticated → expect `401` (proves the route + auth are alive without touching data).
3. **Webhook pipeline:** sandbox-notify smoke test after every deploy (the round-7 curl matrix script covers idempotency + signature cases — run it).
4. **Client error canary:** pilot learners are asked (consent form) to report the `Application error` screen; any occurrence = P1, freeze recruitment per `PILOT.md` G2.
5. **AI budget:** admin page "Pilot analytics" shows ¢/active-day per device; aggregate weekly from consented exports; alert threshold = 35% of prep price (H6).
6. **Backup:** nightly `scripts/backup.sh` once Supabase is connected; verify restore quarterly with `scripts/restore.sh --dry-run`.

## Incident severity

- **P1:** data loss, payment/entitlement mismatch, privacy leak → freeze pilot, fix, re-run `e2e/journeys.mjs` + sweep, restore from backup if needed, notify coordinator → learners.
- **P2:** journey broken with workaround (e.g. mic path down, typed fallback works) → fix within 48h, note in weekly partner email.
- **P3:** cosmetic/typo → backlog.

## Known operational gotchas (learned the hard way)

- Sandbox snapshots wipe `node_modules/` + `.next/` between sessions — always `npm ci` + build before serving.
- `sweep.mjs` defaults to the live surge URL — run with `BASE=` or you audit the wrong build.
- Headless Chromium needs system libs (`libnss3`, `libnspr4`, …) — `npx playwright install --with-deps chromium` on a fresh box.
