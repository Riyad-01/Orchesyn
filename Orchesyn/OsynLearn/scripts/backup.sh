#!/usr/bin/env bash
# Backs up the Supabase Postgres instance. Requires DATABASE_URL.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL (supabase → Settings → Database)}"
mkdir -p backups
STAMP=$(date +%F-%H%M)
pg_dump --format=custom --file="backups/${STAMP}.dump" "$DATABASE_URL"
echo "backup written: backups/${STAMP}.dump"
