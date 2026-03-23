'use client';
// Admin-Dashboard/src/components/admin/CreditLedger.tsx
// Part 31 — Platform-wide credit ledger: stats + paginated transaction table.
// Part 32 FIX  — TypeBreakdownChart crash fixed.
// Part 32 UPDATE — Transaction detail sheet on row click.
// Part 32 UPDATE v2 — Removed "Signup Bonuses" stat card.
// Part 32 UPDATE v3 — Dropdowns always visible (border/text/bg fix).

import { useState, useEffect, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, CreditCard,
  TrendingUp, TrendingDown, Wallet, Users, Gift,
  ShieldCheck, RefreshCw, Loader2, X,
  Hash, Calendar, User, FileText, Tag,
  ArrowUpRight, ArrowDownRight, ChevronRight as Arrow,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import type {
  CreditLedgerStats,
  CreditTransactionRow,
  CreditTransactionType,
  CreditFilters,
  PaginatedResponse,
} from '@/types/admin';

// ── Shared select styles (always visible) ────────────────────────────────────

const CHEVRON_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

const SELECT_CLASS =
  'bg-[#13132A] border border-white/20 rounded-xl px-3 py-2.5 ' +
  'text-sm text-white/90 outline-none hover:border-white/30 ' +
  'focus:border-[#6C63FF]/60 transition-all cursor-pointer appearance-none pr-8';

const SELECT_STYLE: React.CSSProperties = {
  backgroundImage:    CHEVRON_BG,
  backgroundRepeat:   'no-repeat',
  backgroundPosition: 'right 10px center',
};

const OPT: React.CSSProperties = { background: '#13132A', color: '#fff' };

// ── Transaction type metadata ─────────────────────────────────────────────────

const TX_META: Record<CreditTransactionType, {
  label:       string;
  color:       string;
  bg:          string;
  icon:        React.ReactNode;
  description: string;
}> = {
  purchase:       { label: 'Purchase',       color: '#10B981', bg: 'bg-green-500/15  text-green-400  border-green-500/25',   icon: <CreditCard   className="w-3 h-3" />, description: 'Credits purchased via Razorpay payment'    },
  consume:        { label: 'Consumed',       color: '#EF4444', bg: 'bg-red-500/15    text-red-400    border-red-500/25',     icon: <TrendingDown className="w-3 h-3" />, description: 'Credits used for a platform feature'        },
  refund:         { label: 'Refund',         color: '#3B82F6', bg: 'bg-blue-500/15   text-blue-400   border-blue-500/25',   icon: <RefreshCw    className="w-3 h-3" />, description: 'Credits refunded to user account'           },
  signup_bonus:   { label: 'Signup Bonus',   color: '#8B5CF6', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/25', icon: <Gift         className="w-3 h-3" />, description: 'Bonus credits given on account creation'    },
  admin_grant:    { label: 'Admin Grant',    color: '#F59E0B', bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25', icon: <ShieldCheck  className="w-3 h-3" />, description: 'Manual credit adjustment by admin'           },
  referral_bonus: { label: 'Referral Bonus', color: '#EC4899', bg: 'bg-pink-500/15   text-pink-400   border-pink-500/25',   icon: <Users        className="w-3 h-3" />, description: 'Credits earned from referral programme'      },
};

// ── Transaction detail sheet ──────────────────────────────────────────────────

function TransactionDetailSheet({
  tx,
  onClose,
}: {
  tx:      CreditTransactionRow;
  onClose: () => void;
}) {
  const meta          = TX_META[tx.type] ?? TX_META.purchase;
  const isPositive    = tx.amount > 0;
  const balanceBefore = tx.balanceAfter - tx.amount;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[440px] z-50
                   flex flex-col border-l border-white/[0.07] overflow-hidden"
        style={{ background: '#0D0D1A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
              style={{ background: `${meta.color}18`, borderColor: `${meta.color}35` }}
            >
              <span style={{ color: meta.color }}>{meta.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{meta.label}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{meta.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/35 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount hero */}
        <div
          className="px-6 py-5 border-b border-white/[0.06] shrink-0"
          style={{
            background: isPositive
              ? 'linear-gradient(135deg,rgba(16,185,129,0.06) 0%,transparent 100%)'
              : 'linear-gradient(135deg,rgba(239,68,68,0.06) 0%,transparent 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}
            >
              {isPositive
                ? <ArrowUpRight   className="w-5 h-5 text-green-400" />
                : <ArrowDownRight className="w-5 h-5 text-red-400"   />
              }
            </div>
            <div>
              <p className="text-3xl font-black tabular-nums"
                style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                <span className="text-base font-semibold ml-1" style={{ opacity: 0.6 }}>cr</span>
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                {isPositive ? 'Credits added' : 'Credits deducted'}
              </p>
            </div>
          </div>

          {/* Balance before → after */}
          <div className="flex items-center gap-3 mt-4 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="text-center flex-1">
              <p className="text-xs font-bold text-white/60 tabular-nums">{balanceBefore.toLocaleString()}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Balance Before</p>
            </div>
            <div className="text-white/20 text-xs">→</div>
            <div className="text-center flex-1">
              <p className="text-xs font-bold text-white/80 tabular-nums">{tx.balanceAfter.toLocaleString()}</p>
              <p className="text-[10px] text-white/30 mt-0.5">Balance After</p>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">

            <Section title="User">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name"    value={tx.userName  ?? '—'} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Email"   value={tx.userEmail ?? '—'} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="User ID" value={tx.userId} mono />
            </Section>

            <Section title="Transaction">
              <InfoRow icon={<Hash     className="w-3.5 h-3.5" />} label="TX ID"     value={tx.id} mono truncate />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Timestamp"
                value={format(new Date(tx.createdAt), 'MMM d, yyyy · HH:mm:ss')} />
              <InfoRow icon={<Tag      className="w-3.5 h-3.5" />} label="Type"      value={meta.label} />
            </Section>

            <Section title="Description">
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                <p className="text-xs text-white/60 leading-relaxed">{tx.description}</p>
              </div>
            </Section>

            {tx.feature && (
              <Section title="Feature Used">
                <div className="bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-red-300/80 font-medium capitalize">
                    {tx.feature.replace(/_/g, ' ')}
                  </p>
                </div>
              </Section>
            )}

            {tx.packId && (
              <Section title="Pack Purchased">
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Pack ID" value={tx.packId} mono />
              </Section>
            )}

            {tx.orderId && (
              <Section title="Razorpay Order">
                <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Order ID" value={tx.orderId} mono truncate />
                <a
                  href={`https://dashboard.razorpay.com/app/orders/${tx.orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#6C63FF]
                             hover:text-[#8B84FF] transition-colors mt-1"
                >
                  <Arrow className="w-3 h-3" />
                  View in Razorpay Dashboard
                </a>
              </Section>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function InfoRow({
  icon, label, value, mono = false, truncate = false,
}: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean; truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-white/25 shrink-0 mt-0.5">{icon}</span>
      <span className="text-white/35 shrink-0 w-20">{label}:</span>
      <span className={`text-white/65 flex-1 break-all ${mono ? 'font-mono text-[10px]' : ''} ${truncate ? 'truncate' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatsRow({ stats, loading }: { stats: CreditLedgerStats | null; loading: boolean }) {
  // Part 32 UPDATE v2: "Signup Bonuses" card removed per product requirement.
  const cards = [
    { label: 'Total Issued',       value: stats?.totalIssued.toLocaleString()              ?? '—', color: '#10B981', icon: <TrendingUp   className="w-4 h-4" />, sub: 'credits ever granted'     },
    { label: 'Total Consumed',     value: stats?.totalConsumed.toLocaleString()            ?? '—', color: '#EF4444', icon: <TrendingDown className="w-4 h-4" />, sub: 'credits used for features' },
    { label: 'In Circulation',     value: stats?.netCreditsInCirculation.toLocaleString() ?? '—', color: '#6C63FF', icon: <Wallet       className="w-4 h-4" />, sub: 'issued minus consumed'     },
    { label: 'Avg Balance / User', value: stats?.avgBalancePerUser.toLocaleString()        ?? '—', color: '#3B82F6', icon: <Users        className="w-4 h-4" />, sub: 'across all accounts'      },
    { label: 'Purchased',          value: stats?.totalPurchased.toLocaleString()           ?? '—', color: '#F59E0B', icon: <CreditCard   className="w-4 h-4" />, sub: 'via Razorpay payments'     },
    { label: 'Referral Bonuses',   value: stats?.totalReferralBonuses.toLocaleString()     ?? '—', color: '#EC4899', icon: <Users        className="w-4 h-4" />, sub: 'from referral programme'   },
    { label: 'Admin Grants',       value: stats?.totalAdminGrants.toLocaleString()         ?? '—', color: '#F97316', icon: <ShieldCheck  className="w-4 h-4" />, sub: 'manual admin adjustments'  },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] p-4"
          style={{ background: 'linear-gradient(135deg,#13131F 0%,#0F0F1C 100%)' }}
        >
          {loading ? (
            <>
              <div className="h-6 w-16 bg-white/[0.06] rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
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

// ── Economy health bar ────────────────────────────────────────────────────────

function EconomyHealthBar({ stats, loading }: { stats: CreditLedgerStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="rounded-2xl border border-white/[0.07] p-5 mb-5"
        style={{ background: 'linear-gradient(135deg,#13131F 0%,#0F0F1C 100%)' }}>
        <div className="h-4 bg-white/[0.05] rounded animate-pulse w-48 mb-3" />
        <div className="h-3 bg-white/[0.04] rounded animate-pulse w-full" />
      </div>
    );
  }

  const pct = stats.totalIssued > 0
    ? Math.min(100, (stats.totalConsumed / stats.totalIssued) * 100)
    : 0;
  const healthColor = pct > 80 ? '#10B981' : pct > 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5 mb-5"
      style={{ background: 'linear-gradient(135deg,#13131F 0%,#0F0F1C 100%)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Credit Economy Health</h3>
          <p className="text-xs text-white/35 mt-0.5">Credits consumed vs issued — higher % means strong engagement</p>
        </div>
        <span className="text-sm font-bold" style={{ color: healthColor }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: healthColor }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
        <span>0 consumed</span>
        <span>{stats.totalConsumed.toLocaleString()} / {stats.totalIssued.toLocaleString()} credits</span>
      </div>
    </div>
  );
}

// ── Type breakdown bar chart ──────────────────────────────────────────────────

interface TypeCount { type: string; total: number; label: string; color: string; }

function TypeBreakdownChart({ data, loading }: { data: TypeCount[]; loading: boolean }) {
  if (loading || !data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5 mb-5"
      style={{ background: 'linear-gradient(135deg,#13131F 0%,#0F0F1C 100%)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Credits by Type</h3>
          <p className="text-xs text-white/35 mt-0.5">Total credits distributed per transaction type</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload as TypeCount;
            return (
              <div className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs" style={{ background: '#13131F' }}>
                <p className="text-white/50 mb-1">{d.label}</p>
                <p className="font-bold" style={{ color: d.color }}>{d.total.toLocaleString()} credits</p>
              </div>
            );
          }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => <Cell key={index} fill={entry.color} opacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main CreditLedger ─────────────────────────────────────────────────────────

export function CreditLedger() {
  const [stats,        setStats]        = useState<CreditLedgerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransactionRow[]>([]);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [txLoading,    setTxLoading]    = useState(true);
  const [selected,     setSelected]     = useState<CreditTransactionRow | null>(null);

  const [filters, setFilters] = useState<CreditFilters>({
    search: '', type: 'all', dateFrom: '', dateTo: '', page: 1, pageSize: 20,
  });

  // ── Load stats ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      const { data } = await adminFetch<CreditLedgerStats>('/api/admin/credits/stats');
      if (data) setStats(data);
      setStatsLoading(false);
    })();
  }, []);

  // ── Load transactions ─────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    const params = new URLSearchParams({
      search: filters.search, type: filters.type,
      dateFrom: filters.dateFrom, dateTo: filters.dateTo,
      page: String(filters.page), pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<CreditTransactionRow>>(
      `/api/admin/credits?${params.toString()}`,
    );
    if (data) { setTransactions(data.data); setTotal(data.total); setTotalPages(data.totalPages); }
    setTxLoading(false);
  }, [filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleSearch = useCallback(
    debounce((v: string) => setFilters(f => ({ ...f, search: v, page: 1 })), 350),
    [],
  );

  // Chart data — always [] never undefined
  const typeChartData: TypeCount[] = stats
    ? [
        { type: 'purchase',       total: stats.totalPurchased,       label: 'Purchase', color: TX_META.purchase.color       },
        { type: 'referral_bonus', total: stats.totalReferralBonuses, label: 'Referral', color: TX_META.referral_bonus.color },
        { type: 'admin_grant',    total: stats.totalAdminGrants,     label: 'Admin',    color: TX_META.admin_grant.color    },
      ].filter(d => d.total > 0)
    : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <StatsRow stats={stats} loading={statsLoading} />
      <EconomyHealthBar stats={stats} loading={statsLoading} />
      <TypeBreakdownChart data={typeChartData} loading={statsLoading} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by user email or description…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all"
          />
        </div>

        {/* Type filter — always visible */}
        <select
          value={filters.type}
          onChange={(e) => setFilters(f => ({ ...f, type: e.target.value as any, page: 1 }))}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
        >
          <option value="all"            style={OPT}>All Types</option>
          <option value="purchase"       style={OPT}>Purchase</option>
          <option value="consume"        style={OPT}>Consumed</option>
          <option value="signup_bonus"   style={OPT}>Signup Bonus</option>
          <option value="referral_bonus" style={OPT}>Referral Bonus</option>
          <option value="admin_grant"    style={OPT}>Admin Grant</option>
          <option value="refund"         style={OPT}>Refund</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value, page: 1 }))}
            className="bg-[#13132A] border border-white/20 rounded-xl px-3 py-2.5
                       text-sm text-white/90 outline-none hover:border-white/30
                       focus:border-[#6C63FF]/60 transition-all cursor-pointer"
          />
          <span className="text-white/25 text-sm">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value, page: 1 }))}
            className="bg-[#13132A] border border-white/20 rounded-xl px-3 py-2.5
                       text-sm text-white/90 outline-none hover:border-white/30
                       focus:border-[#6C63FF]/60 transition-all cursor-pointer"
          />
        </div>

        <div className="ml-auto text-xs text-white/30 whitespace-nowrap">
          {total.toLocaleString()} transactions
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: '#0D0D1A' }}>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>User</th><th>Type</th><th>Amount</th>
                <th>Balance After</th><th>Description</th><th>When</th><th></th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}><div className="h-4 bg-white/[0.05] rounded animate-pulse max-w-[120px]" /></td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/25">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No transactions found
                  </td>
                </tr>
              ) : transactions.map((tx) => {
                const meta       = TX_META[tx.type] ?? TX_META.purchase;
                const isPositive = tx.amount > 0;
                return (
                  <tr
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <td>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/70 truncate max-w-[140px]">{tx.userName ?? '—'}</p>
                        <p className="text-[10px] text-white/30 truncate max-w-[140px]">
                          {tx.userEmail ?? tx.userId.slice(0, 12) + '…'}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${meta.bg}`}>
                        {meta.icon}{meta.label}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm font-bold tabular-nums"
                        style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                        {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-sm text-white/55 tabular-nums font-medium">
                      {tx.balanceAfter.toLocaleString()}
                    </td>
                    <td>
                      <p className="text-xs text-white/45 truncate max-w-[200px]">{tx.description}</p>
                      {tx.feature && (
                        <p className="text-[10px] text-white/25 mt-0.5 capitalize">
                          {tx.feature.replace(/_/g, ' ')}
                        </p>
                      )}
                    </td>
                    <td className="text-xs text-white/30 whitespace-nowrap">
                      {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                    </td>
                    <td><Arrow className="w-3.5 h-3.5 text-white/20" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!txLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">
              Page {filters.page} of {totalPages} · {total.toLocaleString()} transactions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
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
                    onClick={() => setFilters(f => ({ ...f, page: p }))}
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
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
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

      {selected && (
        <TransactionDetailSheet tx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ── Simple debounce utility ───────────────────────────────────────────────────

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}