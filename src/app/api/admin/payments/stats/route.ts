// Admin-Dashboard/src/app/api/admin/payments/stats/route.ts
// Part 31C — Revenue aggregate stats + 30-day daily trend.
//
// FIXED: Uses SELECT * and derives revenue from EITHER:
//   - o.amount (when column exists, paise value)
//   - o.credits_to_add mapped to known INR pack prices (fallback)
// This survives both old and new schema versions without erroring.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { RevenueStats } from '@/types/admin';

// Maps known credits_to_add values → INR price (for schema without amount column)
const CREDITS_TO_INR: Record<number, number> = {
  50:   99,
  170:  249,
  400:  499,
  1200: 999,
};

/** Returns INR value for an order regardless of schema version */
function orderToINR(o: any): number {
  // Preferred: amount column (paise → INR)
  if (o.amount && Number(o.amount) > 0) {
    return Math.round(Number(o.amount) / 100);
  }
  // Fallback: derive from credits_to_add
  const credits = Number(o.credits_to_add ?? 0);
  return CREDITS_TO_INR[credits] ?? 0;
}

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

    // SELECT * so we get whatever columns the table has (amount OR credits_to_add)
    const { data: orders, error: ordersError } = await admin
      .from('razorpay_orders')
      .select('*');

    if (ordersError) throw new Error(ordersError.message);

    const allOrders = (orders ?? []) as any[];

    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidOrders       = allOrders.filter(o => o.status === 'paid');
    const failedOrders     = allOrders.filter(o => o.status === 'failed');
    const totalOrders      = allOrders.length;
    const successfulOrders = paidOrders.length;

    // Revenue totals
    const allTimeInr   = paidOrders.reduce((s, o) => s + orderToINR(o), 0);

    const todayInr = paidOrders
      .filter(o => new Date(o.paid_at ?? o.created_at) >= todayStart)
      .reduce((s, o) => s + orderToINR(o), 0);

    const thisMonthInr = paidOrders
      .filter(o => new Date(o.paid_at ?? o.created_at) >= monthStart)
      .reduce((s, o) => s + orderToINR(o), 0);

    const successRate = totalOrders > 0
      ? (successfulOrders / totalOrders) * 100
      : 0;

    const stats: RevenueStats = {
      todayInr,
      thisMonthInr,
      allTimeInr,
      totalOrders,
      successfulOrders,
      failedOrders: failedOrders.length,
      successRate,
    };

    // ── 30-day daily revenue trend ─────────────────────────────────────────────
    const dailyMap: Record<string, { amount: number; orders: number }> = {};

    // Seed last 30 days with zeros
    for (let i = 29; i >= 0; i--) {
      const d   = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { amount: 0, orders: 0 };
    }

    // Fill in paid order data
    for (const order of paidOrders) {
      const dateStr = String(order.paid_at ?? order.created_at).slice(0, 10);
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].amount += orderToINR(order);
        dailyMap[dateStr].orders += 1;
      }
    }

    const trend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, data]) => ({ day, amount: data.amount, orders: data.orders }));

    return NextResponse.json({ stats, trend });

  } catch (err) {
    console.error('[payments/stats] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load payment stats' },
      { status: 500 },
    );
  }
}