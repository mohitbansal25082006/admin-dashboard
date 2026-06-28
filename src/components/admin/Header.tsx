'use client';
// Admin-Dashboard/src/components/admin/Header.tsx
// Part 55.13 — Updated with theme-aware styling and mobile optimization.

import { RefreshCw, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, onRefresh, refreshing, children }: HeaderProps) {
  const [time, setTime] = useState('');
  const { isLight } = useTheme();

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

  const buttonBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'var(--border)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
      <div className="w-full sm:w-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: textPrimary }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: textMuted }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
        {/* Clock - hidden on very small screens */}
        <div
          className="hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${borderColor}`,
          }}
        >
          <Clock className="w-3.5 h-3.5" style={{ color: textMuted }} />
          <span className="text-xs font-mono tabular-nums" style={{ color: textMuted }}>
            {time}
          </span>
        </div>
        
        {children}
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50 flex-1 sm:flex-none justify-center"
            style={{
              backgroundColor: buttonBg,
              border: `1px solid ${borderColor}`,
              color: textMuted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isLight ? '#5B52E0' : 'var(--primary)';
              e.currentTarget.style.borderColor = isLight ? '#5B52E0' : 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = textMuted;
              e.currentTarget.style.borderColor = borderColor;
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </button>
        )}
      </div>
    </div>
  );
}