'use client';
// Admin-Dashboard/src/app/dashboard/social/page.tsx
// Part 37 — Social Analytics page.
// Part 37 FIX — Refresh button now passes cache: 'no-store' and a timestamp
//               param to guarantee a real-time response from the database,
//               bypassing any browser or Next.js fetch cache layer.

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, Globe, FileText, Eye, Heart, RefreshCw } from 'lucide-react';
import type {
  SocialAnalytics, TopResearcher,
  FollowGrowthPoint, SocialAnalyticsResponse,
} from '@/types/admin';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://public-reports-three.vercel.app';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = '#6C63FF' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3"
         style={{ background: 'linear-gradient(135deg, #0F0F23 0%, #0A0A1A 100%)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        {sub && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${accent}12`, color: accent, border: `1px solid ${accent}20` }}>
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white leading-tight tracking-tight">
          {typeof value === 'number' ? formatCount(value) : value}
        </p>
        <p className="text-xs text-white/40 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Top researchers table ────────────────────────────────────────────────────

function TopResearchersTable({ researchers }: { researchers: TopResearcher[] }) {
  if (!researchers.length) return (
    <div className="rounded-2xl border border-white/[0.06] p-8 text-center"
         style={{ background: 'linear-gradient(135deg, #0F0F23, #0A0A1A)' }}>
      <p className="text-white/30 text-sm">No public researchers yet.</p>
    </div>
  );

  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: 'linear-gradient(135deg, #0F0F23 0%, #0A0A1A 100%)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="grid gap-4 px-5 py-3 text-[11px] font-bold uppercase tracking-wider border-b"
           style={{ gridTemplateColumns: '2rem 1fr 6rem 6rem 6rem 6rem', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
        <span>#</span><span>Researcher</span>
        <span className="text-right">Followers</span>
        <span className="text-right">Following</span>
        <span className="text-right">All Reports</span>
        <span className="text-right">Public</span>
      </div>
      {researchers.map((r, i) => {
        const initials    = (r.full_name ?? r.username ?? '?').split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase();
        const profileUrl  = r.username ? `${APP_URL}/u/${r.username}` : null;
        const rankColor   = i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : 'rgba(255,255,255,0.25)';
        return (
          <div key={r.id}
            className="grid gap-4 px-5 py-3.5 items-center border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
            style={{ gridTemplateColumns: '2rem 1fr 6rem 6rem 6rem 6rem', borderColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-sm font-bold" style={{ color: rankColor }}>{i + 1}</span>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold overflow-hidden"
                   style={{ background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', color: '#fff' }}>
                {r.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {r.full_name ?? r.username ?? 'Unknown'}
                </p>
                <div className="flex items-center gap-2">
                  {r.username && <p className="text-xs text-white/40 truncate">@{r.username}</p>}
                  {profileUrl && (
                    <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-[#6C63FF] hover:text-[#A78BFA] transition-colors">
                      ↗ Profile
                    </a>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm font-bold text-right" style={{ color: '#6C63FF' }}>{formatCount(r.follower_count)}</p>
            <p className="text-sm text-right text-white/50">{formatCount(r.following_count)}</p>
            <p className="text-sm text-right text-white/70">{formatCount(r.report_count)}</p>
            <p className="text-sm text-right font-semibold" style={{ color: '#10B981' }}>
              {formatCount(r.public_report_count)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Follow growth chart ──────────────────────────────────────────────────────

function FollowGrowthChart({ data }: { data: FollowGrowthPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.new_follows), 1);

  return (
    <div className="rounded-2xl border p-5"
      style={{
        background: 'linear-gradient(135deg, #0F0F23 0%, #0A0A1A 100%)',
        borderColor: 'rgba(255,255,255,0.06)'
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-white">Follow Growth</h3>
          <p className="text-xs text-white/40 mt-0.5">
            New follows per day — last 7 days
          </p>
        </div>
      </div>

      {!data.length ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-white/30 text-sm">No follow data yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />

            <XAxis
              dataKey="day"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(maxVal * 1.2)]}
              allowDecimals={false}
            />

            {/* ✅ FIXED TOOLTIP */}
            <Tooltip
              contentStyle={{
                background: '#0F0F23',
                border: '1px solid rgba(108,99,255,0.3)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 12,
              }}
              labelStyle={{
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 4,
              }}
              formatter={(value: any) => [value ?? 0, 'New follows']}
            />

            <Line
              type="monotone"
              dataKey="new_follows"
              stroke="#6C63FF"
              strokeWidth={2.5}
              dot={{ fill: '#6C63FF', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#A78BFA', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.05] flex gap-4 flex-wrap">
          <div>
            <p className="text-lg font-black text-[#6C63FF]">
              {formatCount(data.reduce((s, d) => s + d.new_follows, 0))}
            </p>
            <p className="text-[10px] text-white/30">Total (7 days)</p>
          </div>

          <div>
            <p className="text-lg font-black text-[#A78BFA]">
              {formatCount(Math.max(...data.map(d => d.new_follows)))}
            </p>
            <p className="text-[10px] text-white/30">Peak day</p>
          </div>

          <div>
            <p className="text-lg font-black text-[#8B5CF6]">
              {formatCount(
                Math.round(
                  data.reduce((s, d) => s + d.new_follows, 0) / data.length
                )
              )}
            </p>
            <p className="text-[10px] text-white/30">Daily avg</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const [data,      setData]      = useState<SocialAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // FIX: Use cache: 'no-store' + timestamp param to guarantee real-time data.
  // This bypasses both the browser HTTP cache and any Next.js fetch cache.
  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else                 setIsLoading(true);
    setError(null);

    try {
      // Timestamp bust prevents ANY stale response from the browser cache
      const res = await fetch(`/api/admin/social?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as SocialAnalyticsResponse;
      setData(json);
      setLastUpdated(new Date());
      if (json.error) setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load social analytics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(false); }, [fetchData]);

  const analytics: SocialAnalytics = data?.analytics ?? {
    follows_today: 0, follows_this_week: 0, follows_all_time: 0,
    public_profiles: 0, public_reports: 0, total_public_views: 0,
  };
  const topResearchers: TopResearcher[]   = data?.topResearchers ?? [];
  const followGrowth:   FollowGrowthPoint[] = data?.followGrowth ?? [];

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 rounded-lg bg-white/[0.05] animate-pulse" />
          <div className="h-4 w-72 rounded-lg bg-white/[0.04] animate-pulse mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white/[0.03] animate-pulse" />
      <div className="h-96 rounded-2xl bg-white/[0.03] animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.25)' }}>
              <Heart className="w-4 h-4 text-pink-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Social Analytics</h1>
          </div>
          <p className="text-sm text-white/40">
            Follow activity, researcher discovery, and public report engagement.
            {lastUpdated && (
              <span className="ml-2 text-white/25">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        {/* FIX: Refresh button explicitly fetches fresh data with no-store + timestamp */}
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white/60
                     border border-white/[0.08] hover:border-[#6C63FF]/40 hover:text-white
                     transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400"
             style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Heart  className="w-4 h-4" />} label="New follows today"           value={analytics.follows_today}      accent="#EC4899" />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Follows this week"        value={analytics.follows_this_week}  accent="#8B5CF6" sub="7 days" />
        <StatCard icon={<Users  className="w-4 h-4" />} label="Total follows all-time"       value={analytics.follows_all_time}   accent="#6C63FF" />
        <StatCard icon={<Users  className="w-4 h-4" />} label="Public researcher profiles"   value={analytics.public_profiles}    accent="#10B981" />
        <StatCard icon={<FileText className="w-4 h-4" />} label="Public reports shared"      value={analytics.public_reports}     accent="#F59E0B" />
        <StatCard icon={<Eye   className="w-4 h-4" />} label="Total public report views"     value={analytics.total_public_views} accent="#29B6F6" />
      </div>

      {/* Follow growth chart */}
      <FollowGrowthChart data={followGrowth} />

      {/* Top researchers */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white">Top Researchers</h2>
            <p className="text-xs text-white/40 mt-0.5">Most followed public profiles on the platform</p>
          </div>
          <a href={`${APP_URL}/discover?tab=researchers`} target="_blank" rel="noopener noreferrer"
             className="text-xs text-[#6C63FF] hover:text-[#A78BFA] transition-colors font-semibold flex items-center gap-1">
            <Globe className="w-3 h-3" />View on site ↗
          </a>
        </div>
        <TopResearchersTable researchers={topResearchers} />
      </div>

      {/* Quick links */}
      <div className="rounded-2xl border p-5"
           style={{ background: 'linear-gradient(135deg, #0F0F23 0%, #0A0A1A 100%)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-bold text-white mb-3">Quick Links</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { href: `${APP_URL}/discover`,                 label: '🔬 Discover Feed'         },
            { href: `${APP_URL}/discover?tab=researchers`, label: '👩‍🔬 Researcher Directory' },
          ].map(link => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                          border border-white/[0.08] text-white/60 hover:text-white
                          hover:border-[#6C63FF]/40 transition-all">
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}