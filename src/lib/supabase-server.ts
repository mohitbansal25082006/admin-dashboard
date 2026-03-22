// Admin-Dashboard/src/lib/supabase-server.ts
// Part 31 — Server-side Supabase client using @supabase/ssr.
//
// Use this in Server Components and Route Handlers to read the user session
// from cookies (set by createBrowserClient on the client side).
//
// Do NOT use this in client components — use auth.ts → supabaseBrowser instead.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client for Server Components.
 * Reads the session from cookies automatically.
 * Call once per request — do not cache across requests.
 */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components cannot set cookies — silently ignore.
        // Cookie refresh happens in the proxy (proxy.ts) instead.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Expected in Server Components — not an error.
        }
      },
    },
  });
}