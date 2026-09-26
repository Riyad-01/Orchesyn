import { NextResponse } from 'next/server';
import { managedConfig } from '@/lib/ai/managed';

export const dynamic = 'force-dynamic';

/** Never leaks credentials: only capability + limits. */
export async function GET() {
  const cfg = managedConfig();
  if (!cfg) {
    return NextResponse.json({
      ok: true,
      configured: false,
      reason: 'Server AI credentials are not configured on this deployment. Learners keep the on-device engine; see LIMITATIONS.md.',
    });
  }
  return NextResponse.json({
    ok: true,
    configured: true,
    provider: cfg.provider,
    model: cfg.model,
    limits: { rpmPerClient: cfg.rpmPerClient, dailyCostCapUsd: cfg.dailyCostCapUsd, timeoutMs: cfg.timeoutMs },
  });
}
