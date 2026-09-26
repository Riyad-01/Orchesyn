/**
 * Sandbox session tokens.
 *
 * PRODUCTION auth = Supabase Auth (email/password, Google OAuth, magic-link
 * recovery) with JWTs verified server-side and RLS enforcing ownership —
 * see supabase/migrations. Until live credentials exist, the sandbox issues
 * HMAC-signed dev tokens carrying the same claims (userId, role, orgId, exp)
 * so every route's authorisation path runs for real and is testable via curl.
 * The sandbox secret is clearly labelled and must never be used in prod.
 */
import { signBody } from '@/lib/billing/webhook';
import type { Role } from '@/lib/rbac';

export interface SandboxClaims {
  userId: string;
  role: Role;
  orgId: string | null;
  exp: number;
}

const secret = () => process.env.OSYN_AUTH_SECRET ?? 'SANDBOX-DEV-SECRET-DO-NOT-USE-IN-PROD';

export const sandboxMode = () => !process.env.OSYN_AUTH_SECRET;

export async function issueSandboxToken(claims: Omit<SandboxClaims, 'exp'>, ttlMs = 12 * 3600_000): Promise<string> {
  const payload: SandboxClaims = { ...claims, exp: Date.now() + ttlMs };
  const body = JSON.stringify(payload);
  const sig = await signBody(body, secret());
  return `${Buffer.from(body).toString('base64url')}.${sig}`;
}

export async function verifySandboxToken(header: string | null): Promise<SandboxClaims | null> {
  if (!header) return null;
  const [b64, sig] = header.split('.');
  if (!b64 || !sig) return null;
  let body: string;
  try {
    body = Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const { verifySignature } = await import('@/lib/billing/webhook');
  if (!(await verifySignature(body, secret(), sig))) return null;
  try {
    const claims = JSON.parse(body) as SandboxClaims;
    if (claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
