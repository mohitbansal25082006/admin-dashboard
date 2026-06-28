// Admin-Dashboard/src/app/dashboard/layout.tsx
// Part 55.13 — Dashboard layout with theme integration and mobile padding fix.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase-admin';
import { Sidebar } from '@/components/admin/Sidebar';

const ADMIN_COOKIE = 'deepdive-admin-token';

async function getAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value ?? null;

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

    if (!profile?.is_admin) return null;
    if (profile.account_status === 'suspended') return null;

    return {
      id: user.id,
      email: user.email ?? '',
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar adminEmail={adminUser.email} />
      <main 
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 md:pt-6 md:pb-6">
          {/* Add extra top padding on mobile to account for the hamburger menu */}
          <div className="md:hidden h-14" /> {/* Spacer for mobile menu button */}
          {children}
        </div>
      </main>
    </div>
  );
}