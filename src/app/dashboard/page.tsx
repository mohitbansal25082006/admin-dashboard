'use client';
// Admin-Dashboard/src/app/dashboard/page.tsx
// Part 55.13 — Updated with theme-aware styling and mobile-responsive cards.

import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, CreditCard, IndianRupee,
  Building2, Mic2, MessagesSquare, GraduationCap,
  TrendingUp, Zap, Database,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { Header } from '@/components/admin/Header';
import { MetricCard } from '@/components/admin/MetricCard';
import { ActivityChart } from '@/components/admin/ActivityChart';
import type { PlatformMetrics, DailyActivity } from '@/types/admin';
import { useTheme } from '../../context/ThemeContext';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtINR(n: number): string {
  if (n >= 100_000) return '₹' + (n / 100_000).toFixed(1) + 'L';
  if (n >= 1_000) return '₹' + (n / 1_000).toFixed(1) + 'K';
  return '₹' + n.toFixed(0);
}

function CreditHealthBar({ issued, consumed }: { issued: number; consumed: number }) {
  const pct = issued > 0 ? Math.min(100, Math.round((consumed / issued) * 100)) : 0;
  const { resolvedMode } = useTheme();
  const isLight = resolvedMode === 'light';

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 col-span-full"
      style={{
        backgroundColor: isLight ? 'var(--background-elevated)' : 'var(--background-card)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Credit Economy Health
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {fmt(consumed)} of {fmt(issued)} issued credits consumed ({pct}%)
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs flex-wrap">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
            Consumed
          </span>
          <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />
            In Circulation
          </span>
        </div>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct > 80
              ? `linear-gradient(90deg, var(--error), var(--warning))`
              : pct > 50
              ? `linear-gradient(90deg, var(--warning), var(--primary))`
              : `linear-gradient(90deg, var(--primary), var(--success))`,
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>0</span>
        <span>{fmt(issued)} total issued</span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { resolvedMode, isLight } = useTheme();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [metricsRes, activityRes] = await Promise.all([
      adminFetch<PlatformMetrics>('/api/admin/metrics'),
      adminFetch<DailyActivity[]>('/api/admin/metrics/activity'),
    ]);

    if (metricsRes.data) setMetrics(metricsRes.data);
    if (activityRes.data) setActivity(activityRes.data);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const m = metrics;

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Platform health snapshot — live data from Supabase"
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
      />

      {/* Primary metrics grid - responsive with no truncation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <MetricCard
          title="Total Users"
          value={m ? fmt(m.totalUsers) : '—'}
          subValue={m ? `+${m.newUsersThisMonth} this month` : undefined}
          subLabel={m ? `+${m.newUsersToday} today` : undefined}
          icon={Users}
          iconColor="bg-[#6C63FF]/15"
          trend={m && m.newUsersToday > 0 ? 'up' : 'neutral'}
          trendValue={m ? `+${m.newUsersToday} today` : undefined}
          loading={loading}
        />
        <MetricCard
          title="Total Reports"
          value={m ? fmt(m.totalReports) : '—'}
          subValue={m ? `+${m.reportsToday} today` : undefined}
          icon={FileText}
          iconColor="bg-blue-500/15"
          trend={m && m.reportsToday > 0 ? 'up' : 'neutral'}
          trendValue={m ? `+${m.reportsToday}` : undefined}
          loading={loading}
        />
        <MetricCard
          title="Revenue (All Time)"
          value={m ? fmtINR(m.totalRevenueInr) : '—'}
          subValue={m ? `${fmtINR(m.revenueMonthInr)} this month` : undefined}
          subLabel={m ? `${fmtINR(m.revenueTodayInr)} today` : undefined}
          icon={IndianRupee}
          iconColor="bg-green-500/15"
          trend="up"
          trendValue={m ? fmtINR(m.revenueMonthInr) + '/mo' : undefined}
          loading={loading}
        />
        <MetricCard
          title="Credits Consumed"
          value={m ? fmt(m.totalCreditsConsumed) : '—'}
          subValue={m ? `${fmt(m.creditsConsumedMonth)} this month` : undefined}
          subLabel={m ? `${fmt(m.creditsConsumedToday)} today` : undefined}
          icon={Zap}
          iconColor="bg-yellow-500/15"
          loading={loading}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <MetricCard
          title="Credits Issued"
          value={m ? fmt(m.totalCreditsIssued) : '—'}
          subValue={m ? `${fmt(m.creditsConsumedMonth)} consumed/mo` : undefined}
          icon={CreditCard}
          iconColor="bg-purple-500/15"
          loading={loading}
        />
        <MetricCard
          title="Workspaces"
          value={m ? fmt(m.activeWorkspaces) : '—'}
          subValue="Active team workspaces"
          icon={Building2}
          iconColor="bg-cyan-500/15"
          loading={loading}
        />
        <MetricCard
          title="Podcasts"
          value={m ? fmt(m.totalPodcasts) : '—'}
          subValue="Completed episodes"
          icon={Mic2}
          iconColor="bg-pink-500/15"
          loading={loading}
        />
        <MetricCard
          title="Debates + Papers"
          value={m ? fmt(m.totalDebates + m.totalAcademicPapers) : '—'}
          subValue={m ? `${fmt(m.totalDebates)} debates · ${fmt(m.totalAcademicPapers)} papers` : undefined}
          icon={GraduationCap}
          iconColor="bg-orange-500/15"
          loading={loading}
        />
      </div>

      {/* Credit economy health bar */}
      {m && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <CreditHealthBar issued={m.totalCreditsIssued} consumed={m.totalCreditsConsumed} />
        </div>
      )}

      {/* Activity chart */}
      <ActivityChart data={activity} loading={loading} />

      {/* Today summary strip - responsive with no truncation */}
      {m && !loading && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: 'New Users Today', value: m.newUsersToday, color: 'var(--primary)' },
            { label: 'Reports Today', value: m.reportsToday, color: 'var(--success)' },
            { label: 'Revenue Today', value: fmtINR(m.revenueTodayInr), color: 'var(--warning)' },
            { label: 'Credits Consumed Today', value: fmt(m.creditsConsumedToday), color: 'var(--info)' },
            { label: 'Credits Issued Total', value: fmt(m.totalCreditsIssued), color: 'var(--secondary)' },
            { label: 'Net Revenue Month', value: fmtINR(m.revenueMonthInr), color: 'var(--success)' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border p-2 sm:p-3 text-center"
              style={{
                backgroundColor: isLight ? 'var(--background-elevated)' : 'var(--background-card)',
                borderColor: 'var(--border)',
              }}
            >
              <p className="text-sm sm:text-base font-bold truncate" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-[8px] sm:text-[10px] mt-0.5 leading-tight truncate" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}