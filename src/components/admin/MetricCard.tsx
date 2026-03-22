'use client';
// Admin-Dashboard/src/components/admin/MetricCard.tsx
// Part 31B — Animated metric card for the overview dashboard.

import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title:       string;
  value:       string | number;
  subValue?:   string;          // e.g. "₹12,400 this month"
  subLabel?:   string;          // e.g. "+142 today"
  icon:        LucideIcon;
  iconColor?:  string;          // tailwind bg colour class
  trend?:      'up' | 'down' | 'neutral';
  trendValue?: string;          // e.g. "+12%"
  loading?:    boolean;
}

export function MetricCard({
  title, value, subValue, subLabel,
  icon: Icon, iconColor = 'bg-[#6C63FF]/15',
  trend, trendValue, loading,
}: MetricCardProps) {
  return (
    <div
      className="rounded-2xl border border-white/[0.07] p-5 flex flex-col gap-4
                 hover:border-white/[0.12] transition-all duration-200 group"
      style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white/70" />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
            ${trend === 'up'      ? 'bg-green-500/10  text-green-400'  : ''}
            ${trend === 'down'    ? 'bg-red-500/10    text-red-400'    : ''}
            ${trend === 'neutral' ? 'bg-white/5       text-white/40'   : ''}
          `}>
            {trend === 'up'      && <TrendingUp   className="w-3 h-3" />}
            {trend === 'down'    && <TrendingDown  className="w-3 h-3" />}
            {trend === 'neutral' && <Minus         className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <>
            <div className="h-8 w-24 bg-white/[0.06] rounded-lg animate-pulse mb-1" />
            <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            {subValue && (
              <p className="text-sm text-white/40 mt-0.5 truncate">{subValue}</p>
            )}
          </>
        )}
        <p className="text-xs text-white/30 font-medium uppercase tracking-wider mt-2">{title}</p>
        {subLabel && !loading && (
          <p className="text-xs text-[#6C63FF]/70 mt-0.5">{subLabel}</p>
        )}
      </div>
    </div>
  );
}