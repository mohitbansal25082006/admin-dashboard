// Admin-Dashboard/src/app/api/admin/users/credits/route.ts
// Part 31B — Manually adjust credits for a user (add or deduct).

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  let adminId: string;
  try {
    const session = await verifyAdminSession(request.headers.get('authorization'));
    adminId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  let body: { userId: string; amount: number; reason: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, amount, reason } = body;

  if (!userId)              return NextResponse.json({ error: 'userId is required' },  { status: 400 });
  if (!amount || amount === 0) return NextResponse.json({ error: 'amount must be non-zero' }, { status: 400 });
  if (!reason?.trim())     return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  try {
    const admin = getAdminClient();

    const { data, error } = await admin.rpc('admin_adjust_credits', {
      p_admin_id: adminId,
      p_user_id:  userId,
      p_amount:   Math.round(amount),
      p_reason:   reason.trim(),
    });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    console.error('[users/credits] Error:', err);
    const msg = err instanceof Error ? err.message : 'Credit adjustment failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}