'use client';
// Admin-Dashboard/src/components/admin/ActivityChart.tsx
// Part 31B — 7-day activity chart (new users + new reports).
//
// HYDRATION FIX: This component renders nothing on the server (returns a blank
// placeholder) and only mounts on the client after the first paint.
//
// WHY: Browser extensions like Honey inject `bis_skin_checked="1"` into every
// <div> on the client BEFORE React hydrates. Since the server HTML never has
// these attributes, React sees a mismatch on every single div and logs the
// hydration warning. suppressHydrationWarning only works on the element it is
// placed on — not its children — so it cannot fix nested injection.
//
// The only reliable fix for extension-injected attributes across deeply nested
// elements is to skip server rendering entirely for this component. The server
// renders an empty same-height placeholder. The client renders the full chart
// after mount. No HTML to mismatch = no warning.

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DailyActivity } from '@/types/admin';

interface ActivityChartProps {
  data:    DailyActivity[];
  loading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-white/[0.08] px-4 py-3 text-sm"
      style={{ background: '#13131F' }}
    >
      <p className="text-white/50 text-xs mb-2 font-medium">
        {label ? format(parseISO(label), 'EEEE, MMM d') : ''}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-white/60 capitalize">{entry.name}:</span>
          <span className="text-white font-semibold">{entry.value}</span>
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
  // Client-only mount guard — prevents server rendering this component at all.
  // This eliminates the entire category of "extension injects attributes into
  // divs before React hydrates" hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Server render: blank same-height placeholder so layout doesn't shift.
  // The outer card renders on the server; only the chart content is deferred.
  if (!mounted) {
    return (
      <div
        className="rounded-2xl border border-white/[0.07] p-6"
        style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="h-4 w-36 bg-white/[0.05] rounded animate-pulse" />
            <div className="h-3 w-56 bg-white/[0.04] rounded animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="h-[200px] bg-white/[0.02] rounded-xl animate-pulse" />
      </div>
    );
  }
  return (
    <div
      className="rounded-2xl border border-white/[0.07] p-6"
      style={{ background: 'linear-gradient(135deg, #13131F 0%, #0F0F1C 100%)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-white">Platform Activity</h3>
          <p className="text-xs text-white/35 mt-0.5">New users & completed reports — last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-[#6C63FF] inline-block" />
            <span className="text-white/40">Users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-[#10B981] inline-block" />
            <span className="text-white/40">Reports</span>
          </div>
        </div>
      </div>

      {loading ? (
        // Fixed deterministic heights — no Math.random()
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
                <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="day"
              tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d'); } catch { return v; } }}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="newUsers"
              name="users"
              stroke="#6C63FF"
              strokeWidth={2}
              fill="url(#colorUsers)"
              dot={{ fill: '#6C63FF', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#6C63FF' }}
            />
            <Area
              type="monotone"
              dataKey="newReports"
              name="reports"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#colorReports)"
              dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10B981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}