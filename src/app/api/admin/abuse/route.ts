// Admin-Dashboard/src/app/api/admin/abuse/route.ts
// Part 32 — Abuse Detection API
//
// GET  /api/admin/abuse  — Optionally run detection, then return signals
// POST /api/admin/abuse  — Resolve a signal (clear / warn / suspend)

import { NextRequest, NextResponse }               from 'next/server';
import { verifyAdminSession, getAdminClient }       from '@/lib/supabase-admin';
import type { AbuseSignalRow, PaginatedResponse }   from '@/types/admin';

// ── GET — list abuse signals (with optional auto-detection) ───────────────────

export async function GET(request: NextRequest) {
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

  const { searchParams } = request.nextUrl;
  const runDetection = searchParams.get('runDetection') === 'true';
  const signalType   = searchParams.get('signalType')   ?? 'all';
  const severity     = searchParams.get('severity')     ?? 'all';
  const showReviewed = searchParams.get('showReviewed') === 'true';
  const page         = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
  const pageSize     = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20', 10));

  try {
    const admin = getAdminClient();

    // ── 1. Run automated detection (non-fatal) ───────────────────────────────
    let newSignalsFound = 0;
    if (runDetection) {
      try {
        const { data: detectResult } = await admin.rpc('detect_abuse_signals');
        newSignalsFound = detectResult ?? 0;
      } catch (detectErr) {
        console.warn('[abuse] detect_abuse_signals RPC error:', detectErr);
      }
    }

    // ── 2. Fetch signals via RPC (includes profile name + account_status) ────
    const { data: rows, error: fetchError } = await admin.rpc(
      'get_abuse_signals_with_users',
      {
        p_is_reviewed: showReviewed ? null : false,   // null = both, false = pending only
        p_signal_type: signalType !== 'all' ? signalType : null,
        p_severity:    severity    !== 'all' ? severity    : null,
        p_limit:       500,   // fetch up to 500, paginate in JS
      },
    );

    if (fetchError) throw new Error(fetchError.message);

    const rawRows = (rows ?? []) as any[];

    // ── 3. Enrich with emails (batch auth.admin.listUsers) ───────────────────
    const uniqueIds = [...new Set(rawRows.map((r: any) => r.user_id as string))];
    const emailMap: Record<string, string> = {};

    if (uniqueIds.length > 0) {
      try {
        const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
        for (const u of (authUsers?.users ?? [])) {
          emailMap[u.id] = u.email ?? '';
        }
      } catch {
        // Non-fatal — emails will be null
      }
    }

    // ── 4. Map + paginate ────────────────────────────────────────────────────
    const total      = rawRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = rawRows.slice(start, start + pageSize);

    const mapped: AbuseSignalRow[] = paged.map((r: any) => ({
      id:            r.id,
      userId:        r.user_id,
      userEmail:     emailMap[r.user_id]  ?? null,
      userName:      r.full_name          ?? r.username ?? null,
      accountStatus: r.account_status     ?? 'active',
      signalType:    r.signal_type,
      severity:      r.severity,
      details:       r.details            ?? {},
      isReviewed:    r.is_reviewed,
      reviewAction:  r.review_action      ?? null,
      reviewNote:    r.review_note        ?? null,
      reviewedAt:    r.reviewed_at        ?? null,
      createdAt:     r.created_at,
    }));

    const response: PaginatedResponse<AbuseSignalRow> & { newSignalsFound: number } = {
      data:           mapped,
      total,
      page,
      pageSize,
      totalPages,
      error:          null,
      newSignalsFound,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[abuse] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load abuse signals' },
      { status: 500 },
    );
  }
}

// ── POST — resolve an abuse signal ────────────────────────────────────────────
// Body: { signalId, userId, action: 'cleared'|'warned'|'suspended', note, creditDeduction? }

export async function POST(request: NextRequest) {
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

  let body: {
    signalId: string;
    userId: string;
    action: 'cleared' | 'warned' | 'suspended';
    note: string;
    creditDeduction?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { signalId, userId, action, note, creditDeduction } = body;

  if (!signalId) return NextResponse.json({ error: 'signalId is required' }, { status: 400 });
  if (!userId)   return NextResponse.json({ error: 'userId is required' },   { status: 400 });
  if (!action)   return NextResponse.json({ error: 'action is required' },   { status: 400 });
  if (!note?.trim()) return NextResponse.json({ error: 'note is required' }, { status: 400 });

  if (!['cleared', 'warned', 'suspended'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action value' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();

    // ── Step 1: If 'warned', deduct credits ──────────────────────────────────
    if (action === 'warned' && creditDeduction && creditDeduction > 0) {
      const { error: creditErr } = await admin.rpc('admin_adjust_credits', {
        p_admin_id: adminId,
        p_user_id:  userId,
        p_amount:   -Math.abs(creditDeduction),
        p_reason:   `Abuse warning: ${note}`,
      });
      if (creditErr) {
        console.warn('[abuse] credit deduction error (non-fatal):', creditErr.message);
      }
    }

    // ── Step 2: If 'suspended', update account status ────────────────────────
    if (action === 'suspended') {
      const { error: statusErr } = await admin.rpc('admin_set_account_status', {
        p_admin_id:   adminId,
        p_user_id:    userId,
        p_new_status: 'suspended',
        p_reason:     `Abuse suspension: ${note}`,
      });
      if (statusErr) throw new Error(statusErr.message);
    }

    // ── Step 3: Mark signal as resolved ──────────────────────────────────────
    const { data: result, error: resolveErr } = await admin.rpc('resolve_abuse_signal', {
      p_signal_id: signalId,
      p_admin_id:  adminId,
      p_action:    action,
      p_note:      note.trim(),
    });

    if (resolveErr) throw new Error(resolveErr.message);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[abuse] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to resolve signal' },
      { status: 500 },
    );
  }
}