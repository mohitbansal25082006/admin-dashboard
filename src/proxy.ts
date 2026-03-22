// Admin-Dashboard/src/proxy.ts
// Part 31 — Route protection proxy.
//
// INFINITE REDIRECT LOOP FIX:
// Now reads ONLY the 'deepdive-admin-token' httpOnly cookie set by
// /api/admin/set-session. This cookie is set via Set-Cookie response header
// on the server — always reliable, no @supabase/ssr browser quirks.
//
// Previous version used createServerClient from @supabase/ssr to read cookies,
// but @supabase/ssr's createBrowserClient sometimes fails to write the auth
// cookie to document.cookie on localhost + Turbopack, so the server always
// saw an empty cookie store → infinite redirect to /login.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ADMIN_COOKIE   = 'deepdive-admin-token';
const PUBLIC_PREFIXES = ['/login', '/api/admin/verify', '/api/admin/set-session', '/api/admin/clear-session', '/api/admin/check-session', '/_next', '/favicon'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Always allow public paths ──────────────────────────────────────────────
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || pathname === '/') {
    return NextResponse.next();
  }

  // ── Only gate /dashboard/* and /api/admin/* ────────────────────────────────
  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // ── Read our httpOnly cookie ───────────────────────────────────────────────
  const token = request.cookies.get(ADMIN_COOKIE)?.value ?? null;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Validate the token ─────────────────────────────────────────────────────
  // Light validation: check the token is a valid JWT format first (avoids
  // unnecessary Supabase API calls for obviously invalid tokens).
  if (!token.startsWith('eyJ') || token.split('.').length !== 3) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(ADMIN_COOKIE);
    return res;
  }

  // Verify the JWT with Supabase (validates signature + expiry)
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('reason', 'session_expired');
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(ADMIN_COOKIE); // clear expired cookie
      return res;
    }

    // Valid — pass through
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Auth error' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/admin/:path*',
  ],
};