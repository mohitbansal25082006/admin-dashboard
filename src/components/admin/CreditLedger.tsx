'use client';
// Admin-Dashboard/src/components/admin/CreditLedger.tsx
// Part 55.13 — Platform-wide credit ledger with full theme integration and mobile optimization.

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import type {
  CreditLedgerStats,
  CreditTransactionRow,
  CreditTransactionType,
  CreditFilters,
  PaginatedResponse,
} from '@/types/admin';

// ── Shared select styles (theme-aware) ──────────────────────────────────────

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

// ── Transaction type metadata (theme-aware) ─────────────────────────────────

const TX_META: Record<CreditTransactionType, {
  label: string;
  color: string;
  lightColor: string;
  bg: string;
  lightBg: string;
  icon: React.ReactNode;
  description: string;
}> = {
  purchase: {
    label: 'Purchase',
    color: '#10B981',
    lightColor: '#059669',
    bg: 'bg-green-500/15 text-green-400 border-green-500/25',
    lightBg: 'bg-green-100 text-green-700 border-green-300',
    icon: <CreditCard className="w-3 h-3" />,
    description: 'Credits purchased via Razorpay payment'
  },
  consume: {
    label: 'Consumed',
    color: '#EF4444',
    lightColor: '#DC2626',
    bg: 'bg-red-500/15 text-red-400 border-red-500/25',
    lightBg: 'bg-red-100 text-red-700 border-red-300',
    icon: <TrendingDown className="w-3 h-3" />,
    description: 'Credits used for a platform feature'
  },
  refund: {
    label: 'Refund',
    color: '#3B82F6',
    lightColor: '#2563EB',
    bg: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    lightBg: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: <RefreshCw className="w-3 h-3" />,
    description: 'Credits refunded to user account'
  },
  signup_bonus: {
    label: 'Signup Bonus',
    color: '#8B5CF6',
    lightColor: '#7C3AED',
    bg: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    lightBg: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: <Gift className="w-3 h-3" />,
    description: 'Bonus credits given on account creation'
  },
  admin_grant: {
    label: 'Admin Grant',
    color: '#F59E0B',
    lightColor: '#D97706',
    bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    lightBg: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: <ShieldCheck className="w-3 h-3" />,
    description: 'Manual credit adjustment by admin'
  },
  referral_bonus: {
    label: 'Referral Bonus',
    color: '#EC4899',
    lightColor: '#DB2777',
    bg: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
    lightBg: 'bg-pink-100 text-pink-700 border-pink-300',
    icon: <Users className="w-3 h-3" />,
    description: 'Credits earned from referral programme'
  },
};

function getTxStyles(type: CreditTransactionType, isLight: boolean): string {
  const meta = TX_META[type];
  if (!meta) return isLight ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/5 text-white/40 border-white/10';
  return isLight ? meta.lightBg : meta.bg;
}

// ── Transaction detail sheet (theme-aware) ──────────────────────────────────

