// Admin-Dashboard/src/app/api/admin/credits/route.ts
// Part 31C — Paginated platform-wide credit transaction ledger.
// Joins credit_transactions with user emails for display.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { CreditTransactionRow, PaginatedResponse } from '@/types/admin';

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
  const type     = searchParams.get('type')     ?? 'all';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo   = searchParams.get('dateTo')   ?? '';
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1', 10));
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') ?? '20', 10));

  try {
    const admin = getAdminClient();

    // ── Build query ────────────────────────────────────────────────────────────
    let query = admin
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (type !== 'all') {
      query = query.eq('type', type);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom + 'T00:00:00.000Z');
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo   + 'T23:59:59.999Z');
    }

    const { data: txRows, error: txError } = await query;
    if (txError) throw new Error(txError.message);

    let rows = txRows ?? [];

    // ── Fetch user info (emails + names) ──────────────────────────────────────
    const uniqueUserIds = [...new Set(rows.map((r: any) => r.user_id))];
    const emailMap:   Record<string, string> = {};
    const nameMap:    Record<string, string> = {};

    if (uniqueUserIds.length > 0) {
      // Get emails from auth.users
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of (authUsers?.users ?? [])) {
        emailMap[u.id] = u.email ?? '';
      }

      // Get names from profiles
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, username')
        .in('id', uniqueUserIds.slice(0, 500) as string[]);

      for (const p of (profiles ?? [])) {
        nameMap[p.id] = p.full_name ?? p.username ?? '';
      }
    }

    // ── Apply search filter (by email) ────────────────────────────────────────
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r: any) => {
        const email = emailMap[r.user_id] ?? '';
        return email.toLowerCase().includes(q);
      });
    }

    // ── Paginate ──────────────────────────────────────────────────────────────
    const total      = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = rows.slice(start, start + pageSize);

    // ── Map rows ──────────────────────────────────────────────────────────────
    const mapped: CreditTransactionRow[] = paged.map((tx: any) => ({
      id:           tx.id,
      userId:       tx.user_id,
      userEmail:    emailMap[tx.user_id]    ?? null,
      userName:     nameMap[tx.user_id]     ?? null,
      type:         tx.type,
      amount:       tx.amount,
      balanceAfter: tx.balance_after,
      feature:      tx.feature    ?? null,
      packId:       tx.pack_id    ?? null,
      orderId:      tx.order_id   ?? null,
      description:  tx.description ?? '',
      createdAt:    tx.created_at,
    }));

    const response: PaginatedResponse<CreditTransactionRow> = {
      data: mapped, total, page, pageSize, totalPages, error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[credits] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load transactions' },
      { status: 500 },
    );
  }
}