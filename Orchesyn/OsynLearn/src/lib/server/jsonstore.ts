/**
 * Sandbox durable store: JSON files under .data/ on the server.
 *
 * This stands in for Postgres while no real database credentials exist. The
 * production path is supabase/migrations/* against Supabase/Postgres; the
 * shapes stored here mirror those tables 1:1 so switching is a data move, not
 * a rewrite. Names are whitelisted — no path input ever reaches fs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = new Set(['billing.json', 'orgs.json', 'ledger.json']);

const base = () => {
  const dir = join(process.cwd(), '.data');
  mkdirSync(dir, { recursive: true });
  return dir;
};

export function storeRead<T>(name: string, fallback: T): T {
  if (!ALLOWED.has(name)) throw new Error(`store not allowed: ${name}`);
  const p = join(base(), name);
  try {
    if (!existsSync(p)) return fallback;
    return JSON.parse(readFileSync(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export function storeWrite<T>(name: string, value: T): void {
  if (!ALLOWED.has(name)) throw new Error(`store not allowed: ${name}`);
  writeFileSync(join(base(), name), JSON.stringify(value, null, 2));
}
