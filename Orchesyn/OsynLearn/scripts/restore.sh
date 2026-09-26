#!/usr/bin/env bash
# Restores a dump into a FRESH target database, then smoke-checks it.
# Usage: DATABASE_URL=postgres://… ./scripts/restore.sh backups/2026-09-22.dump
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a FRESH target database}"
: "${1:?path to a .dump file}"
pg_restore --clean --if-exists --dbname="$DATABASE_URL" "$1"
psql "$DATABASE_URL" -c "select count(*) as profiles from profiles;" 
psql "$DATABASE_URL" -c "select count(*) as subscriptions from subscriptions;"
echo "restore smoke check passed"
