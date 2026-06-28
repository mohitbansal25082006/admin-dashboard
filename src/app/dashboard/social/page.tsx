'use client';
// Admin-Dashboard/src/app/dashboard/social/page.tsx
// Part 55.13 — Social Analytics with full theme integration and mobile optimization.

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, Globe, FileText, Eye, Heart, RefreshCw, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import type {
  SocialAnalytics, TopResearcher,
  FollowGrowthPoint, SocialAnalyticsResponse,
} from '@/types/admin';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://public-reports-three.vercel.app';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ─── Stat Card (theme-aware) ──────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent = '#6C63FF' }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  const { isLight } = useTheme();
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  
  return (
    <div 
      className="rounded-2xl border p-4 sm:p-5 flex flex-col gap-3"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      <div className="flex items-center justify-between">
        <div 
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
          style={{
            background: `${accent}20`,
            border: `1px solid ${accent}30`,
          }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        {sub && (
          <span 
            className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: `${accent}12`,
              color: accent,
              border: `1px solid ${accent}20`,
            }}
          >
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-black leading-tight tracking-tight" style={{ color: textPrimary }}>
          {typeof value === 'number' ? formatCount(value) : value}
        </p>
        <p className="text-[10px] sm:text-xs mt-1 font-medium" style={{ color: textMuted }}>{label}</p>
      </div>
    </div>
  );
}

// ─── Mobile Researcher Card ───────────────────────────────────────────────────

function MobileResearcherCard({ researcher, rank }: { researcher: TopResearcher; rank: number }) {
  const { isLight } = useTheme();
  const initials = (researcher.full_name ?? researcher.username ?? '?')
    .split(' ')
    .map((w: string) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const profileUrl = researcher.username ? `${APP_URL}/u/${researcher.username}` : null;
  const rankColor = rank === 0 ? '#F59E0B' : rank === 1 ? '#94A3B8' : rank === 2 ? '#B45309' : (isLight ? '#999' : 'rgba(255,255,255,0.25)');
  const primaryGradient = isLight ? 'linear-gradient(135deg, #5B52E0, #7C5BD0)' : 'linear-gradient(135deg, #6C63FF, #8B5CF6)';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  
  return (
    <div 
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      {/* Header: Rank + Avatar + Name */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold w-6" style={{ color: rankColor }}>#{rank + 1}</span>
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0"
          style={{
            background: primaryGradient,
            color: '#fff',
          }}
        >
          {researcher.avatar_url
            ? <img src={researcher.avatar_url} alt="" className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>
            {researcher.full_name ?? researcher.username ?? 'Unknown'}
          </p>
          {researcher.username && (
            <p className="text-xs truncate" style={{ color: textMuted }}>@{researcher.username}</p>
          )}
        </div>
        {profileUrl && (
          <a 
            href={profileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}
          >
            <ChevronRight className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: borderColor }}>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}>
            {formatCount(researcher.follower_count)}
          </p>
          <p className="text-[9px]" style={{ color: textMuted }}>Followers</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: textSecondary }}>
            {formatCount(researcher.following_count)}
          </p>
          <p className="text-[9px]" style={{ color: textMuted }}>Following</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: textSecondary }}>
            {formatCount(researcher.report_count)}
          </p>
          <p className="text-[9px]" style={{ color: textMuted }}>Reports</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: isLight ? '#059669' : '#10B981' }}>
            {formatCount(researcher.public_report_count)}
          </p>
          <p className="text-[9px]" style={{ color: textMuted }}>Public</p>
        </div>
      </div>
    </div>
  );
}

// ─── Top researchers (desktop table + mobile cards) ─────────────────────────

