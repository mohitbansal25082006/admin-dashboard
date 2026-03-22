// Admin-Dashboard/src/app/api/admin/check-session/route.ts
// Part 31 — Lets the login page check if an active admin session exists.
// The httpOnly cookie can't be read by JS directly, so we check server-side.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const ADMIN_COOKIE = 'deepdive-admin-token';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value ?? null;

  if (!token || !token.startsWith('eyJ')) {
    return NextResponse.json({ active: false }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ active: false }, { status: 401 });
    }

    // Quick is_admin check
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ active: false }, { status: 403 });
    }

    return NextResponse.json({ active: true, userId: user.id });
  } catch {
    return NextResponse.json({ active: false }, { status: 500 });
  }
}