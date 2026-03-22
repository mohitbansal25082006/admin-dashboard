'use client';
// Admin-Dashboard/src/components/admin/Header.tsx
// Part 31B — Page header with title, breadcrumb and refresh button.

import { RefreshCw, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, onRefresh, refreshing, children }: HeaderProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-white/25" />
          <span className="text-xs text-white/35 font-mono tabular-nums">{time}</span>
        </div>
        {children}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04]
                       border border-white/[0.08] text-xs text-white/50
                       hover:bg-[#6C63FF]/10 hover:border-[#6C63FF]/30 hover:text-[#6C63FF]
                       transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}