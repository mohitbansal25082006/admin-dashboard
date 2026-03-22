// Admin-Dashboard/src/app/api/admin/audit/route.ts
// Part 31B — Paginated audit log entries.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';
import type { AuditLogRow, PaginatedResponse } from '@/types/admin';

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
  const action   = searchParams.get('action')   ?? 'all';
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1', 10));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20', 10));

  try {
    const admin = getAdminClient();

    // Get all audit log entries with admin and target info
    let query = admin
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (action !== 'all') {
      query = query.eq('action', action);
    }

    const { data: logs, error } = await query;
    if (error) throw new Error(error.message);

    let rows = logs ?? [];

    // Get emails for admin and target users
    const allUserIds = new Set<string>();
    for (const log of rows) {
      if (log.admin_user_id)  allUserIds.add(log.admin_user_id);
      if (log.target_user_id) allUserIds.add(log.target_user_id);
    }

    const emailMap: Record<string, string> = {};
    if (allUserIds.size > 0) {
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of (authUsers?.users ?? [])) {
        emailMap[u.id] = u.email ?? '';
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((log) => {
        const adminEmail  = emailMap[log.admin_user_id]  ?? '';
        const targetEmail = emailMap[log.target_user_id] ?? '';
        return adminEmail.toLowerCase().includes(q) || targetEmail.toLowerCase().includes(q);
      });
    }

    const total      = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = rows.slice(start, start + pageSize);

    const mapped: AuditLogRow[] = paged.map((log) => ({
      id:             log.id,
      adminUserId:    log.admin_user_id,
      adminEmail:     emailMap[log.admin_user_id]  ?? null,
      targetUserId:   log.target_user_id ?? null,
      targetEmail:    log.target_user_id ? (emailMap[log.target_user_id] ?? null) : null,
      action:         log.action,
      resourceType:   log.resource_type  ?? null,
      resourceId:     log.resource_id    ?? null,
      beforeValue:    log.before_value   ?? null,
      afterValue:     log.after_value    ?? null,
      reason:         log.reason         ?? null,
      createdAt:      log.created_at,
    }));

    const response: PaginatedResponse<AuditLogRow> = {
      data: mapped, total, page, pageSize, totalPages, error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[audit] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load audit log' },
      { status: 500 },
    );
  }
}