function TopResearchersTable({ researchers }: { researchers: TopResearcher[] }) {
  const { isLight } = useTheme();
  const [isMobile, setIsMobile] = useState(false);
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const hoverBg = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!researchers.length) return (
    <div 
      className="rounded-2xl border p-8 text-center"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      <p className="text-sm" style={{ color: textMuted }}>No public researchers yet.</p>
    </div>
  );

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {researchers.map((r, i) => (
          <MobileResearcherCard key={r.id} researcher={r} rank={i} />
        ))}
      </div>
    );
  }

  // Desktop: Table view
  return (
    <div 
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      <div 
        className="grid gap-4 px-4 sm:px-5 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border-b"
        style={{
          gridTemplateColumns: '2rem 1fr 5rem 5rem 5rem 5rem',
          borderColor: borderColor,
          color: textMuted,
        }}
      >
        <span>#</span><span>Researcher</span>
        <span className="text-right">Followers</span>
        <span className="text-right">Following</span>
        <span className="text-right">All Reports</span>
        <span className="text-right">Public</span>
      </div>
      {researchers.map((r, i) => {
        const initials = (r.full_name ?? r.username ?? '?')
          .split(' ')
          .map((w: string) => w[0] ?? '')
          .join('')
          .slice(0, 2)
          .toUpperCase();
        const profileUrl = r.username ? `${APP_URL}/u/${r.username}` : null;
        const rankColor = i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : (isLight ? '#999' : 'rgba(255,255,255,0.25)');
        const primaryGradient = isLight ? 'linear-gradient(135deg, #5B52E0, #7C5BD0)' : 'linear-gradient(135deg, #6C63FF, #8B5CF6)';
        
        return (
          <div 
            key={r.id}
            className="grid gap-4 px-4 sm:px-5 py-3 sm:py-3.5 items-center border-b last:border-b-0 hover:bg-opacity-50 transition-colors"
            style={{
              gridTemplateColumns: '2rem 1fr 5rem 5rem 5rem 5rem',
              borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
              backgroundColor: hoverBg,
            }}
          >
            <span className="text-sm font-bold" style={{ color: rankColor }}>{i + 1}</span>
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold overflow-hidden"
                style={{
                  background: primaryGradient,
                  color: '#fff',
                }}
              >
                {r.avatar_url
                  ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight" style={{ color: textPrimary }}>
                  {r.full_name ?? r.username ?? 'Unknown'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.username && (
                    <p className="text-xs truncate" style={{ color: textMuted }}>@{r.username}</p>
                  )}
                  {profileUrl && (
                    <a 
                      href={profileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] transition-colors"
                      style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}
                    >
                      ↗ Profile
                    </a>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm font-bold text-right" style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}>
              {formatCount(r.follower_count)}
            </p>
            <p className="text-sm text-right" style={{ color: textMuted }}>
              {formatCount(r.following_count)}
            </p>
            <p className="text-sm text-right" style={{ color: textSecondary }}>
              {formatCount(r.report_count)}
            </p>
            <p className="text-sm text-right font-semibold" style={{ color: isLight ? '#059669' : '#10B981' }}>
              {formatCount(r.public_report_count)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Follow growth chart (theme-aware) ──────────────────────────────────────

function FollowGrowthChart({ data }: { data: FollowGrowthPoint[] }) {
  const { isLight } = useTheme();
  const maxVal = Math.max(...data.map(d => d.new_follows), 1);
  
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const tickColor = isLight ? '#666' : 'rgba(255,255,255,0.3)';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  const tooltipBg = isLight ? '#FFFFFF' : '#0F0F23';
  const tooltipBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(108,99,255,0.3)';
  const lineColor = isLight ? '#5B52E0' : '#6C63FF';
  const dotColor = isLight ? '#5B52E0' : '#6C63FF';
  const activeDotColor = isLight ? '#7C5BD0' : '#A78BFA';

  return (
    <div 
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold" style={{ color: textPrimary }}>Follow Growth</h3>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>
            New follows per day — last 7 days
          </p>
        </div>
      </div>

      {!data.length ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-sm" style={{ color: textMuted }}>No follow data yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            
            <XAxis
              dataKey="day"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(maxVal * 1.2)]}
              allowDecimals={false}
            />
            
            <Tooltip
              contentStyle={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: 10,
                color: isLight ? '#1A1A2E' : '#fff',
                fontSize: 12,
              }}
              labelStyle={{
                color: isLight ? '#666' : 'rgba(255,255,255,0.6)',
                marginBottom: 4,
              }}
              formatter={(value: any) => [value ?? 0, 'New follows']}
            />
            
            <Line
              type="monotone"
              dataKey="new_follows"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={{ fill: dotColor, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: activeDotColor, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t flex gap-4 flex-wrap" style={{ borderColor: borderColor }}>
          <div>
            <p className="text-lg font-black" style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}>
              {formatCount(data.reduce((s, d) => s + d.new_follows, 0))}
            </p>
            <p className="text-[10px]" style={{ color: textMuted }}>Total (7 days)</p>
          </div>
          
          <div>
            <p className="text-lg font-black" style={{ color: isLight ? '#7C5BD0' : '#A78BFA' }}>
              {formatCount(Math.max(...data.map(d => d.new_follows)))}
            </p>
            <p className="text-[10px]" style={{ color: textMuted }}>Peak day</p>
          </div>
          
          <div>
            <p className="text-lg font-black" style={{ color: isLight ? '#6B21A8' : '#8B5CF6' }}>
              {formatCount(
                Math.round(
                  data.reduce((s, d) => s + d.new_follows, 0) / data.length
                )
              )}
            </p>
            <p className="text-[10px]" style={{ color: textMuted }}>Daily avg</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialPage() {
  const { isLight } = useTheme();
  const [data, setData] = useState<SocialAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
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
  const topResearchers: TopResearcher[] = data?.topResearchers ?? [];
  const followGrowth: FollowGrowthPoint[] = data?.followGrowth ?? [];

  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';
  const pulseBg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
  const pulseBgLight = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
  const errorBg = isLight ? 'rgba(220,38,38,0.08)' : 'rgba(239,68,68,0.08)';
  const errorBorder = isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)';
  const errorText = isLight ? '#DC2626' : '#F87171';

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="h-7 w-48 rounded-lg animate-pulse" style={{ backgroundColor: pulseBg }} />
          <div className="h-4 w-72 rounded-lg animate-pulse mt-2" style={{ backgroundColor: pulseBgLight }} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: pulseBgLight }} />
        ))}
      </div>
      <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: pulseBgLight }} />
      <div className="h-96 rounded-2xl animate-pulse" style={{ backgroundColor: pulseBgLight }} />
    </div>
  );

  return (
    <div className="space-y-6 pb-8">

      {/* Page header - mobile responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isLight ? 'rgba(236,72,153,0.1)' : 'rgba(236,72,153,0.15)',
                border: `1px solid ${isLight ? 'rgba(236,72,153,0.2)' : 'rgba(236,72,153,0.25)'}`,
              }}
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: isLight ? '#DB2777' : '#EC4899' }} />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: textPrimary }}>
              Social Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: textMuted }}>
            Follow activity, researcher discovery, and public report engagement.
            {lastUpdated && (
              <span className="ml-2" style={{ color: textMutedLight }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'transparent',
            border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
            color: textMuted,
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div 
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: errorBg,
            border: `1px solid ${errorBorder}`,
            color: errorText,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <StatCard 
          icon={<Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} 
          label="New follows today" 
          value={analytics.follows_today} 
          accent={isLight ? '#DB2777' : '#EC4899'} 
        />
        <StatCard 
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} 
          label="Follows this week" 
          value={analytics.follows_this_week} 
          accent={isLight ? '#7C3AED' : '#8B5CF6'} 
          sub="7 days" 
        />
        <StatCard 
          icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} 
          label="Total follows all-time" 
          value={analytics.follows_all_time} 
          accent={isLight ? '#5B52E0' : '#6C63FF'} 
        />
        <StatCard 
          icon={<Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} 
          label="Public researcher profiles" 
          value={analytics.public_profiles} 
          accent={isLight ? '#059669' : '#10B981'} 
        />
        <StatCard 
          icon={<FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} 
          label="Public reports shared" 
          value={analytics.public_reports} 
          accent={isLight ? '#D97706' : '#F59E0B'} 
        />
        <StatCard 
          icon={<Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />} 
          label="Total public report views" 
          value={analytics.total_public_views} 
          accent={isLight ? '#0284C7' : '#29B6F6'} 
        />
      </div>

      {/* Follow growth chart */}
      <FollowGrowthChart data={followGrowth} />

      {/* Top researchers */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="text-base font-bold" style={{ color: textPrimary }}>Top Researchers</h2>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              Most followed public profiles on the platform
            </p>
          </div>
          <a 
            href={`${APP_URL}/discover?tab=researchers`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-semibold flex items-center gap-1 transition-colors"
            style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}
          >
            <Globe className="w-3 h-3" />View on site ↗
          </a>
        </div>
        <TopResearchersTable researchers={topResearchers} />
      </div>

      {/* Quick links */}
      <div 
        className="rounded-2xl border p-4 sm:p-5"
        style={{
          backgroundColor: isLight ? '#FFFFFF' : 'var(--background-card)',
          borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
        }}
      >
        <h3 className="text-sm font-bold mb-3" style={{ color: textPrimary }}>Quick Links</h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {[
            { href: `${APP_URL}/discover`, label: '🔬 Discover Feed' },
            { href: `${APP_URL}/discover?tab=researchers`, label: '👩‍🔬 Researcher Directory' },
          ].map(link => (
            <a 
              key={link.href} 
              href={link.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all"
              style={{
                backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'transparent',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                color: textMuted,
              }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}