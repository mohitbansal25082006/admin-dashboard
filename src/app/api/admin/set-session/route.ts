// Admin-Dashboard/src/app/api/admin/set-session/route.ts
// Part 31 — Sets an httpOnly server-side cookie after successful admin login.
//
// WHY THIS EXISTS:
// @supabase/ssr's createBrowserClient has a known bug on some environments
// (localhost + Node 20 + Turbopack) where signInWithPassword succeeds and
// returns a session, but does NOT write the auth cookie to document.cookie.
// The proxy sees no cookie, redirects to /login — infinite loop.
//
// SOLUTION: After login + verify (is_admin confirmed), the browser POSTs the
// access_token here. This route sets a proper httpOnly cookie via Set-Cookie
// response header — guaranteed to work, no browser quirks involved.
// The proxy and layout read ONLY this cookie for auth decisions.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

export const ADMIN_COOKIE = 'deepdive-admin-token';
const COOKIE_MAX_AGE      = 60 * 60 * 8; // 8 hours

export async function POST(request: NextRequest) {
  let body: { access_token: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { access_token } = body;
  if (!access_token?.trim()) {
    return NextResponse.json({ error: 'access_token required' }, { status: 400 });
  }

  // Re-verify token and is_admin before setting cookie — double check security
  try {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(access_token);

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, account_status')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: 'Access denied. This account does not have admin privileges.' },
        { status: 403 },
      );
    }

    if (profile.account_status === 'suspended') {
      return NextResponse.json({ error: 'Account is suspended.' }, { status: 403 });
    }

    // Verified — set httpOnly cookie via response header (always works)
    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE, access_token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   COOKIE_MAX_AGE,
      path:     '/',
    });

    return response;
  } catch (err) {
    console.error('[set-session] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}