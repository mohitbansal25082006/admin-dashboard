// Admin-Dashboard/src/app/api/admin/users/[id]/route.ts
// Part 31B — Get full user detail (GET) or permanently delete user (DELETE).

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { AdminUserDetail } from '@/types/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let adminId: string;
  try {
    const session = await verifyAdminSession(request.headers.get('authorization'));
    adminId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { id } = await params;

  try {
    const admin = getAdminClient();

    // Profile
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Auth user (for email)
    const { data: { user: authUser } } = await admin.auth.admin.getUserById(id);

    // Credits
    const { data: credits } = await admin
      .from('user_credits')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    // Report count
    const { count: reportCount } = await admin
      .from('research_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .eq('status', 'completed');

    // Podcast count
    let podcastCount = 0;
    try {
      const { count } = await admin
        .from('podcasts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'completed');
      podcastCount = count ?? 0;
    } catch {}

    // Debate count
    let debateCount = 0;
    try {
      const { count } = await admin
        .from('debate_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'completed');
      debateCount = count ?? 0;
    } catch {}

    // Presentation count
    let presentationCount = 0;
    try {
      const { count } = await admin
        .from('presentations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      presentationCount = count ?? 0;
    } catch {}

    // Academic paper count
    let paperCount = 0;
    try {
      const { count } = await admin
        .from('academic_papers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      paperCount = count ?? 0;
    } catch {}

    // Recent credit transactions
    const { data: transactions } = await admin
      .from('credit_transactions')
      .select('id, type, amount, balance_after, feature, description, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    const detail: AdminUserDetail = {
      id,
      email:          authUser?.email        ?? '',
      fullName:       profile.full_name      ?? null,
      username:       profile.username       ?? null,
      avatarUrl:      profile.avatar_url     ?? null,
      accountStatus:  profile.account_status ?? 'active',
      isAdmin:        profile.is_admin       ?? false,
      createdAt:      profile.created_at,
      bio:            profile.bio            ?? null,
      occupation:     profile.occupation     ?? null,
      interests:      profile.interests      ?? null,
      creditBalance:  credits?.balance         ?? 0,
      totalPurchased: credits?.total_purchased ?? 0,
      totalConsumed:  credits?.total_consumed  ?? 0,
      totalReports:   reportCount ?? 0,
      totalPodcasts:  podcastCount,
      totalDebates:   debateCount,
      totalPresentations: presentationCount,
      totalAcademicPapers: paperCount,
      lastActiveAt:   authUser?.last_sign_in_at ?? null,
      recentTransactions: (transactions ?? []).map((tx: any) => ({
        id:           tx.id,
        userId:       id,
        userEmail:    authUser?.email ?? null,
        userName:     profile.full_name ?? null,
        type:         tx.type,
        amount:       tx.amount,
        balanceAfter: tx.balance_after,
        feature:      tx.feature      ?? null,
        packId:       null,
        orderId:      null,
        description:  tx.description,
        createdAt:    tx.created_at,
      })),
    };

    // Log view to audit log (non-fatal)
    // Wrapped in Promise.resolve() because Supabase returns PromiseLike, not Promise,
    // and PromiseLike does not have a .catch() method.
    void Promise.resolve(
      admin.from('admin_audit_log').insert({
        admin_user_id:  adminId,
        target_user_id: id,
        action:         'view_user',
        resource_type:  'profile',
        resource_id:    id,
      })
    ).catch(() => {});

    return NextResponse.json(detail);
  } catch (err) {
    console.error('[users/id] GET Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load user' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let adminId: string;
  let adminEmail: string;
  try {
    const session = await verifyAdminSession(request.headers.get('authorization'));
    adminId    = session.userId;
    adminEmail = session.email;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === adminId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();

    // Check target is not also an admin
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', id)
      .single();

    if (profile?.is_admin) {
      return NextResponse.json({ error: 'Cannot delete another admin account' }, { status: 403 });
    }

    // Log to audit before deletion (so we have a record)
    await admin.from('admin_audit_log').insert({
      admin_user_id:  adminId,
      target_user_id: id,
      action:         'delete_user',
      resource_type:  'user',
      resource_id:    id,
      before_value:   { full_name: profile?.full_name ?? null },
      reason:         `Deleted by admin ${adminEmail}`,
    });

    // Delete from auth (cascades to profiles via FK)
    const { error: deleteError } = await admin.auth.admin.deleteUser(id);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[users/id] DELETE Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete user' },
      { status: 500 },
    );
  }
}