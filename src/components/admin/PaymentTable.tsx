'use client';
// Admin-Dashboard/src/components/admin/PaymentTable.tsx
// Part 55.13 — PaymentTable with full theme integration and mobile optimization.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, ChevronLeft, ChevronRight, IndianRupee,
  TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle,
  ExternalLink, Loader2,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import type {
  PaymentRow, RevenueStats,
  PaymentFilters, PaginatedResponse,
  RazorpayOrderStatus,
} from '@/types/admin';

// ── Shared select / input styles (theme-aware) ──────────────────────────────

function getSelectStyles(isLight: boolean): React.CSSProperties {
  const bg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
  const textColor = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const chevronColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  
  return {
    backgroundColor: bg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '10px 32px 10px 14px',
    fontSize: '13px',
    color: textColor,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${chevronColor}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px',
    transition: 'border-color 0.2s ease',
    minHeight: '44px',
    WebkitAppearance: 'none',
  };
}

function getDateStyles(isLight: boolean): React.CSSProperties {
  const bg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
  const textColor = isLight ? '#1A1A2E' : 'var(--text-primary)';
  
  return {
    backgroundColor: bg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '13px',
    color: textColor,
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    minHeight: '44px',
  };
}

// ── Status metadata (theme-aware) ────────────────────────────────────────────

const STATUS_META: Record<RazorpayOrderStatus, { 
  label: string; 
  darkBg: string; 
  lightBg: string; 
  icon: React.ReactNode 
}> = {
  paid: { 
    label: 'Paid', 
    darkBg: 'bg-green-500/15 text-green-400 border-green-500/25',
    lightBg: 'bg-green-100 text-green-700 border-green-300',
    icon: <CheckCircle className="w-3 h-3" /> 
  },
  created: { 
    label: 'Pending', 
    darkBg: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    lightBg: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: <Clock className="w-3 h-3" /> 
  },
  attempted: { 
    label: 'Attempted', 
    darkBg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    lightBg: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: <Clock className="w-3 h-3" /> 
  },
  failed: { 
    label: 'Failed', 
    darkBg: 'bg-red-500/15 text-red-400 border-red-500/25',
    lightBg: 'bg-red-100 text-red-700 border-red-300',
    icon: <XCircle className="w-3 h-3" /> 
  },
  expired: { 
    label: 'Expired', 
    darkBg: 'bg-white/5 text-white/35 border-white/10',
    lightBg: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: <Clock className="w-3 h-3" /> 
  },
};

function getStatusStyles(status: RazorpayOrderStatus, isLight: boolean): string {
  const meta = STATUS_META[status];
  if (!meta) return isLight ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/5 text-white/35 border-white/10';
  return isLight ? meta.lightBg : meta.darkBg;
}

const PACK_LABELS: Record<string, string> = {
  starter_99:    'Starter (₹99)',
  popular_249:   'Popular (₹249)',
  pro_499:       'Pro Pack (₹499)',
  unlimited_999: 'Power User (₹999)',
};

// ── Revenue summary cards (theme-aware) ─────────────────────────────────────

