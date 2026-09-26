/**
 * Guest → account migration.
 *
 * When a learner signs in, everything created as guest must move into the
 * account WITHOUT losing either side and without duplicating rows:
 *   - dedupe by id (same id on both sides = one row);
 *   - conflicting edits to the same id resolve to the NEWER updatedAt, ties to
 *     the server copy (it survived a network round-trip);
 *   - the merge is idempotent: merging the result with either input again
 *     changes nothing, so a flaky retry cannot corrupt the account.
 */

export interface Versioned {
  id: string;
  updatedAt?: number | string;
  [k: string]: unknown;
}

const ts = (v: Versioned): number => {
  if (typeof v.updatedAt === 'number') return v.updatedAt;
  if (typeof v.updatedAt === 'string') return Date.parse(v.updatedAt) || 0;
  return 0;
};

export interface MergeOutcome<T extends Versioned> {
  merged: T[];
  fromGuest: number;
  fromServer: number;
  conflicts: number;
}

export function mergeCollections<T extends Versioned>(guest: T[], server: T[]): MergeOutcome<T> {
  const byId = new Map<string, { row: T; side: 'guest' | 'server' | 'both' }>();
  let fromGuest = 0;
  let fromServer = 0;
  let conflicts = 0;

  for (const row of server) {
    byId.set(row.id, { row, side: 'server' });
    fromServer++;
  }
  for (const row of guest) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, { row, side: 'guest' });
      fromGuest++;
      continue;
    }
    // same id both sides: identical payload → nothing to do
    if (JSON.stringify(existing.row) === JSON.stringify(row)) {
      existing.side = 'both';
      continue;
    }
    conflicts++;
    const g = ts(row);
    const s = ts(existing.row);
    if (g > s) {
      byId.set(row.id, { row, side: 'guest' });
      fromGuest++;
      fromServer--;
    }
    // tie or server newer: keep the server copy
  }

  return { merged: [...byId.values()].map((v) => v.row), fromGuest, fromServer, conflicts };
}

/**
 * Idempotency check: re-merging the result against the server must produce the
 * same rows (conflicts may be re-detected — what matters is that resolution is
 * stable, i.e. the same rows win every time).
 */
export function isMergedStable<T extends Versioned>(guest: T[], server: T[], merged: T[]): boolean {
  const sort = (rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const again = mergeCollections(merged, server);
  return JSON.stringify(sort(again.merged)) === JSON.stringify(sort(merged));
}
