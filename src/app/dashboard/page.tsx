'use client';
// Admin-Dashboard/src/app/dashboard/page.tsx
// Part 31B — Overview dashboard: metrics grid + 7-day activity chart.

import { useState, useEffect, useCallback } from 'react';
import {
  Users, FileText, CreditCard, IndianRupee,
  Building2, Mic2, MessagesSquare, GraduationCap,
  TrendingUp, Zap, Database,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { Header }      from '@/components/admin/Header';
import { MetricCard }  from '@/components/admin/MetricCard';
import { ActivityChart } from '@/components/admin/ActivityChart';
import type { PlatformMetrics, DailyActivity } from '@/types/admin';

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtINR(n: number): string {
  if (n >= 100_000) return '₹' + (n / 100_000).toFixed(1) + 'L';
  if (n >= 1_000)   return '₹' + (n / 1_000).toFixed(1)   + 'K';
  return '₹' + n.toFixed(0);
}

// Credit economy health bar
function CreditHealthBar({ issued, consumed }: { issued: number; consumed: number }) {
  const pct = issued > 0 ? Math.min(100, Math.round((consumed / issued) * 100)) : 0;
  return (
    <div
      className="rounded-2xl border border-white/[0.07] p-5 col-span-full"
      style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Credit Economy Health</h3>
          <p className="text-xs text-white/35 mt-0.5">
            {fmt(consumed)} of {fmt(issued)} issued credits consumed ({pct}%)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-white/40">
            <span className="w-2 h-2 rounded-full bg-[#6C63FF]" />
            Consumed
          </span>
          <span className="flex items-center gap-1.5 text-white/40">
            <span className="w-2 h-2 rounded-full bg-white/15" />
            In Circulation
          </span>
        </div>
      </div>
      <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct > 80
              ? 'linear-gradient(90deg, #EF4444, #F97316)'
              : pct > 50
              ? 'linear-gradient(90deg, #F59E0B, #6C63FF)'
              : 'linear-gradient(90deg, #6C63FF, #10B981)',
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-white/25">
        <span>0</span>
        <span>{fmt(issued)} total issued</span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [metrics,    setMetrics]    = useState<PlatformMetrics | null>(null);
  const [activity,   setActivity]   = useState<DailyActivity[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);

    const [metricsRes, activityRes] = await Promise.all([
      adminFetch<PlatformMetrics>('/api/admin/metrics'),
      adminFetch<DailyActivity[]>('/api/admin/metrics/activity'),
    ]);

    if (metricsRes.data)  setMetrics(metricsRes.data);
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

      {/* Primary metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
        <div className="grid grid-cols-1 gap-4 mb-4">
          <CreditHealthBar issued={m.totalCreditsIssued} consumed={m.totalCreditsConsumed} />
        </div>
      )}

      {/* Activity chart */}
      <ActivityChart data={activity} loading={loading} />

      {/* Today summary strip */}
      {m && !loading && (
        <div className="mt-4 grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'New Users Today',     value: m.newUsersToday,          color: '#6C63FF' },
            { label: 'Reports Today',        value: m.reportsToday,           color: '#10B981' },
            { label: 'Revenue Today',        value: fmtINR(m.revenueTodayInr), color: '#F59E0B' },
            { label: 'Credits Consumed Today', value: fmt(m.creditsConsumedToday), color: '#3B82F6' },
            { label: 'Credits Issued Total', value: fmt(m.totalCreditsIssued), color: '#8B5CF6' },
            { label: 'Net Revenue Month',    value: fmtINR(m.revenueMonthInr), color: '#10B981' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/[0.06] p-3 text-center"
              style={{ background: '#0D0D1A' }}
            >
              <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}