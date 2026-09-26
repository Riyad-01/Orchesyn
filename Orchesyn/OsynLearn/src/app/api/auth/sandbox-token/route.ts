import { NextResponse } from 'next/server';
import { issueSandboxToken, sandboxMode } from '@/lib/auth/sandbox';
import type { Role } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/** Sandbox-only: mints a signed dev token so authorisation paths run for real.
 *  In production this endpoint must not exist — Supabase issues real JWTs. */
export async function POST(req: Request) {
  if (!sandboxMode()) return NextResponse.json({ ok: false, reason: 'sandbox disabled in production mode' }, { status: 403 });
  let body: { userId?: unknown; role?: unknown; orgId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }
  const roles: Role[] = ['learner', 'teacher', 'org_admin', 'platform_admin'];
  const role = roles.includes(body.role as Role) ? (body.role as Role) : null;
  const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : null;
  if (!role || !userId) return NextResponse.json({ ok: false, reason: 'invalid-claims' }, { status: 400 });
  const token = await issueSandboxToken({ userId, role, orgId: typeof body.orgId === 'string' ? body.orgId : null });
  return NextResponse.json({ ok: true, token, sandbox: true });
}
