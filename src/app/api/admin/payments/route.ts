// Admin-Dashboard/src/app/api/admin/payments/route.ts
// Part 32 UPDATE — Live orders only. Test orders permanently excluded.
// The showTest toggle was removed — this route never returns is_test = true rows.

const CREDITS_TO_INR: Record<number, number> = {
  50: 99, 170: 249, 400: 499, 1200: 999,
};
function orderToINR(o: any): number {
  if (o.amount && Number(o.amount) > 0) return Math.round(Number(o.amount) / 100);
  return CREDITS_TO_INR[Number(o.credits_to_add ?? 0)] ?? 0;
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { PaymentRow, RazorpayOrderStatus, PaginatedResponse } from '@/types/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminSession(request.headers.get('authorization'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { searchParams } = request.nextUrl;
  const search   = searchParams.get('search')   ?? '';
  const status   = searchParams.get('status')   ?? 'all';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo   = searchParams.get('dateTo')   ?? '';
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20', 10));

  try {
    const admin = getAdminClient();

    // Always exclude test orders — live data only
    let query = admin
      .from('razorpay_orders')
      .select('*')
      .or('is_test.eq.false,is_test.is.null')   // treat NULL (pre-Part32 rows) as live
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom + 'T00:00:00.000Z');
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z');
    }

    const { data: orderRows, error: ordersError } = await query;
    if (ordersError) throw new Error(ordersError.message);

    let rows = orderRows ?? [];

    // Fetch user info
    const uniqueUserIds = [...new Set(rows.map((r: any) => r.user_id))];
    const emailMap: Record<string, string> = {};
    const nameMap:  Record<string, string> = {};

    if (uniqueUserIds.length > 0) {
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of (authUsers?.users ?? [])) {
        emailMap[u.id] = u.email ?? '';
      }
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, username')
        .in('id', uniqueUserIds.slice(0, 500) as string[]);
      for (const p of (profiles ?? [])) {
        nameMap[p.id] = p.full_name ?? p.username ?? '';
      }
    }

    // Apply search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r: any) => {
        const email   = emailMap[r.user_id]   ?? '';
        const orderId = r.razorpay_order_id   ?? '';
        return email.toLowerCase().includes(q) || orderId.toLowerCase().includes(q);
      });
    }

    const total      = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = rows.slice(start, start + pageSize);

    const mapped: PaymentRow[] = paged.map((o: any) => ({
      id:              o.id,
      userId:          o.user_id,
      userEmail:       emailMap[o.user_id] ?? null,
      userName:        nameMap[o.user_id]  ?? null,
      packId:          o.pack_id,
      razorpayOrderId: o.razorpay_order_id,
      paymentId:       o.payment_id        ?? null,
      amount:          o.amount            ?? null,
      amountInr:       orderToINR(o),
      status:          (o.status           ?? 'created') as RazorpayOrderStatus,
      creditsToAdd:    o.credits_to_add    ?? 0,
      isTest:          false,              // always false — test orders excluded
      createdAt:       o.created_at,
      paidAt:          o.paid_at           ?? null,
    }));

    const response: PaginatedResponse<PaymentRow> = {
      data: mapped, total, page, pageSize, totalPages, error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[payments] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load payments' },
      { status: 500 },
    );
  }
}