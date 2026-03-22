// Admin-Dashboard/src/app/api/admin/metrics/activity/route.ts
// Part 31B — Returns 7-day activity data for the overview chart.
//
// FIXED: No longer depends on get_7day_activity() RPC (which requires
// schema_part31.sql to be run first). Now queries research_reports and
// profiles directly, so it works in any schema state.
// Falls back to empty data gracefully if any table is inaccessible.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { DailyActivity } from '@/types/admin';

export async function GET(request: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────────
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

    // Build last-7-days date range
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const rangeStart = days[0] + 'T00:00:00.000Z';

    // ── New users per day ─────────────────────────────────────────────────────
    const userCountMap: Record<string, number> = {};
    days.forEach(d => { userCountMap[d] = 0; });

    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('created_at')
        .gte('created_at', rangeStart);

      for (const p of profiles ?? []) {
        const day = String(p.created_at).slice(0, 10);
        if (day in userCountMap) userCountMap[day]++;
      }
    } catch { /* table missing or inaccessible — stays 0 */ }

    // ── Completed reports per day ─────────────────────────────────────────────
    const reportCountMap: Record<string, number> = {};
    days.forEach(d => { reportCountMap[d] = 0; });

    try {
      const { data: reports } = await admin
        .from('research_reports')
        .select('created_at')
        .eq('status', 'completed')
        .gte('created_at', rangeStart);

      for (const r of reports ?? []) {
        const day = String(r.created_at).slice(0, 10);
        if (day in reportCountMap) reportCountMap[day]++;
      }
    } catch { /* table missing — stays 0 */ }

    // ── Assemble response ─────────────────────────────────────────────────────
    const activity: DailyActivity[] = days.map(day => ({
      day,
      newUsers:   userCountMap[day]  ?? 0,
      newReports: reportCountMap[day] ?? 0,
    }));

    return NextResponse.json(activity);

  } catch (err) {
    console.error('[metrics/activity] Error:', err);
    // Return empty 7-day data instead of crashing the chart
    const fallback: DailyActivity[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: d.toISOString().slice(0, 10), newUsers: 0, newReports: 0 };
    });
    return NextResponse.json(fallback);
  }
}