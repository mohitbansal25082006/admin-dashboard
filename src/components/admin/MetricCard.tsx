// Admin-Dashboard/src/components/admin/MetricCard.tsx
// Part 55.13 — Updated with theme-aware styling

'use client';

import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  subLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
}

export function MetricCard({
  title, value, subValue, subLabel,
  icon: Icon, iconColor = 'bg-[#6C63FF]/15',
  trend, trendValue, loading,
}: MetricCardProps) {
  const { isLight } = useTheme();

  const bgGradient = isLight
    ? 'linear-gradient(135deg, var(--background-elevated) 0%, var(--background) 100%)'
    : 'linear-gradient(135deg, var(--background-card) 0%, var(--background) 100%)';

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 group"
      style={{
        background: bgGradient,
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
            ${trend === 'up' ? 'bg-green-500/10 text-green-400' : ''}
            ${trend === 'down' ? 'bg-red-500/10 text-red-400' : ''}
            ${trend === 'neutral' ? 'bg-white/5 text-white/40' : ''}
          `}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>

      <div>
        {loading ? (
          <>
            <div className="h-8 w-24 rounded-lg animate-pulse mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
            {subValue && (
              <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {subValue}
              </p>
            )}
          </>
        )}
        <p className="text-xs font-medium uppercase tracking-wider mt-2" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
        {subLabel && !loading && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--primary)' }}>
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
}