function RevenueSummaryCards({ stats, loading }: { stats: RevenueStats | null; loading: boolean }) {
  const { isLight } = useTheme();
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  
  const cards = [
    { label: 'Today', value: stats ? `₹${stats.todayInr.toFixed(0)}` : '—', color: isLight ? '#059669' : '#10B981', sub: 'revenue collected' },
    { label: 'This Month', value: stats ? `₹${stats.thisMonthInr.toFixed(0)}` : '—', color: isLight ? '#5B52E0' : '#6C63FF', sub: 'revenue collected' },
    { label: 'All Time', value: stats ? `₹${stats.allTimeInr.toFixed(0)}` : '—', color: isLight ? '#D97706' : '#F59E0B', sub: 'total revenue' },
    { label: 'Success Rate', value: stats ? `${stats.successRate.toFixed(1)}%` : '—', color: isLight ? '#2563EB' : '#3B82F6', sub: `${stats?.successfulOrders ?? 0} of ${stats?.totalOrders ?? 0} orders` },
    { label: 'Successful', value: stats ? stats.successfulOrders.toLocaleString() : '—', color: isLight ? '#059669' : '#10B981', sub: 'paid orders' },
    { label: 'Failed', value: stats ? stats.failedOrders.toLocaleString() : '—', color: isLight ? '#DC2626' : '#EF4444', sub: 'failed orders' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-5">
      {cards.map((c, i) => (
        <div 
          key={i} 
          className="rounded-xl border p-3 sm:p-4"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}
        >
          {loading ? (
            <>
              <div className="h-5 sm:h-6 w-12 sm:w-16 rounded animate-pulse mb-1" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-16 sm:w-20 rounded animate-pulse" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
            </>
          ) : (
            <>
              <p className="text-base sm:text-lg font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[8px] sm:text-[10px] mt-0.5 leading-tight" style={{ color: textMuted }}>{c.sub}</p>
              <p className="text-[8px] sm:text-[9px] mt-1 uppercase tracking-wider font-semibold" style={{ color: textMuted }}>{c.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Revenue trend chart (theme-aware) ───────────────────────────────────────

interface DailyRevenue { day: string; amount: number; orders: number; }

function RevenueTrendChart({ data, loading }: { data: DailyRevenue[]; loading: boolean }) {
  const { isLight } = useTheme();
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const tickColor = isLight ? '#666' : 'rgba(255,255,255,0.3)';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  
  if (loading || data.length === 0) return null;
  
  return (
    <div 
      className="rounded-2xl border p-5 mb-5"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Revenue Trend (30 days)</h3>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>Daily revenue from live Razorpay payments</p>
        </div>
        <TrendingUp className="w-4 h-4" style={{ color: isLight ? '#059669' : '#10B981' }} />
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="day"
            tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }}
            tick={{ fill: tickColor, fontSize: 10 }}
            axisLine={false} 
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `₹${v}`}
            tick={{ fill: tickColor, fontSize: 10 }}
            axisLine={false} 
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div 
                  className="rounded-xl border px-3 py-2 text-xs"
                  style={{
                    backgroundColor: isLight ? '#FFFFFF' : '#13131F',
                    borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <p className="mb-1" style={{ color: isLight ? '#666' : 'rgba(255,255,255,0.4)' }}>
                    {label ? format(new Date(label), 'MMM d, yyyy') : ''}
                  </p>
                  <p className="font-bold" style={{ color: isLight ? '#059669' : '#10B981' }}>
                    ₹{(payload[0]?.value as number)?.toFixed(0)}
                  </p>
                  <p style={{ color: isLight ? '#888' : 'rgba(255,255,255,0.3)' }}>{payload[0]?.payload?.orders} orders</p>
                </div>
              );
            }}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke={isLight ? '#059669' : '#10B981'} 
            strokeWidth={2}
            dot={false} 
            activeDot={{ r: 4, fill: isLight ? '#059669' : '#10B981' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Revoke credits modal (theme-aware) ──────────────────────────────────────

function RevokeModal({ payment, onClose, onSuccess }: {
  payment: PaymentRow; onClose: () => void; onSuccess: () => void;
}) {
  const { isLight } = useTheme();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const modalBg = isLight ? '#FFFFFF' : '#13131F';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const inputBg = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';

  const handleRevoke = async () => {
    if (!reason.trim()) { toast.error('Please enter a reason'); return; }
    setLoading(true);
    const { error } = await adminFetch('/api/admin/payments/revoke', {
      method: 'POST',
      body: JSON.stringify({
        userId: payment.userId,
        orderId: payment.razorpayOrderId,
        reason: reason.trim(),
      }),
    });
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(`Revoked ${payment.creditsToAdd} credits from ${payment.userEmail ?? payment.userId.slice(0, 8)}`);
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                    w-[95%] max-w-[420px] rounded-2xl border p-6"
        style={{
          backgroundColor: modalBg,
          borderColor: borderColor,
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: textPrimary }}>Revoke Credits</h3>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              This will deduct{' '}
              <span className="text-orange-400 font-semibold">{payment.creditsToAdd} credits</span> from{' '}
              <span className="font-medium" style={{ color: textPrimary }}>
                {payment.userEmail ?? payment.userId.slice(0, 12)}
              </span>
            </p>
          </div>
        </div>
        <div 
          className="rounded-xl p-3 mb-4 text-xs border"
          style={{
            backgroundColor: isLight ? 'rgba(251,146,60,0.05)' : 'rgba(251,146,60,0.05)',
            borderColor: isLight ? 'rgba(251,146,60,0.15)' : 'rgba(251,146,60,0.15)',
            color: isLight ? '#C2410C' : '#FDBA74',
          }}
        >
          Order <span className="font-mono" style={{ color: isLight ? '#9A3412' : '#FB923C' }}>{payment.razorpayOrderId}</span>
          {' '}· ₹{payment.amountInr} · {PACK_LABELS[payment.packId] ?? payment.packId}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for revoking credits (required)…"
          rows={3}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all mb-4"
          style={{
            backgroundColor: inputBg,
            border: `1px solid ${inputBorder}`,
            color: textPrimary,
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${borderColor}`,
              color: textMuted,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgba(251,146,60,0.15)',
              border: '1px solid rgba(251,146,60,0.25)',
              color: '#FB923C',
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Revoke Credits'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main component (theme-aware + mobile optimized) ─────────────────────────

export function PaymentTable() {
  const { isLight } = useTheme();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [trendData, setTrendData] = useState<DailyRevenue[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<PaymentRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [filters, setFilters] = useState<Omit<PaymentFilters, 'showTest'>>({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    page: 1,
    pageSize: 20,
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load stats once
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

  // Load payments on filter change
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: filters.search,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      page: String(filters.page),
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

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: value, page: 1 }));
    }, 350);
  };

  const selectStyles = getSelectStyles(isLight);
  const dateStyles = getDateStyles(isLight);
  
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';
  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const inputBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const inputText = isLight ? '#1A1A2E' : 'var(--text-primary)';

  return (
    <div>
      <RevenueSummaryCards stats={stats} loading={statsLoading} />
      <RevenueTrendChart data={trendData} loading={statsLoading} />

      {/* Filters - mobile responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
          <input
            type="text"
            placeholder="Search by user email or order ID…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as any, page: 1 }))}
          style={selectStyles}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <option value="all" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>All Statuses</option>
          <option value="paid" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Paid</option>
          <option value="created" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Pending</option>
          <option value="attempted" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Attempted</option>
          <option value="failed" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Failed</option>
          <option value="expired" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Expired</option>
        </select>

        {/* Date range - responsive */}
        <div className="flex items-center gap-1 flex-wrap">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value, page: 1 }))}
            style={dateStyles}
            className="flex-1 sm:flex-none min-w-[120px] rounded-xl px-2 sm:px-3 py-2.5 text-xs sm:text-sm"
          />
          <span className="text-xs" style={{ color: textMuted }}>to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value, page: 1 }))}
            style={dateStyles}
            className="flex-1 sm:flex-none min-w-[120px] rounded-xl px-2 sm:px-3 py-2.5 text-xs sm:text-sm"
          />
        </div>

        <div className="text-xs text-right sm:ml-auto whitespace-nowrap" style={{ color: textMuted }}>
          {total.toLocaleString()} orders
        </div>
      </div>

      {/* Table / Cards */}
      <div 
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        {isMobile ? (
          // Mobile: Card view
          <div className="p-3 sm:p-4 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3 animate-pulse" style={{ borderColor: borderColor }}>
                  <div className="flex justify-between">
                    <div className="h-5 w-20 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    <div className="h-5 w-16 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                  </div>
                  <div className="h-4 w-3/4 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                  <div className="flex gap-2">
                    <div className="h-3 w-20 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                    <div className="h-3 w-20 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              ))
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <IndianRupee className="w-12 h-12 mb-3 opacity-30" style={{ color: textMuted }} />
                <p className="text-base font-medium" style={{ color: textMuted }}>No payment orders found</p>
              </div>
            ) : (
              payments.map((payment) => {
                const statusStyles = getStatusStyles(payment.status, isLight);
                const isPaid = payment.status === 'paid';
                
                return (
                  <div
                    key={payment.id}
                    className="rounded-xl border p-4 space-y-3"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: borderColor,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${statusStyles}`}>
                        {STATUS_META[payment.status]?.icon}{STATUS_META[payment.status]?.label}
                      </span>
                      <span className="text-sm font-bold" style={{ color: isLight ? '#059669' : '#10B981' }}>
                        ₹{payment.amountInr.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium" style={{ color: textPrimary }}>{payment.userName ?? '—'}</p>
                      <p className="text-[10px]" style={{ color: textMuted }}>{payment.userEmail ?? payment.userId.slice(0, 16)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[10px]" style={{ color: textSecondary }}>
                        {PACK_LABELS[payment.packId] ?? payment.packId}
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: textMuted }}>
                        +{payment.creditsToAdd} credits
                      </span>
                      <span className="text-[10px]" style={{ color: textMuted }}>
                        {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono" style={{ color: textMuted }}>
                        {payment.razorpayOrderId.slice(0, 12)}…
                      </span>
                      {isPaid && (
                        <button
                          onClick={() => setRevokeTarget(payment)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                          style={{
                            backgroundColor: 'rgba(251,146,60,0.1)',
                            border: '1px solid rgba(251,146,60,0.2)',
                            color: '#FB923C',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // Desktop: Table view
          <>
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th style={{ color: textMuted }}>User</th>
                    <th style={{ color: textMuted }}>Pack</th>
                    <th style={{ color: textMuted }}>Amount</th>
                    <th style={{ color: textMuted }}>Credits</th>
                    <th style={{ color: textMuted }}>Status</th>
                    <th style={{ color: textMuted }}>Order ID</th>
                    <th style={{ color: textMuted }}>When</th>
                    <th style={{ color: textMuted }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j}>
                            <div className="h-4 rounded animate-pulse w-full max-w-[100px]" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16" style={{ color: textMuted }}>
                        <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
                        No payment orders found
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => {
                      const statusStyles = getStatusStyles(payment.status, isLight);
                      const isPaid = payment.status === 'paid';
                      
                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate max-w-[140px]" style={{ color: textSecondary }}>
                                {payment.userName ?? '—'}
                              </p>
                              <p className="text-[10px] truncate max-w-[140px]" style={{ color: textMuted }}>
                                {payment.userEmail ?? payment.userId.slice(0, 12) + '…'}
                              </p>
                            </div>
                          </td>
                          <td className="text-xs whitespace-nowrap" style={{ color: textSecondary }}>
                            {PACK_LABELS[payment.packId] ?? payment.packId}
                          </td>
                          <td>
                            <span className="text-sm font-bold tabular-nums" style={{ color: isLight ? '#059669' : '#10B981' }}>
                              ₹{payment.amountInr.toLocaleString()}
                            </span>
                          </td>
                          <td className="text-sm font-medium tabular-nums" style={{ color: textSecondary }}>
                            {payment.creditsToAdd.toLocaleString()}
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${statusStyles}`}>
                              {STATUS_META[payment.status]?.icon}{STATUS_META[payment.status]?.label}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono truncate max-w-[100px]" style={{ color: textMuted }}>
                                {payment.razorpayOrderId}
                              </span>
                              <a
                                href={`https://dashboard.razorpay.com/app/orders/${payment.razorpayOrderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="transition-colors"
                                style={{ color: textMuted }}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                          <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                            {formatDistanceToNow(new Date(payment.createdAt), { addSuffix: true })}
                            {payment.paidAt && (
                              <div className="text-[10px] mt-0.5" style={{ color: isLight ? '#059669' : '#34D399' }}>
                                paid {formatDistanceToNow(new Date(payment.paidAt), { addSuffix: true })}
                              </div>
                            )}
                          </td>
                          <td>
                            {isPaid && (
                              <button
                                onClick={() => setRevokeTarget(payment)}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap"
                                style={{
                                  backgroundColor: 'rgba(251,146,60,0.1)',
                                  border: '1px solid rgba(251,146,60,0.2)',
                                  color: '#FB923C',
                                }}
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

            {/* Pagination - desktop */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
                <p className="text-xs" style={{ color: textMuted }}>
                  Page {filters.page} of {totalPages} · {total.toLocaleString()} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    disabled={filters.page <= 1}
                    className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: borderColor,
                      color: textMuted,
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
                    return (
                      <button
                        key={p}
                        onClick={() => setFilters(f => ({ ...f, page: p }))}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all`}
                        style={{
                          backgroundColor: filters.page === p ? (isLight ? '#5B52E0' : '#6C63FF') : 'transparent',
                          color: filters.page === p ? '#FFFFFF' : textMuted,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    disabled={filters.page >= totalPages}
                    className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: borderColor,
                      color: textMuted,
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination - mobile */}
        {isMobile && !loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
            <p className="text-xs" style={{ color: textMuted }}>Page {filters.page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: borderColor,
                  color: textMuted,
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: borderColor,
                  color: textMuted,
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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