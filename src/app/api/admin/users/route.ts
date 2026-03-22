// Admin-Dashboard/src/app/api/admin/users/route.ts
// Part 31B — Paginated, searchable, sortable user list for admin.
// Uses service role to join auth.users + profiles + user_credits + research_reports.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { AdminUserRow, AccountStatus, PaginatedResponse } from '@/types/admin';

export async function GET(request: NextRequest) {
  try {
    await verifyAdminSession(request.headers.get('authorization'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { searchParams } = request.nextUrl;
  const search   = searchParams.get('search')   ?? '';
  const status   = searchParams.get('status')   ?? 'all';
  const sortBy   = searchParams.get('sortBy')   ?? 'created_at';
  const sortDir  = searchParams.get('sortDir')  ?? 'desc';
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1', 10));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '15', 10));

  try {
    const admin = getAdminClient();

    // ── Build query: profiles joined with user_credits and report counts ──────
    // We read from profiles (which has is_admin, account_status, avatar_url etc.)
    // and LEFT JOIN user_credits for balance data.

    // 1. Get profiles with optional search + status filter
    let profileQuery = admin
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        is_admin,
        account_status,
        created_at,
        updated_at
      `);

    if (status !== 'all') {
      profileQuery = profileQuery.eq('account_status', status);
    }

    const { data: allProfiles, error: profilesError } = await profileQuery;

    if (profilesError) throw new Error(profilesError.message);

    const profiles = allProfiles ?? [];

    // 2. Get auth.users for emails — service role can access auth schema
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({
      perPage: 1000,
      page: 1,
    });

    if (authError) throw new Error(authError.message);

    // Build email map
    const emailMap: Record<string, string> = {};
    const lastSignInMap: Record<string, string> = {};
    for (const u of authUsers.users) {
      emailMap[u.id]       = u.email ?? '';
      lastSignInMap[u.id]  = u.last_sign_in_at ?? '';
    }

    // 3. Get user_credits
    const { data: creditsData } = await admin
      .from('user_credits')
      .select('user_id, balance, total_purchased, total_consumed');

    const creditsMap: Record<string, { balance: number; purchased: number; consumed: number }> = {};
    for (const c of (creditsData ?? [])) {
      creditsMap[c.user_id] = {
        balance:   c.balance   ?? 0,
        purchased: c.total_purchased ?? 0,
        consumed:  c.total_consumed  ?? 0,
      };
    }

    // 4. Get report counts per user
    const { data: reportCounts } = await admin
      .from('research_reports')
      .select('user_id')
      .eq('status', 'completed');

    const reportCountMap: Record<string, number> = {};
    for (const r of (reportCounts ?? [])) {
      reportCountMap[r.user_id] = (reportCountMap[r.user_id] ?? 0) + 1;
    }

    // 5. Assemble rows
    let rows: AdminUserRow[] = profiles.map((p) => ({
      id:             p.id,
      email:          emailMap[p.id]        ?? '',
      fullName:       p.full_name           ?? null,
      username:       p.username            ?? null,
      avatarUrl:      p.avatar_url          ?? null,
      accountStatus:  (p.account_status     ?? 'active') as AccountStatus,
      isAdmin:        p.is_admin            ?? false,
      createdAt:      p.created_at,
      creditBalance:  creditsMap[p.id]?.balance   ?? 0,
      totalPurchased: creditsMap[p.id]?.purchased ?? 0,
      totalConsumed:  creditsMap[p.id]?.consumed  ?? 0,
      totalReports:   reportCountMap[p.id]         ?? 0,
      lastActiveAt:   lastSignInMap[p.id]          ?? null,
    }));

    // 6. Apply search filter (name or email)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          (r.fullName?.toLowerCase() ?? '').includes(q) ||
          (r.username?.toLowerCase() ?? '').includes(q),
      );
    }

    // 7. Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      switch (sortBy) {
        case 'balance':        return dir * (a.creditBalance  - b.creditBalance);
        case 'total_reports':  return dir * (a.totalReports   - b.totalReports);
        case 'total_consumed': return dir * (a.totalConsumed  - b.totalConsumed);
        default: // created_at
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });

    // 8. Paginate
    const total      = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = rows.slice(start, start + pageSize);

    const response: PaginatedResponse<AdminUserRow> = {
      data:       paged,
      total,
      page,
      pageSize,
      totalPages,
      error:      null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[users] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load users' },
      { status: 500 },
    );
  }
}