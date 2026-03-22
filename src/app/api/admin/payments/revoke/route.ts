// Admin-Dashboard/src/app/api/admin/payments/revoke/route.ts
// Part 31C — Revoke credits for a paid Razorpay order.
// Used when a payment was captured but shouldn't have been (webhook misfired, etc.)
// Deducts the credits, marks the order revoked, and logs to admin_audit_log.

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
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

  let body: { userId: string; orderId: string; reason: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, orderId, reason } = body;

  if (!userId)        return NextResponse.json({ error: 'userId is required'  }, { status: 400 });
  if (!orderId)       return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  try {
    const admin = getAdminClient();

    // ── Look up the order ─────────────────────────────────────────────────────
    const { data: order, error: orderError } = await admin
      .from('razorpay_orders')
      .select('*')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (orderError)  throw new Error(orderError.message);
    if (!order)      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Order is not in paid status — nothing to revoke' }, { status: 400 });
    }

    const creditsToRevoke = order.credits_to_add ?? 0;
    if (!creditsToRevoke) {
      return NextResponse.json({ error: 'No credits_to_add on this order' }, { status: 400 });
    }

    // ── Get before balance ────────────────────────────────────────────────────
    const { data: creditRow } = await admin
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    const balanceBefore = creditRow?.balance ?? 0;

    // ── Deduct credits (can go to 0 but not negative if balance < credits) ────
    const deductAmount = Math.min(creditsToRevoke, balanceBefore);
    const balanceAfter = balanceBefore - deductAmount;

    await admin
      .from('user_credits')
      .update({
        balance:        balanceAfter,
        total_consumed: (creditRow as any)?.total_consumed ?? 0 + deductAmount,
        updated_at:     new Date().toISOString(),
      })
      .eq('user_id', userId);

    // ── Log credit transaction ─────────────────────────────────────────────────
    await admin.from('credit_transactions').insert({
      user_id:      userId,
      type:         'consume',
      amount:       -deductAmount,
      balance_after: balanceAfter,
      order_id:     orderId,
      description:  `Admin revoked ${deductAmount} credits (order: ${orderId}). Reason: ${reason}`,
      metadata:     { admin_id: adminId, revoked: true, original_amount: creditsToRevoke },
    });

    // ── Mark order as revoked (repurpose status) ──────────────────────────────
    await admin
      .from('razorpay_orders')
      .update({ status: 'expired' })
      .eq('razorpay_order_id', orderId);

    // ── Audit log ─────────────────────────────────────────────────────────────
    await admin.from('admin_audit_log').insert({
      admin_user_id:  adminId,
      target_user_id: userId,
      action:         'revoke_credits',
      resource_type:  'razorpay_order',
      resource_id:    orderId,
      before_value:   { balance: balanceBefore, order_status: 'paid', credits: creditsToRevoke },
      after_value:    { balance: balanceAfter,  order_status: 'expired', deducted: deductAmount },
      reason,
    });

    return NextResponse.json({
      success:        true,
      deducted:       deductAmount,
      balanceBefore,
      balanceAfter,
    });
  } catch (err) {
    console.error('[payments/revoke] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Revoke failed' },
      { status: 500 },
    );
  }
}