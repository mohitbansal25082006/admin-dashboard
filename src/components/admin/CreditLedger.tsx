'use client';
// Admin-Dashboard/src/components/admin/CreditLedger.tsx
// Part 31C — Full platform-wide credit transaction ledger with filters,
// stats summary bar, and type breakdown chart.

import { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, TrendingUp,
  TrendingDown, Zap, Gift, ShoppingCart, Users,
  Shield, RefreshCw, BarChart2,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import type {
  CreditTransactionRow, CreditLedgerStats,
  CreditFilters, PaginatedResponse,
  CreditTransactionType,
} from '@/types/admin';

// ── Type metadata ─────────────────────────────────────────────────────────────

const TX_META: Record<CreditTransactionType, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  purchase:      { label: 'Purchase',      color: '#10B981', bg: 'bg-green-500/15  text-green-400  border-green-500/25',  icon: <ShoppingCart className="w-3 h-3" /> },
  consume:       { label: 'Consumed',      color: '#EF4444', bg: 'bg-red-500/15    text-red-400    border-red-500/25',    icon: <Zap           className="w-3 h-3" /> },
  refund:        { label: 'Refund',        color: '#3B82F6', bg: 'bg-blue-500/15   text-blue-400   border-blue-500/25',   icon: <RefreshCw     className="w-3 h-3" /> },
  signup_bonus:  { label: 'Signup Bonus',  color: '#6C63FF', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/25', icon: <Gift          className="w-3 h-3" /> },
  admin_grant:   { label: 'Admin Grant',   color: '#F59E0B', bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', icon: <Shield        className="w-3 h-3" /> },
  referral_bonus:{ label: 'Referral',      color: '#06B6D4', bg: 'bg-cyan-500/15   text-cyan-400   border-cyan-500/25',   icon: <Users         className="w-3 h-3" /> },
};

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats, loading }: { stats: CreditLedgerStats | null; loading: boolean }) {
  const items = stats
    ? [
        { label: 'Total Issued',            value: stats.totalIssued.toLocaleString(),          color: '#6C63FF' },
        { label: 'Total Consumed',          value: stats.totalConsumed.toLocaleString(),         color: '#EF4444' },
        { label: 'In Circulation',          value: stats.netCreditsInCirculation.toLocaleString(),color: '#10B981' },
        { label: 'Avg Balance / User',      value: stats.avgBalancePerUser.toFixed(0) + ' cr',   color: '#F59E0B' },
        { label: 'Via Purchases',           value: stats.totalPurchased.toLocaleString(),        color: '#10B981' },
        { label: 'Via Signup Bonuses',      value: stats.totalSignupBonuses.toLocaleString(),    color: '#6C63FF' },
        { label: 'Via Referrals',           value: stats.totalReferralBonuses.toLocaleString(),  color: '#06B6D4' },
        { label: 'Via Admin Grants',        value: stats.totalAdminGrants.toLocaleString(),      color: '#F59E0B' },
      ]
    : Array.from({ length: 8 }).map((_, i) => ({ label: '—', value: '—', color: '#6C63FF' }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] p-3 text-center"
          style={{ background: '#0D0D1A' }}
        >
          {loading ? (
            <>
              <div className="h-5 w-16 bg-white/[0.06] rounded animate-pulse mx-auto mb-1" />
              <div className="h-3 w-20 bg-white/[0.04] rounded animate-pulse mx-auto" />
            </>
          ) : (
            <>
              <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{item.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Type breakdown chart ──────────────────────────────────────────────────────

interface TypeCount { type: string; count: number; totalAmount: number; }

function TypeBreakdownChart({ data, loading }: { data: TypeCount[]; loading: boolean }) {
  if (loading || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name:   TX_META[d.type as CreditTransactionType]?.label ?? d.type,
    count:  d.count,
    total:  Math.abs(d.totalAmount),
    color:  TX_META[d.type as CreditTransactionType]?.color ?? '#6C63FF',
  }));

  return (
    <div
      className="rounded-2xl border border-white/[0.07] p-5 mb-5"
      style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
    >
      <h3 className="text-sm font-semibold text-white mb-4">Transaction Volume by Type</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs" style={{ background: '#13131F' }}>
                  <p className="text-white/50 mb-1">{label}</p>
                  <p className="text-white font-semibold">{payload[0]?.value?.toLocaleString()} transactions</p>
                  <p className="text-white/40">{payload[0]?.payload?.total?.toLocaleString()} credits total</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CreditLedger() {
  const [transactions, setTransactions] = useState<CreditTransactionRow[]>([]);
  const [stats,        setStats]        = useState<CreditLedgerStats | null>(null);
  const [typeCounts,   setTypeCounts]   = useState<TypeCount[]>([]);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [filters, setFilters] = useState<CreditFilters>({
    search:   '',
    type:     'all',
    dateFrom: '',
    dateTo:   '',
    page:     1,
    pageSize: 20,
  });

  // Load stats once
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      const { data } = await adminFetch<{ stats: CreditLedgerStats; typeCounts: TypeCount[] }>(
        '/api/admin/credits/stats',
      );
      if (data) { setStats(data.stats); setTypeCounts(data.typeCounts); }
      setStatsLoading(false);
    })();
  }, []);

  // Load transactions when filters change
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search:   filters.search,
      type:     filters.type,
      dateFrom: filters.dateFrom,
      dateTo:   filters.dateTo,
      page:     String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<CreditTransactionRow>>(
      `/api/admin/credits?${params.toString()}`,
    );
    if (data) {
      setTransactions(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Debounced search
  const handleSearch = useCallback(
    debounce((v: string) => setFilters((f) => ({ ...f, search: v, page: 1 })), 350),
    [],
  );

  return (
    <div>
      {/* Stats summary */}
      <StatsBar stats={stats} loading={statsLoading} />

      {/* Type breakdown chart */}
      <TypeBreakdownChart data={typeCounts} loading={statsLoading} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by user email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all"
          />
        </div>

        {/* Type filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as any, page: 1 }))}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                     text-sm text-white/70 outline-none focus:border-[#6C63FF]/40 transition-all"
        >
          <option value="all">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="consume">Consumed</option>
          <option value="signup_bonus">Signup Bonus</option>
          <option value="admin_grant">Admin Grant</option>
          <option value="referral_bonus">Referral Bonus</option>
          <option value="refund">Refund</option>
        </select>

        {/* Date range */}
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
          {total.toLocaleString()} transactions
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
                <th>Type</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Feature / Pack</th>
                <th>Description</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}>
                        <div className="h-4 bg-white/[0.05] rounded animate-pulse w-full max-w-[100px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/25">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const meta = TX_META[tx.type] ?? TX_META.consume;
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white/70 truncate max-w-[150px]">
                            {tx.userName ?? '—'}
                          </p>
                          <p className="text-[10px] text-white/30 truncate max-w-[150px]">
                            {tx.userEmail ?? tx.userId.slice(0, 12) + '…'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${meta.bg}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span className={`text-sm font-bold tabular-nums ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-white/50 text-sm tabular-nums font-medium">
                        {tx.balanceAfter.toLocaleString()}
                      </td>
                      <td className="text-white/35 text-xs">
                        {tx.feature ?? tx.packId ?? '—'}
                      </td>
                      <td className="text-white/30 text-xs max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      <td className="text-white/25 text-xs whitespace-nowrap">
                        {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
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
              Page {filters.page} of {totalPages} · {total.toLocaleString()} total
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
    </div>
  );
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}