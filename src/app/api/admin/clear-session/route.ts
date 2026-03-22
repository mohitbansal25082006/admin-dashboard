// Admin-Dashboard/src/app/api/admin/clear-session/route.ts
// Part 31 — Clears the admin session cookie on logout.

import { NextResponse } from 'next/server';

const ADMIN_COOKIE = 'deepdive-admin-token';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,   // delete immediately
    path:     '/',
  });
  return response;
}