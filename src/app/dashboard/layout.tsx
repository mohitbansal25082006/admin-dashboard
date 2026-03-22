// Admin-Dashboard/src/app/dashboard/layout.tsx
// Part 31B — Dashboard layout.
//
// INFINITE REDIRECT LOOP FIX:
// Reads the 'deepdive-admin-token' httpOnly cookie (set by /api/admin/set-session)
// and validates it using the service role client. No @supabase/ssr dependency.

import { redirect }      from 'next/navigation';
import { cookies }       from 'next/headers';
import { getAdminClient } from '@/lib/supabase-admin';
import { Sidebar }       from '@/components/admin/Sidebar';

const ADMIN_COOKIE = 'deepdive-admin-token';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(ADMIN_COOKIE)?.value ?? null;

  if (!token) return null;

  // Basic JWT format check before making a network call
  if (!token.startsWith('eyJ') || token.split('.').length !== 3) return null;

  try {
    const admin = getAdminClient();

    // Verify the JWT and get the user (validates signature + expiry)
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    // Check is_admin flag using service role (bypasses RLS)
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, full_name, account_status')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin)                     return null;
    if (profile.account_status === 'suspended') return null;

    return {
      id:       user.id,
      email:    user.email ?? '',
      fullName: profile.full_name ?? null,
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    redirect('/login?error=unauthorized');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080810]">
      <Sidebar adminEmail={adminUser.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}