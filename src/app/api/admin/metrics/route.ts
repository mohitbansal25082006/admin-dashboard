// Admin-Dashboard/src/app/api/admin/metrics/route.ts
// Part 31B — Platform-wide metrics for the overview dashboard.
//
// FIXED (TS2739): Supabase query builder returns PromiseLike, not Promise.
// PromiseLike only has .then() — no .catch()/.finally()/[Symbol.toStringTag].
// The previous version passed query builders into helper functions typed as
// () => Promise<...>, which TypeScript correctly rejected.
//
// Solution: await every Supabase query directly inside its own try/catch block.
// No helper wrappers — each query is self-contained and silently returns 0 on error.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { PlatformMetrics } from '@/types/admin';

// Maps known pack sizes (credits_to_add) → INR price for schema without amount column
const CREDITS_TO_INR: Record<number, number> = {
  50: 99, 170: 249, 400: 499, 1200: 999,
};
function orderToINR(o: any): number {
  if (o.amount && Number(o.amount) > 0) return Math.round(Number(o.amount) / 100);
  return CREDITS_TO_INR[Number(o.credits_to_add ?? 0)] ?? 0;
}

// ── Direct-query fallback (used when RPC fails) ────────────────────────────────
// Every block is individually try/caught. A failure in one block returns 0
// for that metric and lets all others succeed.

async function fetchMetricsDirect(
  admin: ReturnType<typeof getAdminClient>,
): Promise<PlatformMetrics> {

  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // ── Users ──────────────────────────────────────────────────────────────────
  let totalUsers = 0, newUsersToday = 0, newUsersThisMonth = 0;
  try {
    const { data } = await admin.from('profiles').select('created_at');
    const rows = data ?? [];
    totalUsers        = rows.length;
    newUsersToday     = rows.filter((p: any) => new Date(p.created_at) >= today).length;
    newUsersThisMonth = rows.filter((p: any) => new Date(p.created_at) >= monthStart).length;
  } catch { /* stays 0 */ }

  // ── Reports ────────────────────────────────────────────────────────────────
  let totalReports = 0, reportsToday = 0;
  try {
    const { data } = await admin
      .from('research_reports')
      .select('created_at')
      .eq('status', 'completed');
    const rows = data ?? [];
    totalReports = rows.length;
    reportsToday = rows.filter((r: any) => new Date(r.created_at) >= today).length;
  } catch { /* stays 0 */ }

  // ── Credit totals ──────────────────────────────────────────────────────────
  let totalCreditsIssued = 0, totalCreditsConsumed = 0;
  try {
    const { data } = await admin
      .from('user_credits')
      .select('total_purchased, total_consumed');
    for (const c of data ?? []) {
      totalCreditsIssued   += Number(c.total_purchased ?? 0);
      totalCreditsConsumed += Number(c.total_consumed  ?? 0);
    }
  } catch { /* stays 0 */ }

  // ── Credits consumed today / this month ────────────────────────────────────
  let creditsConsumedToday = 0, creditsConsumedMonth = 0;
  try {
    const { data } = await admin
      .from('credit_transactions')
      .select('amount, created_at')
      .eq('type', 'consume');
    for (const t of data ?? []) {
      const abs = Math.abs(Number(t.amount ?? 0));
      const dt  = new Date(t.created_at);
      if (dt >= today)      creditsConsumedToday  += abs;
      if (dt >= monthStart) creditsConsumedMonth  += abs;
    }
  } catch { /* stays 0 */ }

  // ── Revenue from Razorpay ──────────────────────────────────────────────────
  let totalRevenueInr = 0, revenueTodayInr = 0, revenueMonthInr = 0;
  try {
    const { data } = await admin.from('razorpay_orders').select('*');
    for (const o of data ?? []) {
      if (o.status !== 'paid') continue;
      const inr = orderToINR(o);
      const dt  = new Date(o.paid_at ?? o.created_at);
      totalRevenueInr += inr;
      if (dt >= today)      revenueTodayInr  += inr;
      if (dt >= monthStart) revenueMonthInr  += inr;
    }
  } catch { /* stays 0 */ }

  // ── Optional tables ────────────────────────────────────────────────────────
  let activeWorkspaces = 0;
  try {
    const { count } = await admin
      .from('workspaces')
      .select('*', { count: 'exact', head: true });
    activeWorkspaces = count ?? 0;
  } catch { /* stays 0 */ }

  let totalPodcasts = 0;
  try {
    const { count } = await admin
      .from('podcasts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    totalPodcasts = count ?? 0;
  } catch { /* stays 0 */ }

  let totalDebates = 0;
  try {
    const { count } = await admin
      .from('debate_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');
    totalDebates = count ?? 0;
  } catch { /* stays 0 */ }

  let totalAcademicPapers = 0;
  try {
    const { count } = await admin
      .from('academic_papers')
      .select('*', { count: 'exact', head: true });
    totalAcademicPapers = count ?? 0;
  } catch { /* stays 0 */ }

  return {
    totalUsers,
    newUsersToday,
    newUsersThisMonth,
    totalReports,
    reportsToday,
    totalCreditsIssued,
    totalCreditsConsumed,
    creditsConsumedToday,
    creditsConsumedMonth,
    totalRevenueInr,
    revenueTodayInr,
    revenueMonthInr,
    activeWorkspaces,
    totalPodcasts,
    totalDebates,
    totalAcademicPapers,
  };
}

// ── Route handler ──────────────────────────────────────────────────────────────

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

    // ── Try RPC first (fast single call after schema_patch_part31_fix.sql) ───
    const { data: rpcData, error: rpcError } = await admin.rpc('get_platform_metrics');

    if (!rpcError && rpcData) {
      const raw = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (raw && typeof raw === 'object') {
        const metrics: PlatformMetrics = {
          totalUsers:           Number(raw.total_users              ?? 0),
          newUsersToday:        Number(raw.new_users_today          ?? 0),
          newUsersThisMonth:    Number(raw.new_users_this_month     ?? 0),
          totalReports:         Number(raw.total_reports            ?? 0),
          reportsToday:         Number(raw.reports_today            ?? 0),
          totalCreditsIssued:   Number(raw.total_credits_issued     ?? 0),
          totalCreditsConsumed: Number(raw.total_credits_consumed   ?? 0),
          creditsConsumedToday: Number(raw.credits_consumed_today   ?? 0),
          creditsConsumedMonth: Number(raw.credits_consumed_month   ?? 0),
          totalRevenueInr:      Number(raw.total_revenue_inr        ?? 0),
          revenueTodayInr:      Number(raw.revenue_today_inr        ?? 0),
          revenueMonthInr:      Number(raw.revenue_month_inr        ?? 0),
          activeWorkspaces:     Number(raw.active_workspaces        ?? 0),
          totalPodcasts:        Number(raw.total_podcasts           ?? 0),
          totalDebates:         Number(raw.total_debates            ?? 0),
          totalAcademicPapers:  Number(raw.total_academic_papers    ?? 0),
        };
        return NextResponse.json(metrics);
      }
    }

    // ── RPC failed → direct per-table queries (works before SQL patch) ────────
    console.warn('[metrics] RPC unavailable, using direct queries:', rpcError?.message);
    const metrics = await fetchMetricsDirect(admin);
    return NextResponse.json(metrics);

  } catch (err) {
    console.error('[metrics] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load metrics' },
      { status: 500 },
    );
  }
}