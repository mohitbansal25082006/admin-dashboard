// Admin-Dashboard/src/app/api/admin/users/status/route.ts
// Part 31B — Set account status (active / suspended / flagged).

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

  let body: { userId: string; status: string; reason: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, status, reason } = body;

  if (!userId)          return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  if (!status)          return NextResponse.json({ error: 'status is required' }, { status: 400 });
  if (!reason?.trim())  return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  if (!['active', 'suspended', 'flagged'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  // Prevent admin from suspending themselves
  if (userId === adminId && status === 'suspended') {
    return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();

    const { data, error } = await admin.rpc('admin_set_account_status', {
      p_admin_id:   adminId,
      p_user_id:    userId,
      p_new_status: status,
      p_reason:     reason.trim(),
    });

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (err) {
    console.error('[users/status] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status update failed' },
      { status: 500 },
    );
  }
}