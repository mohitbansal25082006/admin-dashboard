'use client';
// Admin-Dashboard/src/components/admin/PaymentTable.tsx
// Part 31C — Full Razorpay order table with revenue summary cards,
// success/fail breakdown, and manual credit revocation.

import { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, IndianRupee,
  TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle,
  ExternalLink, RefreshCw, Loader2,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import type {
  PaymentRow, RevenueStats,
  PaymentFilters, PaginatedResponse,
  RazorpayOrderStatus,
} from '@/types/admin';

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_META: Record<RazorpayOrderStatus, { label: string; bg: string; icon: React.ReactNode }> = {
  paid:      { label: 'Paid',      bg: 'bg-green-500/15  text-green-400  border-green-500/25',  icon: <CheckCircle className="w-3 h-3" /> },
  created:   { label: 'Pending',   bg: 'bg-blue-500/15   text-blue-400   border-blue-500/25',   icon: <Clock       className="w-3 h-3" /> },
  attempted: { label: 'Attempted', bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', icon: <Clock       className="w-3 h-3" /> },
  failed:    { label: 'Failed',    bg: 'bg-red-500/15    text-red-400    border-red-500/25',    icon: <XCircle     className="w-3 h-3" /> },
  expired:   { label: 'Expired',   bg: 'bg-white/5       text-white/35   border-white/10',      icon: <Clock       className="w-3 h-3" /> },
};

const PACK_LABELS: Record<string, string> = {
  starter_99:    'Starter (₹99)',
  popular_249:   'Popular (₹249)',
  pro_499:       'Pro Pack (₹499)',
  unlimited_999: 'Power User (₹999)',
};

// ── Revenue summary cards ─────────────────────────────────────────────────────

function RevenueSummaryCards({ stats, loading }: { stats: RevenueStats | null; loading: boolean }) {
  const cards = [
    { label: 'Today',          value: stats ? `₹${stats.todayInr.toFixed(0)}`     : '—', color: '#10B981', sub: 'revenue collected' },
    { label: 'This Month',     value: stats ? `₹${stats.thisMonthInr.toFixed(0)}`  : '—', color: '#6C63FF', sub: 'revenue collected' },
    { label: 'All Time',       value: stats ? `₹${stats.allTimeInr.toFixed(0)}`    : '—', color: '#F59E0B', sub: 'total revenue' },
    { label: 'Success Rate',   value: stats ? `${stats.successRate.toFixed(1)}%`    : '—', color: '#3B82F6', sub: `${stats?.successfulOrders ?? 0} of ${stats?.totalOrders ?? 0} orders` },
    { label: 'Successful',     value: stats ? stats.successfulOrders.toLocaleString() : '—', color: '#10B981', sub: 'paid orders' },
    { label: 'Failed',         value: stats ? stats.failedOrders.toLocaleString()   : '—', color: '#EF4444', sub: 'failed orders' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] p-4"
          style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
        >
          {loading ? (
            <>
              <div className="h-6 w-16 bg-white/[0.06] rounded animate-pulse mb-1" />
              <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse" />
            </>
          ) : (
            <>
              <p className="text-lg font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{c.sub}</p>
              <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wider font-semibold">{c.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Revenue trend mini-chart ──────────────────────────────────────────────────

interface DailyRevenue { day: string; amount: number; orders: number; }

function RevenueTrendChart({ data, loading }: { data: DailyRevenue[]; loading: boolean }) {
  if (loading || data.length === 0) return null;
  return (
    <div
      className="rounded-2xl border border-white/[0.07] p-5 mb-5"
      style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Revenue Trend (30 days)</h3>
          <p className="text-xs text-white/35 mt-0.5">Daily revenue from captured Razorpay payments</p>
        </div>
        <TrendingUp className="w-4 h-4 text-green-400" />
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="day"
            tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `₹${v}`}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs" style={{ background: '#13131F' }}>
                  <p className="text-white/40 mb-1">
                    {label ? format(new Date(label), 'MMM d, yyyy') : ''}
                  </p>
                  <p className="text-green-400 font-bold">₹{(payload[0]?.value as number)?.toFixed(0)}</p>
                  <p className="text-white/30">{payload[0]?.payload?.orders} orders</p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#10B981' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Revoke credits modal ──────────────────────────────────────────────────────

function RevokeModal({
  payment, onClose, onSuccess,
}: {
  payment: PaymentRow; onClose: () => void; onSuccess: () => void;
}) {
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    if (!reason.trim()) { toast.error('Please enter a reason'); return; }
    setLoading(true);
    const { error } = await adminFetch('/api/admin/payments/revoke', {
      method: 'POST',
      body: JSON.stringify({
        userId:  payment.userId,
        orderId: payment.razorpayOrderId,
        reason:  reason.trim(),
      }),
    });
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(`Revoked ${payment.creditsToAdd} credits from ${payment.userEmail ?? payment.userId.slice(0,8)}`);
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   w-full max-w-[420px] rounded-2xl border border-white/[0.08] p-6"
        style={{ background: '#13131F' }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Revoke Credits</h3>
            <p className="text-xs text-white/40 mt-0.5">
              This will deduct <span className="text-orange-400 font-semibold">{payment.creditsToAdd} credits</span> from{' '}
              <span className="text-white/70">{payment.userEmail ?? payment.userId.slice(0, 12)}</span>
            </p>
          </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-3 mb-4 text-xs text-orange-300/70">
          Order <span className="font-mono text-orange-300">{payment.razorpayOrderId}</span> · ₹{payment.amountInr} · {PACK_LABELS[payment.packId] ?? payment.packId}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for revoking credits (required)…"
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                     text-sm text-white placeholder:text-white/25 outline-none resize-none
                     focus:border-orange-500/40 transition-all mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/50
                       bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-orange-400
                       bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/25
                       transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revoke Credits'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PaymentTable() {
  const [payments,   setPayments]   = useState<PaymentRow[]>([]);
  const [stats,      setStats]      = useState<RevenueStats | null>(null);
  const [trendData,  setTrendData]  = useState<DailyRevenue[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<PaymentRow | null>(null);

  const [filters, setFilters] = useState<PaymentFilters>({
    search:   '',
    status:   'all',
    dateFrom: '',
    dateTo:   '',
    page:     1,
    pageSize: 20,
  });

  // Load stats + trend once
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      const { data } = await adminFetch<{ stats: RevenueStats; trend: DailyRevenue[] }>(
        '/api/admin/payments/stats',
      );
      if (data) { setStats(data.stats); setTrendData(data.trend); }
      setStatsLoading(false);
    })();
  }, []);

  // Load payments when filters change
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search:   filters.search,
      status:   filters.status,
      dateFrom: filters.dateFrom,
      dateTo:   filters.dateTo,
      page:     String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<PaymentRow>>(
      `/api/admin/payments?${params.toString()}`,
    );
    if (data) {
      setPayments(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleSearch = useCallback(
    debounce((v: string) => setFilters((f) => ({ ...f, search: v, page: 1 })), 350),
    [],
  );

  return (
    <div>
      {/* Revenue summary cards */}
      <RevenueSummaryCards stats={stats} loading={statsLoading} />

      {/* Revenue trend chart */}
      <RevenueTrendChart data={trendData} loading={statsLoading} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by user email or order ID…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any, page: 1 }))}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                     text-sm text-white/70 outline-none focus:border-[#6C63FF]/40 transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="created">Pending</option>
          <option value="attempted">Attempted</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                       text-sm text-white/60 outline-none focus:border-[#6C63FF]/40 transition-all"
          />
          <span className="text-white/25 text-sm">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                       text-sm text-white/60 outline-none focus:border-[#6C63FF]/40 transition-all"
          />
        </div>

        <div className="ml-auto text-xs text-white/30 whitespace-nowrap">
          {total.toLocaleString()} orders
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: '#0D0D1A' }}
      >
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Pack</th>
                <th>Amount</th>
                <th>Credits</th>
                <th>Status</th>
                <th>Order ID</th>
                <th>When</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}>
                        <div className="h-4 bg-white/[0.05] rounded animate-pulse w-full max-w-[100px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/25">
                    <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No payment orders found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const statusMeta = STATUS_META[payment.status];
                  return (
                    <tr key={payment.id}>
                      <td>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white/70 truncate max-w-[140px]">
                            {payment.userName ?? '—'}
                          </p>
                          <p className="text-[10px] text-white/30 truncate max-w-[140px]">
                            {payment.userEmail ?? payment.userId.slice(0, 12) + '…'}
                          </p>
                        </div>
                      </td>
                      <td className="text-white/50 text-xs whitespace-nowrap">
                        {PACK_LABELS[payment.packId] ?? payment.packId}
                      </td>
                      <td>
                        <span className="text-sm font-bold text-green-400 tabular-nums">
                          ₹{payment.amountInr.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-white/60 text-sm font-medium tabular-nums">
                        {payment.creditsToAdd.toLocaleString()}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${statusMeta.bg}`}>
                          {statusMeta.icon}
                          {statusMeta.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-white/30 font-mono truncate max-w-[100px]">
                            {payment.razorpayOrderId}
                          </span>
                          <a
                            href={`https://dashboard.razorpay.com/app/orders/${payment.razorpayOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-white/20 hover:text-[#6C63FF] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="text-white/25 text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                        {payment.paidAt && (
                          <div className="text-[10px] text-green-400/50 mt-0.5">
                            paid {formatDistanceToNow(new Date(payment.paidAt), { addSuffix: true })}
                          </div>
                        )}
                      </td>
                      <td>
                        {payment.status === 'paid' && (
                          <button
                            onClick={() => setRevokeTarget(payment)}
                            className="text-xs px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400
                                       border border-orange-500/20 hover:bg-orange-500/20 transition-all
                                       whitespace-nowrap"
                          >
                            Revoke Credits
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">
              Page {filters.page} of {totalPages} · {total.toLocaleString()} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
                return (
                  <button
                    key={p}
                    onClick={() => setFilters((f) => ({ ...f, page: p }))}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                      ${filters.page === p
                        ? 'bg-[#6C63FF] text-white'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Revoke credits modal */}
      {revokeTarget && (
        <RevokeModal
          payment={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onSuccess={fetchPayments}
        />
      )}
    </div>
  );
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}