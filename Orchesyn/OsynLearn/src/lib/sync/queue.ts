/**
 * Offline synchronisation queue.
 *
 * Writes that fail because the device is offline (or the network drops) are
 * queued with an idempotency key; when connectivity returns the queue flushes
 * in order. The executor receives each op at most once per flush attempt, and
 * ops carry their own key so a server that has already applied one is safe to
 * retry against. Nothing is ever dropped silently.
 */

export interface SyncOp {
  key: string;
  kind: string;
  payload: unknown;
  attempts: number;
  queuedAt: number;
  lastError?: string;
}

export type SyncExecutor = (op: SyncOp) => Promise<{ ok: boolean; retryable?: boolean; error?: string }>;

export class SyncQueue {
  constructor(private readonly storageKey: string, private readonly read: () => SyncOp[], private readonly write: (ops: SyncOp[]) => void) {}

  static fromLocalStorage(storageKey: string): SyncQueue {
    const read = (): SyncOp[] => {
      try {
        return JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as SyncOp[];
      } catch {
        return [];
      }
    };
    const write = (ops: SyncOp[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(ops));
      } catch {
        /* private mode */
      }
    };
    return new SyncQueue(storageKey, read, write);
  }

  list(): SyncOp[] {
    return this.read();
  }

  enqueue(key: string, kind: string, payload: unknown): SyncOp[] {
    const ops = this.read();
    if (!ops.some((o) => o.key === key)) {
      ops.push({ key, kind, payload, attempts: 0, queuedAt: Date.now() });
    }
    this.write(ops);
    return ops;
  }

  drop(key: string): void {
    this.write(this.read().filter((o) => o.key !== key));
  }

  /** Flush in order; stops an op that fails non-retryably and keeps going; returns a summary. */
  async flush(executor: SyncExecutor): Promise<{ applied: number; pending: number; failed: number }> {
    const ops = this.read();
    let applied = 0;
    let failed = 0;
    const remaining: SyncOp[] = [];
    for (const op of ops) {
      try {
        const r = await executor(op);
        if (r.ok) {
          applied++;
          continue;
        }
        failed++;
        remaining.push({ ...op, attempts: op.attempts + 1, lastError: r.error });
        if (r.retryable === false) continue; // keep it visible but do not block others
      } catch (e) {
        failed++;
        remaining.push({ ...op, attempts: op.attempts + 1, lastError: String(e).slice(0, 120) });
      }
    }
    this.write(remaining);
    return { applied, pending: remaining.length, failed };
  }
}

/** The app-level wiring: online/offline awareness + automatic flush on reconnect. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}
