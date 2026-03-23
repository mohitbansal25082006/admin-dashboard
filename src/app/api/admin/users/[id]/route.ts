// Admin-Dashboard/src/app/api/admin/users/[id]/route.ts
// Part 31B — Get full user detail (GET) or permanently delete user (DELETE).
//
// Part 32 UPDATE — DELETE now sets account_status = 'deleted' BEFORE deleting
// the auth user. This is the only reliable way to show the AccountDeletedScreen
// in the app in real-time.
//
// WHY the old approach (relying on profiles DELETE Realtime event) didn't work:
//   When auth.admin.deleteUser() is called, Supabase deletes the auth.users row
//   first, which immediately invalidates the user's JWT. By the time the cascade
//   reaches profiles and fires the DELETE postgres_changes event, the user's
//   Realtime connection has already been dropped (their token is invalid).
//   Result: the DELETE event is never delivered to the app.
//
// NEW flow:
//   1. UPDATE profiles SET account_status = 'deleted'
//      → Realtime delivers UPDATE event to the app while JWT still valid
//      → AuthContext sees account_status === 'deleted'
//      → app shows <AccountDeletedScreen /> immediately
//   2. Wait 800ms (gives Realtime time to deliver)
//   3. DELETE auth user (cascades data, invalidates JWT)
//   4. App receives SIGNED_OUT but accountDeletedRef is already true → no redirect
//
// All Part 31 GET logic preserved unchanged.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { AdminUserDetail } from '@/types/admin';

// ── GET — full user detail ────────────────────────────────────────────────────

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

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: { user: authUser } } = await admin.auth.admin.getUserById(id);

    const { data: credits } = await admin
      .from('user_credits')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    const { count: reportCount } = await admin
      .from('research_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .eq('status', 'completed');

    let podcastCount = 0;
    try {
      const { count } = await admin
        .from('podcasts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'completed');
      podcastCount = count ?? 0;
    } catch {}

    let debateCount = 0;
    try {
      const { count } = await admin
        .from('debate_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'completed');
      debateCount = count ?? 0;
    } catch {}

    let presentationCount = 0;
    try {
      const { count } = await admin
        .from('presentations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      presentationCount = count ?? 0;
    } catch {}

    let paperCount = 0;
    try {
      const { count } = await admin
        .from('academic_papers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);
      paperCount = count ?? 0;
    } catch {}

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
      totalPresentations:  presentationCount,
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

// ── DELETE — permanently delete user ─────────────────────────────────────────

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

  if (id === adminId) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', id)
      .single();

    if (profile?.is_admin) {
      return NextResponse.json({ error: 'Cannot delete another admin account' }, { status: 403 });
    }

    // ── Step 1: Audit log BEFORE deletion ─────────────────────────────────────
    // Must happen first so we have a record.
    await admin.from('admin_audit_log').insert({
      admin_user_id:  adminId,
      target_user_id: id,
      action:         'delete_user',
      resource_type:  'user',
      resource_id:    id,
      before_value:   { full_name: profile?.full_name ?? null },
      reason:         `Deleted by admin ${adminEmail}`,
    });

    // ── Step 2: Set account_status = 'deleted' on the profiles row ────────────
    //
    // This is the KEY STEP that makes the in-app deletion screen work.
    //
    // Because the user's Supabase Realtime channel is authenticated with their
    // JWT, it can only receive events while the JWT is valid. If we delete the
    // auth user first (Step 3), the JWT is immediately invalidated and Realtime
    // drops the connection BEFORE the profiles cascade-delete event fires.
    //
    // By setting account_status = 'deleted' first (an UPDATE, not a DELETE),
    // Supabase Realtime delivers the event while the JWT is still valid.
    // The app's AuthContext receives the UPDATE, sees 'deleted' status, sets
    // accountDeleted = true, and shows <AccountDeletedScreen />.
    //
    // The subsequent auth.admin.deleteUser() (Step 3) then fires SIGNED_OUT,
    // which the app handles gracefully because accountDeletedRef is already true.

    const { error: statusError } = await admin
      .from('profiles')
      .update({ account_status: 'deleted' })
      .eq('id', id);

    if (statusError) {
      // Non-fatal — log but proceed. The deletion still works; the in-app
      // screen may not show in real-time but the account is deleted.
      console.warn('[users/id] Could not set account_status=deleted:', statusError.message);
    }

    // ── Step 3: Wait for Realtime to deliver the UPDATE event ────────────────
    // 800ms is enough for the Realtime pipeline (typically <200ms on Supabase).
    // This is a best-effort delay — we proceed regardless.
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    // ── Step 4: Delete from auth.users (cascades profiles + all user data) ───
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