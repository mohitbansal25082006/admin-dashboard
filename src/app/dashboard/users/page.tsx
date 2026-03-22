'use client';
// Admin-Dashboard/src/app/dashboard/users/page.tsx
// Part 31B — User management page.

import { Header }    from '@/components/admin/Header';
import { UserTable } from '@/components/admin/UserTable';

export default function UsersPage() {
  return (
    <div>
      <Header
        title="User Management"
        subtitle="View, search, and manage all registered users"
      />
      <UserTable />
    </div>
  );
}