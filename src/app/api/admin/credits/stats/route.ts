// Admin-Dashboard/src/app/api/admin/credits/stats/route.ts
// Part 32 FIX v2 — Uses get_credit_stats() RPC for accurate aggregation.
//
// Root cause of signup_bonus = 0:
//   PostgREST has a default 1000-row limit on SELECT queries. If the platform
//   has >1000 credit_transactions rows, the per-type scan was silently truncated,
//   causing signup_bonus (one per user, easily >1000) to read as 0.
//
// Fix: call get_credit_stats() RPC which runs inside Postgres — no row limit.
//   Falls back to the previous direct-query approach if the RPC doesn't exist yet
//   (schema_patch_part32_credit_stats_rpc.sql not yet run).

import { NextRequest, NextResponse }          from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { CreditLedgerStats }             from '@/types/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminSession(request.headers.get('authorization'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  try {
    const admin = getAdminClient();

    // ── Try RPC first (correct — no row limit) ─────────────────────────────
    const { data: rpcData, error: rpcError } = await admin.rpc('get_credit_stats');

    if (!rpcError && rpcData) {
      const r = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      const stats: CreditLedgerStats = {
        totalIssued:             Number(r.total_issued            ?? 0),
        totalConsumed:           Number(r.total_consumed          ?? 0),
        netCreditsInCirculation: Number(r.net_in_circulation      ?? 0),
        avgBalancePerUser:       Number(r.avg_balance_per_user    ?? 0),
        totalSignupBonuses:      Number(r.total_signup_bonuses    ?? 0),
        totalPurchased:          Number(r.total_purchased         ?? 0),
        totalReferralBonuses:    Number(r.total_referral_bonuses  ?? 0),
        totalAdminGrants:        Number(r.total_admin_grants      ?? 0),
      };
      return NextResponse.json(stats);
    }

    // ── Fallback: direct queries with large explicit limit ─────────────────
    // Used when schema_patch_part32_credit_stats_rpc.sql has not been run yet.
    // Uses explicit .limit(500000) to bypass the default 1000-row cap.
    console.warn('[credits/stats] RPC unavailable, using fallback:', rpcError?.message);

    let totalIssued   = 0;
    let totalConsumed = 0;
    let avgBalance    = 0;
    let userCount     = 0;

    const { data: creditRows } = await admin
      .from('user_credits')
      .select('balance, total_purchased, total_consumed')
      .limit(500000);

    for (const row of (creditRows ?? [])) {
      totalIssued   += Number(row.total_purchased ?? 0);
      totalConsumed += Number(row.total_consumed  ?? 0);
      avgBalance    += Number(row.balance         ?? 0);
      userCount     += 1;
    }
    if (userCount > 0) avgBalance = avgBalance / userCount;

    // Fetch ALL transactions with a very large explicit limit
    const { data: txRows } = await admin
      .from('credit_transactions')
      .select('type, amount')
      .limit(500000);

    let totalSignupBonuses   = 0;
    let totalReferralBonuses = 0;
    let totalAdminGrants     = 0;
    let totalPurchasedTx     = 0;

    for (const tx of (txRows ?? [])) {
      const amt = Number(tx.amount ?? 0);
      switch (tx.type) {
        case 'signup_bonus':   totalSignupBonuses   += Math.abs(amt); break;
        case 'referral_bonus': totalReferralBonuses += Math.abs(amt); break;
        case 'admin_grant':    if (amt > 0) totalAdminGrants  += amt; break;
        case 'purchase':       if (amt > 0) totalPurchasedTx  += amt; break;
      }
    }

    const stats: CreditLedgerStats = {
      totalIssued,
      totalConsumed,
      netCreditsInCirculation: Math.max(0, totalIssued - totalConsumed),
      avgBalancePerUser:       Math.round(avgBalance),
      totalSignupBonuses,
      totalPurchased:          totalPurchasedTx,
      totalReferralBonuses,
      totalAdminGrants,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('[credits/stats] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load credit stats' },
      { status: 500 },
    );
  }
}