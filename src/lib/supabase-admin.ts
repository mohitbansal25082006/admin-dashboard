// Admin-Dashboard/src/lib/supabase-admin.ts
// Part 31 — Server-side Supabase clients for admin dashboard.
//
// TWO CLIENTS:
//   1. supabaseAdmin  — service role, bypasses RLS, for all data reads/writes
//   2. supabaseAnon   — anon key, subject to RLS, for verifying user sessions
//
// IMPORTANT: supabaseAdmin must NEVER be imported in any client component.
// Only use it in:
//   - Route Handlers (src/app/api/**/*.ts)
//   - Server Components with no 'use client'
//   - middleware.ts
//
// The SUPABASE_SERVICE_ROLE_KEY env var has no NEXT_PUBLIC_ prefix,
// so it is NEVER exposed to the browser.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
}

// ── Service Role Client ────────────────────────────────────────────────────────
// Bypasses ALL Row Level Security. Used only in server-side code.
// Every API route that uses this MUST verify is_admin=true first.

let _adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  if (!_adminClient) {
    _adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _adminClient;
}

// Convenience alias
export const supabaseAdmin = {
  get client() {
    return getAdminClient();
  },
};

// ── Anon Client ───────────────────────────────────────────────────────────────
// Used only to verify session cookies (auth.getUser).
// Subject to RLS — cannot read other users' data.

let _anonClient: SupabaseClient | null = null;

export function getAnonClient(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _anonClient;
}

// ── Helper: Verify admin session from Authorization header ─────────────────────
// Pass the Bearer token from the request.
// Returns { userId, email } if valid admin, or throws.

export async function verifyAdminSession(authHeader: string | null): Promise<{
  userId: string;
  email: string;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the JWT using admin client (can verify any token)
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) {
    throw new Error('UNAUTHORIZED: Invalid or expired session');
  }

  // Check is_admin flag
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('is_admin, account_status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('UNAUTHORIZED: Profile not found');
  }

  if (!profile.is_admin) {
    throw new Error('FORBIDDEN: Not an admin account');
  }

  if (profile.account_status === 'suspended') {
    throw new Error('FORBIDDEN: Admin account is suspended');
  }

  return {
    userId: user.id,
    email: user.email ?? '',
  };
}