// Admin-Dashboard/src/app/api/admin/workspaces/[id]/route.ts
// Part 32 — Full workspace detail: info + members + reports.
// GET /api/admin/workspaces/[id]

import { NextRequest, NextResponse }         from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdminSession(request.headers.get('authorization'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { id } = await params;

  try {
    const admin = getAdminClient();

    // ── 1. Workspace row ─────────────────────────────────────────────────────
    const { data: ws, error: wsError } = await admin
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (wsError || !ws) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // ── 2. Owner info ────────────────────────────────────────────────────────
    let ownerEmail = '';
    let ownerName  = '';
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(ws.owner_id);
      ownerEmail = user?.email ?? '';
    } catch {}
    try {
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', ws.owner_id)
        .single();
      ownerName = ownerProfile?.full_name ?? ownerProfile?.username ?? '';
    } catch {}

    // ── 3. Members with their roles ──────────────────────────────────────────
    const { data: memberRows } = await admin
      .from('workspace_members')
      .select('id, user_id, role, joined_at')
      .eq('workspace_id', id)
      .order('joined_at', { ascending: true });

    const memberIds = (memberRows ?? []).map((m: any) => m.user_id as string);

    // Batch-fetch member emails
    const memberEmailMap: Record<string, string> = {};
    const memberNameMap:  Record<string, string> = {};
    const memberAvatarMap: Record<string, string | null> = {};

    if (memberIds.length > 0) {
      try {
        const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
        for (const u of (authUsers?.users ?? [])) {
          memberEmailMap[u.id] = u.email ?? '';
        }
      } catch {}
      try {
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', memberIds.slice(0, 500));
        for (const p of (profiles ?? [])) {
          memberNameMap[p.id]   = p.full_name ?? p.username ?? '';
          memberAvatarMap[p.id] = p.avatar_url ?? null;
        }
      } catch {}
    }

    const members = (memberRows ?? []).map((m: any) => ({
      id:        m.id,
      userId:    m.user_id,
      role:      m.role,
      email:     memberEmailMap[m.user_id]  ?? '',
      name:      memberNameMap[m.user_id]   ?? '',
      avatarUrl: memberAvatarMap[m.user_id] ?? null,
      joinedAt:  m.joined_at,
    }));

    // ── 4. Reports in workspace ──────────────────────────────────────────────
    const { data: reportRows } = await admin
      .from('workspace_reports')
      .select('id, report_id, added_at, added_by')
      .eq('workspace_id', id)
      .order('added_at', { ascending: false })
      .limit(20);

    // Fetch report titles
    const reportIdList = (reportRows ?? []).map((r: any) => r.report_id as string);
    const reportTitleMap: Record<string, string> = {};
    const reportQueryMap: Record<string, string> = {};

    if (reportIdList.length > 0) {
      try {
        const { data: reportData } = await admin
          .from('research_reports')
          .select('id, title, query, status')
          .in('id', reportIdList);
        for (const r of (reportData ?? [])) {
          reportTitleMap[r.id] = r.title ?? r.query ?? 'Untitled';
          reportQueryMap[r.id] = r.query ?? '';
        }
      } catch {}
    }

    const reports = (reportRows ?? []).map((r: any) => ({
      id:      r.id,
      reportId: r.report_id,
      title:   reportTitleMap[r.report_id] ?? 'Untitled',
      query:   reportQueryMap[r.report_id] ?? '',
      addedAt: r.added_at,
    }));

    // ── 5. Last activity ─────────────────────────────────────────────────────
    let lastActivityAt: string | null = null;
    try {
      const { data: activity } = await admin
        .from('workspace_activities')
        .select('created_at')
        .eq('workspace_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      lastActivityAt = activity?.created_at ?? null;
    } catch {}

    // ── 6. Shared content counts ─────────────────────────────────────────────
    let sharedCount = 0;
    try {
      // Count from shared_workspace_content if it exists
      const tables = ['shared_presentations', 'shared_academic_papers', 'shared_podcasts', 'shared_debates'];
      for (const tbl of tables) {
        try {
          const { count } = await admin
            .from(tbl)
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', id);
          sharedCount += count ?? 0;
        } catch {}
      }
    } catch {}

    return NextResponse.json({
      id:             ws.id,
      name:           ws.name,
      description:    ws.description    ?? null,
      inviteCode:     ws.invite_code    ?? '',
      settings:       ws.settings       ?? {},
      createdAt:      ws.created_at,
      updatedAt:      ws.updated_at     ?? null,
      lastActivityAt,
      // Owner
      ownerId:        ws.owner_id,
      ownerEmail,
      ownerName,
      // Stats
      memberCount:    members.length,
      reportCount:    reports.length,
      sharedCount,
      // Data
      members,
      reports,
    });
  } catch (err) {
    console.error('[workspaces/id] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load workspace detail' },
      { status: 500 },
    );
  }
}