function TransactionDetailSheet({
  tx,
  onClose,
}: {
  tx: CreditTransactionRow;
  onClose: () => void;
}) {
  const { isLight } = useTheme();
  const meta = TX_META[tx.type] ?? TX_META.purchase;
  const isPositive = tx.amount > 0;
  const balanceBefore = tx.balanceAfter - tx.amount;

  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';
  const cardBg = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
  
  const color = isLight ? meta.lightColor : meta.color;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[440px] z-50
                   flex flex-col border-l overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: borderColor }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
              style={{
                background: isLight ? `${color}18` : `${color}18`,
                borderColor: isLight ? `${color}35` : `${color}35`,
              }}
            >
              <span style={{ color: color }}>{meta.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{meta.label}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: textMuted }}>{meta.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 transition-colors shrink-0" style={{ color: textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount hero */}
        <div
          className="px-4 sm:px-6 py-5 border-b shrink-0"
          style={{
            borderColor: borderColor,
            background: isPositive
              ? isLight ? 'rgba(5,150,105,0.06)' : 'rgba(16,185,129,0.06)'
              : isLight ? 'rgba(220,38,38,0.06)' : 'rgba(239,68,68,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: isPositive
                  ? isLight ? 'rgba(5,150,105,0.15)' : 'rgba(16,185,129,0.15)'
                  : isLight ? 'rgba(220,38,38,0.15)' : 'rgba(239,68,68,0.15)',
              }}
            >
              {isPositive
                ? <ArrowUpRight className="w-5 h-5" style={{ color: isLight ? '#059669' : '#10B981' }} />
                : <ArrowDownRight className="w-5 h-5" style={{ color: isLight ? '#DC2626' : '#EF4444' }} />
              }
            </div>
            <div>
              <p className="text-3xl font-black tabular-nums"
                style={{ color: isPositive ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444') }}>
                {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                <span className="text-base font-semibold ml-1" style={{ opacity: 0.6 }}>cr</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                {isPositive ? 'Credits added' : 'Credits deducted'}
              </p>
            </div>
          </div>

          {/* Balance before → after */}
          <div className="flex items-center gap-3 mt-4 px-3 py-2.5 rounded-xl border" style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}>
            <div className="text-center flex-1">
              <p className="text-xs font-bold tabular-nums" style={{ color: textMuted }}>{balanceBefore.toLocaleString()}</p>
              <p className="text-[10px] mt-0.5" style={{ color: textMutedLight }}>Balance Before</p>
            </div>
            <div className="text-xs" style={{ color: textMuted }}>→</div>
            <div className="text-center flex-1">
              <p className="text-xs font-bold tabular-nums" style={{ color: textPrimary }}>{tx.balanceAfter.toLocaleString()}</p>
              <p className="text-[10px] mt-0.5" style={{ color: textMutedLight }}>Balance After</p>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col gap-5">

            <Section title="User" isLight={isLight}>
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={tx.userName ?? '—'} isLight={isLight} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Email" value={tx.userEmail ?? '—'} isLight={isLight} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="User ID" value={tx.userId} mono isLight={isLight} />
            </Section>

            <Section title="Transaction" isLight={isLight}>
              <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="TX ID" value={tx.id} mono truncate isLight={isLight} />
              <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Timestamp"
                value={format(new Date(tx.createdAt), 'MMM d, yyyy · HH:mm:ss')} isLight={isLight} />
              <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label="Type" value={meta.label} isLight={isLight} />
            </Section>

            <Section title="Description" isLight={isLight}>
              <div className="rounded-xl p-3 border" style={{
                backgroundColor: cardBg,
                borderColor: borderColor,
              }}>
                <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{tx.description}</p>
              </div>
            </Section>

            {tx.feature && (
              <Section title="Feature Used" isLight={isLight}>
                <div className="rounded-xl px-3 py-2.5 border" style={{
                  backgroundColor: isLight ? 'rgba(220,38,38,0.05)' : 'rgba(239,68,68,0.05)',
                  borderColor: isLight ? 'rgba(220,38,38,0.15)' : 'rgba(239,68,68,0.15)',
                }}>
                  <p className="text-xs font-medium capitalize" style={{ color: isLight ? '#DC2626' : '#F87171' }}>
                    {tx.feature.replace(/_/g, ' ')}
                  </p>
                </div>
              </Section>
            )}

            {tx.packId && (
              <Section title="Pack Purchased" isLight={isLight}>
                <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Pack ID" value={tx.packId} mono isLight={isLight} />
              </Section>
            )}

            {tx.orderId && (
              <Section title="Razorpay Order" isLight={isLight}>
                <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Order ID" value={tx.orderId} mono truncate isLight={isLight} />
                <a
                  href={`https://dashboard.razorpay.com/app/orders/${tx.orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs transition-colors mt-1"
                  style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}
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

// ── Helpers (theme-aware) ────────────────────────────────────────────────────

function Section({ title, children, isLight }: { title: string; children: React.ReactNode; isLight: boolean }) {
  const textMuted = isLight ? '#888' : 'var(--text-muted)';
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function InfoRow({
  icon, label, value, mono = false, truncate = false, isLight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  isLight: boolean;
}) {
  const textMuted = isLight ? '#888' : 'var(--text-muted)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="shrink-0 mt-0.5" style={{ color: textMuted }}>{icon}</span>
      <span className="shrink-0 w-20" style={{ color: textMuted }}>{label}:</span>
      <span className={`flex-1 break-all ${mono ? 'font-mono text-[10px]' : ''} ${truncate ? 'truncate' : ''}`}
        style={{ color: textSecondary }}>
        {value}
      </span>
    </div>
  );
}

// ── Stat cards (theme-aware) ────────────────────────────────────────────────

function StatsRow({ stats, loading }: { stats: CreditLedgerStats | null; loading: boolean }) {
  const { isLight } = useTheme();
  
  const cards = [
    { label: 'Total Issued', value: stats?.totalIssued.toLocaleString() ?? '—', color: isLight ? '#059669' : '#10B981', icon: <TrendingUp className="w-4 h-4" />, sub: 'credits ever granted' },
    { label: 'Total Consumed', value: stats?.totalConsumed.toLocaleString() ?? '—', color: isLight ? '#DC2626' : '#EF4444', icon: <TrendingDown className="w-4 h-4" />, sub: 'credits used for features' },
    { label: 'In Circulation', value: stats?.netCreditsInCirculation.toLocaleString() ?? '—', color: isLight ? '#5B52E0' : '#6C63FF', icon: <Wallet className="w-4 h-4" />, sub: 'issued minus consumed' },
    { label: 'Avg Balance / User', value: stats?.avgBalancePerUser.toLocaleString() ?? '—', color: isLight ? '#2563EB' : '#3B82F6', icon: <Users className="w-4 h-4" />, sub: 'across all accounts' },
    { label: 'Purchased', value: stats?.totalPurchased.toLocaleString() ?? '—', color: isLight ? '#D97706' : '#F59E0B', icon: <CreditCard className="w-4 h-4" />, sub: 'via Razorpay payments' },
    { label: 'Referral Bonuses', value: stats?.totalReferralBonuses.toLocaleString() ?? '—', color: isLight ? '#DB2777' : '#EC4899', icon: <Users className="w-4 h-4" />, sub: 'from referral programme' },
    { label: 'Admin Grants', value: stats?.totalAdminGrants.toLocaleString() ?? '—', color: isLight ? '#EA580C' : '#F97316', icon: <ShieldCheck className="w-4 h-4" />, sub: 'manual admin adjustments' },
  ];

  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
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
              <div className="h-3 w-20 sm:w-24 rounded animate-pulse" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
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

// ── Economy health bar (theme-aware) ────────────────────────────────────────

function EconomyHealthBar({ stats, loading }: { stats: CreditLedgerStats | null; loading: boolean }) {
  const { isLight } = useTheme();
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  
  if (loading || !stats) {
    return (
      <div className="rounded-2xl border p-5 mb-5" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
        <div className="h-4 rounded animate-pulse w-48 mb-3" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded animate-pulse w-full" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
      </div>
    );
  }

  const pct = stats.totalIssued > 0
    ? Math.min(100, (stats.totalConsumed / stats.totalIssued) * 100)
    : 0;
  const healthColor = pct > 80 ? (isLight ? '#059669' : '#10B981') : pct > 50 ? (isLight ? '#D97706' : '#F59E0B') : (isLight ? '#DC2626' : '#EF4444');

  return (
    <div className="rounded-2xl border p-5 mb-5" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Credit Economy Health</h3>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>Credits consumed vs issued — higher % means strong engagement</p>
        </div>
        <span className="text-sm font-bold" style={{ color: healthColor }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: healthColor }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: textMuted }}>
        <span>0 consumed</span>
        <span>{stats.totalConsumed.toLocaleString()} / {stats.totalIssued.toLocaleString()} credits</span>
      </div>
    </div>
  );
}

// ── Type breakdown bar chart ──────────────────────────────────────────────────

interface TypeCount { type: string; total: number; label: string; color: string; }

function TypeBreakdownChart({ data, loading }: { data: TypeCount[]; loading: boolean }) {
  const { isLight } = useTheme();
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  
  if (loading || !data || data.length === 0) return null;

  return (
    <div className="rounded-2xl border p-5 mb-5" style={{ backgroundColor: cardBg, borderColor: borderColor }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Credits by Type</h3>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>Total credits distributed per transaction type</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'} />
          <XAxis 
            dataKey="label" 
            tick={{ fill: isLight ? '#666' : 'rgba(255,255,255,0.3)', fontSize: 10 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            tick={{ fill: isLight ? '#666' : 'rgba(255,255,255,0.3)', fontSize: 10 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload as TypeCount;
            return (
              <div className="rounded-xl border px-3 py-2 text-xs" style={{
                backgroundColor: isLight ? '#FFFFFF' : '#13131F',
                borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
              }}>
                <p className="mb-1" style={{ color: isLight ? '#666' : 'rgba(255,255,255,0.5)' }}>{d.label}</p>
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

// ── Main CreditLedger (theme-aware + mobile optimized) ──────────────────────

export function CreditLedger() {
  const { isLight } = useTheme();
  const [stats, setStats] = useState<CreditLedgerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(true);
  const [selected, setSelected] = useState<CreditTransactionRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [filters, setFilters] = useState<CreditFilters>({
    search: '', type: 'all', dateFrom: '', dateTo: '', page: 1, pageSize: 20,
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

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: value, page: 1 }));
    }, 350);
  };

  // Chart data
  const typeChartData: TypeCount[] = stats
    ? [
        { type: 'purchase', total: stats.totalPurchased, label: 'Purchase', color: isLight ? '#059669' : '#10B981' },
        { type: 'referral_bonus', total: stats.totalReferralBonuses, label: 'Referral', color: isLight ? '#DB2777' : '#EC4899' },
        { type: 'admin_grant', total: stats.totalAdminGrants, label: 'Admin', color: isLight ? '#D97706' : '#F59E0B' },
      ].filter(d => d.total > 0)
    : [];

  const selectStyles = getSelectStyles(isLight);
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <StatsRow stats={stats} loading={statsLoading} />
      <EconomyHealthBar stats={stats} loading={statsLoading} />
      <TypeBreakdownChart data={typeChartData} loading={statsLoading} />

      {/* Filters - mobile responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
          <input
            type="text"
            placeholder="Search by user email or description…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>

        {/* Type filter */}
        <select
          value={filters.type}
          onChange={(e) => setFilters(f => ({ ...f, type: e.target.value as any, page: 1 }))}
          style={selectStyles}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <option value="all" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>All Types</option>
          <option value="purchase" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Purchase</option>
          <option value="consume" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Consumed</option>
          <option value="signup_bonus" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Signup Bonus</option>
          <option value="referral_bonus" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Referral Bonus</option>
          <option value="admin_grant" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Admin Grant</option>
          <option value="refund" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Refund</option>
        </select>

        {/* Date range - responsive */}
        <div className="flex items-center gap-1 flex-wrap">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value, page: 1 }))}
            className="rounded-xl px-2 sm:px-3 py-2.5 text-xs sm:text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
          <span className="text-xs" style={{ color: textMuted }}>to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value, page: 1 }))}
            className="rounded-xl px-2 sm:px-3 py-2.5 text-xs sm:text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>

        <div className="text-xs text-right sm:ml-auto whitespace-nowrap" style={{ color: textMuted }}>
          {total.toLocaleString()} transactions
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
            {txLoading ? (
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
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Wallet className="w-12 h-12 mb-3 opacity-30" style={{ color: textMuted }} />
                <p className="text-base font-medium" style={{ color: textMuted }}>No transactions found</p>
              </div>
            ) : (
              transactions.map((tx) => {
                const meta = TX_META[tx.type] ?? TX_META.purchase;
                const isPositive = tx.amount > 0;
                const txStyles = getTxStyles(tx.type, isLight);
                
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="rounded-xl border p-4 space-y-3 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: borderColor,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${txStyles}`}>
                        {meta.icon}{meta.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: isPositive ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444') }}>
                        {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium" style={{ color: textPrimary }}>{tx.userName ?? '—'}</p>
                      <p className="text-[10px]" style={{ color: textMuted }}>{tx.userEmail ?? tx.userId.slice(0, 16)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[10px]" style={{ color: textMuted }}>{tx.description}</span>
                      {tx.feature && (
                        <span className="text-[10px] capitalize px-2 py-0.5 rounded-full" style={{
                          backgroundColor: isLight ? 'rgba(220,38,38,0.05)' : 'rgba(239,68,68,0.05)',
                          color: isLight ? '#DC2626' : '#F87171',
                        }}>
                          {tx.feature.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: textMuted }}>
                        {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <Arrow className="w-3.5 h-3.5" style={{ color: textMuted }} />
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
                    <th style={{ color: textMuted }}>Type</th>
                    <th style={{ color: textMuted }}>Amount</th>
                    <th style={{ color: textMuted }}>Balance After</th>
                    <th style={{ color: textMuted }}>Description</th>
                    <th style={{ color: textMuted }}>When</th>
                    <th style={{ color: textMuted }}></th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j}><div className="h-4 rounded animate-pulse max-w-[120px]" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16" style={{ color: textMuted }}>
                        <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
                        No transactions found
                      </td>
                    </tr>
                  ) : transactions.map((tx) => {
                    const meta = TX_META[tx.type] ?? TX_META.purchase;
                    const isPositive = tx.amount > 0;
                    const txStyles = getTxStyles(tx.type, isLight);
                    
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setSelected(tx)}
                        className="cursor-pointer transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                      >
                        <td>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate max-w-[140px]" style={{ color: textSecondary }}>
                              {tx.userName ?? '—'}
                            </p>
                            <p className="text-[10px] truncate max-w-[140px]" style={{ color: textMuted }}>
                              {tx.userEmail ?? tx.userId.slice(0, 12) + '…'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${txStyles}`}>
                            {meta.icon}{meta.label}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-bold tabular-nums"
                            style={{ color: isPositive ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444') }}>
                            {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="text-sm font-medium tabular-nums" style={{ color: textSecondary }}>
                          {tx.balanceAfter.toLocaleString()}
                        </td>
                        <td>
                          <p className="text-xs truncate max-w-[200px]" style={{ color: textMuted }}>{tx.description}</p>
                          {tx.feature && (
                            <p className="text-[10px] mt-0.5 capitalize" style={{ color: textMutedLight }}>
                              {tx.feature.replace(/_/g, ' ')}
                            </p>
                          )}
                        </td>
                        <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </td>
                        <td><Arrow className="w-3.5 h-3.5" style={{ color: textMuted }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination - desktop */}
            {!txLoading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
                <p className="text-xs" style={{ color: textMuted }}>
                  Page {filters.page} of {totalPages} · {total.toLocaleString()} transactions
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
        {isMobile && !txLoading && totalPages > 1 && (
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

      {selected && (
        <TransactionDetailSheet tx={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}