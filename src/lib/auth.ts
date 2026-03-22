'use client';
// Admin-Dashboard/src/lib/auth.ts
// Part 31 — Client-side auth helpers.
//
// INFINITE REDIRECT LOOP FIX:
// Root cause: @supabase/ssr's createBrowserClient has a known bug on some
// environments (localhost + Node 20 + Turbopack) where signInWithPassword
// returns a valid session but does NOT write the auth cookie to document.cookie.
// The proxy/layout see no cookie → redirect to /login → loop.
//
// Fix strategy:
//   1. Sign in with Supabase (browser-only, for the session token)
//   2. Verify is_admin via /api/admin/verify (uses Authorization header)
//   3. POST the access_token to /api/admin/set-session which sets a proper
//      httpOnly cookie via Set-Cookie header — guaranteed to work server-side
//   4. Proxy and layout now read ONLY that cookie — no @supabase/ssr dependency
//
// For getSessionToken() (used by adminFetch for API calls), we still use
// @supabase/ssr's createBrowserClient — that's fine for client-side fetch,
// only the server-side cookie path was broken.

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ── Login ──────────────────────────────────────────────────────────────────────

export async function adminSignIn(email: string, password: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  // Step 1: Sign in with Supabase to get the session token
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return {
      success: false,
      error: error?.message ?? 'Login failed. Check your email and password.',
    };
  }

  const { access_token } = data.session;

  // Step 2: Verify is_admin using the token in Authorization header
  try {
    const verifyRes = await fetch('/api/admin/verify', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!verifyRes.ok) {
      await supabaseBrowser.auth.signOut();
      const body = await verifyRes.json().catch(() => ({}));
      return {
        success: false,
        error: body.error ?? 'Access denied. This account does not have admin privileges.',
      };
    }
  } catch {
    await supabaseBrowser.auth.signOut();
    return { success: false, error: 'Could not verify admin access. Please try again.' };
  }

  // Step 3: Set the httpOnly server-side cookie — THIS is what the proxy reads.
  // We bypass @supabase/ssr's broken cookie writing by having the server set it.
  try {
    const sessionRes = await fetch('/api/admin/set-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ access_token }),
    });

    if (!sessionRes.ok) {
      await supabaseBrowser.auth.signOut();
      const body = await sessionRes.json().catch(() => ({}));
      return { success: false, error: body.error ?? 'Session setup failed.' };
    }
  } catch {
    await supabaseBrowser.auth.signOut();
    return { success: false, error: 'Session cookie could not be set. Please try again.' };
  }

  return { success: true, error: null };
}

// ── Logout ─────────────────────────────────────────────────────────────────────

export async function adminSignOut(): Promise<void> {
  // Clear both: Supabase browser session + our httpOnly cookie
  await Promise.allSettled([
    supabaseBrowser.auth.signOut(),
    fetch('/api/admin/clear-session', { method: 'POST' }),
  ]);
}

// ── Get current session token ──────────────────────────────────────────────────
// Used by client components to attach Authorization header to API fetch calls.
// This reads from @supabase/ssr's client storage — fine for browser fetch calls.

export async function getSessionToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
}

// ── Check if admin cookie is present (for login page redirect check) ──────────
// Since the cookie is httpOnly, JS can't read it. We check via a lightweight
// server ping instead.

export async function isAdminSessionActive(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/check-session', { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Authenticated fetch helper ─────────────────────────────────────────────────
// For API calls from client components to /api/admin/* routes.
// The httpOnly cookie is sent automatically by the browser with every fetch.
// We also attach the Authorization header as a backup.

export async function adminFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  // Get token for Authorization header (backup auth method for API routes)
  const token = await getSessionToken();

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'same-origin', // ensure cookies are sent
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: json.error ?? `Request failed: ${res.status}` };
    }

    return { data: json as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}