// Admin-Dashboard/src/app/api/admin/verify/route.ts
// Part 31 — Verifies that the caller is an authenticated admin.
// Called by the login page after signIn() succeeds, to confirm is_admin = true.
// Uses service role to bypass RLS when reading the profiles table.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { userId, email } = await verifyAdminSession(authHeader);

    return NextResponse.json({
      success: true,
      userId,
      email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';

    if (message.startsWith('UNAUTHORIZED')) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('FORBIDDEN')) {
      return NextResponse.json(
        { error: 'Access denied. This account does not have admin privileges.' },
        { status: 403 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}