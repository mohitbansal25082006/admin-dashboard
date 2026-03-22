// Admin-Dashboard/src/app/api/admin/credits/stats/route.ts
// Part 31C — Aggregate credit economy stats + per-type breakdown for the ledger.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { CreditLedgerStats } from '@/types/admin';

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

    // ── Aggregate from user_credits ───────────────────────────────────────────
    const { data: creditsAgg } = await admin
      .from('user_credits')
      .select('balance, total_purchased, total_consumed');

    const allCredits = creditsAgg ?? [];
    const totalIssued        = allCredits.reduce((s: number, r: any) => s + (r.total_purchased ?? 0), 0);
    const totalConsumed      = allCredits.reduce((s: number, r: any) => s + (r.total_consumed  ?? 0), 0);
    const totalBalance       = allCredits.reduce((s: number, r: any) => s + (r.balance         ?? 0), 0);
    const userCount          = allCredits.length;
    const avgBalance         = userCount > 0 ? totalBalance / userCount : 0;

    // ── Per-type breakdown from credit_transactions ───────────────────────────
    const { data: txRows } = await admin
      .from('credit_transactions')
      .select('type, amount');

    const typeMap: Record<string, { count: number; totalAmount: number }> = {};
    for (const tx of (txRows ?? [])) {
      if (!typeMap[tx.type]) typeMap[tx.type] = { count: 0, totalAmount: 0 };
      typeMap[tx.type].count++;
      typeMap[tx.type].totalAmount += tx.amount;
    }

    // Specific type totals for the stats bar
    const signupBonuses    = Math.abs(typeMap['signup_bonus']?.totalAmount    ?? 0);
    const purchased        = Math.abs(typeMap['purchase']?.totalAmount        ?? 0);
    const referralBonuses  = Math.abs(typeMap['referral_bonus']?.totalAmount  ?? 0);
    const adminGrants      = Math.abs(typeMap['admin_grant']?.totalAmount     ?? 0);

    const stats: CreditLedgerStats = {
      totalIssued,
      totalConsumed,
      netCreditsInCirculation: totalBalance,
      avgBalancePerUser:       avgBalance,
      totalSignupBonuses:      signupBonuses,
      totalPurchased:          purchased,
      totalReferralBonuses:    referralBonuses,
      totalAdminGrants:        adminGrants,
    };

    const typeCounts = Object.entries(typeMap).map(([type, data]) => ({
      type,
      count:       data.count,
      totalAmount: data.totalAmount,
    }));

    return NextResponse.json({ stats, typeCounts });
  } catch (err) {
    console.error('[credits/stats] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load credit stats' },
      { status: 500 },
    );
  }
}