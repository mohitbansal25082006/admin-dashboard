// Admin-Dashboard/src/app/api/admin/workspaces/route.ts
// Part 32 — Workspace Overview API
//
// GET /api/admin/workspaces?search=&page=1&pageSize=20
// Returns all workspaces with owner info, member count, report count, last activity.

import { NextRequest, NextResponse }                  from 'next/server';
import { verifyAdminSession, getAdminClient }          from '@/lib/supabase-admin';
import type { WorkspaceOverviewRow, PaginatedResponse } from '@/types/admin';

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
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20', 10));

  try {
    const admin = getAdminClient();

    // ── 1. Fetch all workspaces ───────────────────────────────────────────────
    const { data: workspaces, error: wsError } = await admin
      .from('workspaces')
      .select('id, name, description, owner_id, is_personal, invite_code, created_at')
      .order('created_at', { ascending: false });

    if (wsError) throw new Error(wsError.message);

    const wsRows = workspaces ?? [];
    if (wsRows.length === 0) {
      return NextResponse.json({
        data: [], total: 0, page, pageSize, totalPages: 1, error: null,
      });
    }

    const wsIds    = wsRows.map((w: any) => w.id as string);
    const ownerIds = [...new Set(wsRows.map((w: any) => w.owner_id as string))];

    // ── 2. Fetch member counts per workspace ──────────────────────────────────
    const memberCountMap: Record<string, number> = {};
    try {
      const { data: members } = await admin
        .from('workspace_members')
        .select('workspace_id')
        .in('workspace_id', wsIds);

      for (const m of (members ?? [])) {
        memberCountMap[m.workspace_id] = (memberCountMap[m.workspace_id] ?? 0) + 1;
      }
    } catch { /* non-fatal */ }

    // ── 3. Fetch report counts per workspace ──────────────────────────────────
    const reportCountMap: Record<string, number> = {};
    try {
      const { data: reports } = await admin
        .from('workspace_reports')
        .select('workspace_id')
        .in('workspace_id', wsIds);

      for (const r of (reports ?? [])) {
        reportCountMap[r.workspace_id] = (reportCountMap[r.workspace_id] ?? 0) + 1;
      }
    } catch { /* non-fatal */ }

    // ── 4. Fetch last activity per workspace ──────────────────────────────────
    const lastActivityMap: Record<string, string> = {};
    try {
      const { data: activities } = await admin
        .from('workspace_activities')
        .select('workspace_id, created_at')
        .in('workspace_id', wsIds)
        .order('created_at', { ascending: false })
        .limit(wsIds.length * 2);  // rough: 2 per workspace on average

      // Keep only the most recent per workspace
      for (const a of (activities ?? [])) {
        if (!lastActivityMap[a.workspace_id]) {
          lastActivityMap[a.workspace_id] = a.created_at;
        }
      }
    } catch { /* non-fatal */ }

    // ── 5. Fetch owner emails and names ───────────────────────────────────────
    const emailMap: Record<string, string> = {};
    const nameMap:  Record<string, string> = {};
    try {
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of (authUsers?.users ?? [])) {
        emailMap[u.id] = u.email ?? '';
      }
    } catch { /* non-fatal */ }

    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, username')
        .in('id', ownerIds.slice(0, 500));
      for (const p of (profiles ?? [])) {
        nameMap[p.id] = p.full_name ?? p.username ?? '';
      }
    } catch { /* non-fatal */ }

    // ── 6. Map rows ───────────────────────────────────────────────────────────
    let mapped: WorkspaceOverviewRow[] = wsRows.map((w: any) => ({
      id:             w.id,
      name:           w.name,
      description:    w.description    ?? null,
      ownerId:        w.owner_id,
      ownerEmail:     emailMap[w.owner_id] ?? null,
      ownerName:      nameMap[w.owner_id]  ?? null,
      memberCount:    memberCountMap[w.id] ?? 0,
      reportCount:    reportCountMap[w.id] ?? 0,
      isPersonal:     w.is_personal        ?? false,
      inviteCode:     w.invite_code        ?? '',
      createdAt:      w.created_at,
      lastActivityAt: lastActivityMap[w.id] ?? null,
    }));

    // ── 7. Apply search filter ────────────────────────────────────────────────
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      mapped = mapped.filter((w) =>
        w.name.toLowerCase().includes(q) ||
        (w.ownerEmail ?? '').toLowerCase().includes(q) ||
        (w.ownerName  ?? '').toLowerCase().includes(q),
      );
    }

    // ── 8. Paginate ───────────────────────────────────────────────────────────
    const total      = mapped.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = mapped.slice(start, start + pageSize);

    const response: PaginatedResponse<WorkspaceOverviewRow> = {
      data: paged, total, page, pageSize, totalPages, error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[workspaces] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load workspaces' },
      { status: 500 },
    );
  }
}