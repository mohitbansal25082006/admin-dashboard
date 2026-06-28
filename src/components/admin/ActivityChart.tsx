// Admin-Dashboard/src/components/admin/ActivityChart.tsx
// Part 55.13 — Updated with theme-aware styling

'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DailyActivity } from '@/types/admin';
import { useTheme } from '../../context/ThemeContext';

interface ActivityChartProps {
  data: DailyActivity[];
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm"
      style={{
        backgroundColor: 'var(--background-card)',
        borderColor: 'var(--border)',
      }}
    >
      <p className="text-xs mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
        {label ? format(parseISO(label), 'EEEE, MMM d') : ''}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {entry.name}:
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SKELETON_HEIGHTS = [40, 70, 55, 80, 45, 65, 50];

const SkeletonBar = ({ height, width }: { height: string; width: string }) => (
  <div className={`bg-white/[0.05] rounded animate-pulse ${height} ${width}`} />
);

export function ActivityChart({ data, loading }: ActivityChartProps) {
  const [mounted, setMounted] = useState(false);
  const { isLight } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const bgGradient = isLight
    ? 'linear-gradient(135deg, var(--background-elevated) 0%, var(--background) 100%)'
    : 'linear-gradient(135deg, var(--background-card) 0%, var(--background) 100%)';

  if (!mounted) {
    return (
      <div
        className="rounded-2xl border p-6"
        style={{
          background: bgGradient,
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="h-4 w-36 rounded animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <div className="h-3 w-56 rounded animate-pulse mt-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
        <div className="h-[200px] rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        background: bgGradient,
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Platform Activity
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            New users & completed reports — last 7 days
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: 'var(--success)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Reports</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-end gap-3 px-2 pb-2">
          {SKELETON_HEIGHTS.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1">
              <SkeletonBar height={`h-[${h}px]`} width="w-full" />
              <SkeletonBar height="h-3" width="w-full" />
            </div>
          ))}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--success)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="day"
              tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d'); } catch { return v; } }}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="newUsers"
              name="users"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#colorUsers)"
              dot={{ fill: 'var(--primary)', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--primary)' }}
            />
            <Area
              type="monotone"
              dataKey="newReports"
              name="reports"
              stroke="var(--success)"
              strokeWidth={2}
              fill="url(#colorReports)"
              dot={{ fill: 'var(--success)', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--success)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}