'use client';
// Admin-Dashboard/src/app/dashboard/audit/page.tsx
// Part 55.13 — Admin audit log with full theme integration and mobile optimization.

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { Header } from '@/components/admin/Header';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';
import type { AuditLogRow, PaginatedResponse } from '@/types/admin';

// ── Shared select styles (theme-aware) ──────────────────────────────────────

function getSelectStyles(isLight: boolean): React.CSSProperties {
  const bg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
  const textColor = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const chevronColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  
  return {
    backgroundColor: bg,
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '10px 32px 10px 14px',
    fontSize: '13px',
    color: textColor,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${chevronColor}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px',
    transition: 'border-color 0.2s ease',
    minHeight: '44px',
    WebkitAppearance: 'none',
  };
}

// ── Action color map (theme-aware) ──────────────────────────────────────────

const ACTION_COLORS: Record<string, { bg: string; text: string; lightBg: string; lightText: string }> = {
  credit_adjustment: { 
    bg: 'bg-blue-500/15', text: 'text-blue-400',
    lightBg: 'bg-blue-100', lightText: 'text-blue-700'
  },
  suspend_user: { 
    bg: 'bg-red-500/15', text: 'text-red-400',
    lightBg: 'bg-red-100', lightText: 'text-red-700'
  },
  unsuspend_user: { 
    bg: 'bg-green-500/15', text: 'text-green-400',
    lightBg: 'bg-green-100', lightText: 'text-green-700'
  },
  flag_user: { 
    bg: 'bg-yellow-500/15', text: 'text-yellow-400',
    lightBg: 'bg-yellow-100', lightText: 'text-yellow-700'
  },
  delete_user: { 
    bg: 'bg-red-500/20', text: 'text-red-300',
    lightBg: 'bg-red-100', lightText: 'text-red-700'
  },
  view_user: { 
    bg: 'bg-white/5', text: 'text-white/30',
    lightBg: 'bg-gray-100', lightText: 'text-gray-600'
  },
  revoke_credits: { 
    bg: 'bg-orange-500/15', text: 'text-orange-400',
    lightBg: 'bg-orange-100', lightText: 'text-orange-700'
  },
  manual_grant: { 
    bg: 'bg-purple-500/15', text: 'text-purple-400',
    lightBg: 'bg-purple-100', lightText: 'text-purple-700'
  },
};

function getActionStyles(action: string, isLight: boolean): string {
  const colors = ACTION_COLORS[action];
  if (!colors) return isLight ? 'bg-gray-100 text-gray-700' : 'bg-white/5 text-white/40';
  return isLight ? `${colors.lightBg} ${colors.lightText}` : `${colors.bg} ${colors.text}`;
}

// ── Action filter options ────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'credit_adjustment', label: 'Credit Adjustment' },
  { value: 'suspend_user', label: 'Suspend' },
  { value: 'unsuspend_user', label: 'Unsuspend' },
  { value: 'flag_user', label: 'Flag' },
  { value: 'delete_user', label: 'Delete' },
  { value: 'revoke_credits', label: 'Revoke Credits' },
];

// ── Mobile Card View ──────────────────────────────────────────────────────────
// Redesigned: every field now wraps/breaks instead of truncating. Admin and
// Target are stacked rows (each full-width) rather than a cramped 2-col grid,
// long emails wrap with break-all/break-words, and detail chips wrap their
// key/value pairs onto multiple lines instead of clipping.

function AuditLogMobileCard({ log }: { log: AuditLogRow }) {
  const { isLight } = useTheme();
  
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const labelColor = isLight ? '#888' : 'var(--text-muted)';
  const valueColor = isLight ? '#1A1A2E' : 'var(--text-secondary)';
  const timeColor = isLight ? '#666' : 'var(--text-muted)';
  const actionStyles = getActionStyles(log.action, isLight);

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
    >
      {/* Header row: Action badge + Time */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize break-words ${actionStyles}`}>
          {log.action.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] whitespace-nowrap pt-1.5" style={{ color: timeColor }}>
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Admin — full width row, wraps instead of truncating */}
      <div>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: labelColor }}>
          Admin
        </p>
        <p className="text-xs font-medium break-all" style={{ color: valueColor }}>
          {log.adminEmail ?? log.adminUserId}
        </p>
      </div>

      {/* Target — full width row, wraps instead of truncating */}
      <div>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: labelColor }}>
          Target
        </p>
        <p className="text-xs font-medium break-all" style={{ color: valueColor }}>
          {log.targetEmail ?? log.targetUserId ?? '—'}
        </p>
      </div>

      {/* Details */}
      {log.afterValue && Object.keys(log.afterValue).length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: labelColor }}>
            Details
          </p>
          <div className="flex flex-col gap-1">
            {Object.entries(log.afterValue).map(([k, v]) => (
              <div
                key={k}
                className="text-[11px] px-2.5 py-1 rounded-lg break-words"
                style={{
                  backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                  color: isLight ? '#333' : 'var(--text-secondary)',
                }}
              >
                <span className="font-medium">{k}:</span>{' '}
                <span style={{ color: valueColor }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reason */}
      {log.reason && (
        <div>
          <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: labelColor }}>
            Reason
          </p>
          <p className="text-xs break-words whitespace-pre-wrap" style={{ color: valueColor }}>
            {log.reason}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const { isLight } = useTheme();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const PAGE_SIZE = 20;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search, action, page: String(page), pageSize: String(PAGE_SIZE),
    });
    const { data, error } = await adminFetch<PaginatedResponse<AuditLogRow>>(
      `/api/admin/audit?${params.toString()}`
    );
    if (!error && data) {
      setLogs(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [search, action, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const selectStyles = getSelectStyles(isLight);
  const inputBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const inputText = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const cardBg = isLight ? '#F5F6FB' : 'var(--background-card)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';

  return (
    <div className="pb-8">
      <Header
        title="Audit Log"
        subtitle="Complete record of all admin actions"
        onRefresh={fetchLogs}
        refreshing={loading}
      />

      {/* Controls - mobile responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
            style={{ color: isLight ? '#999' : 'var(--text-muted)' }} 
          />
          <input
            type="text"
            placeholder="Search by admin or target email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>

        {/* Action filter */}
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          style={selectStyles}
          className="w-full sm:w-auto min-w-[160px]"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option 
              key={opt.value} 
              value={opt.value}
              style={{ 
                backgroundColor: isLight ? '#FFFFFF' : '#13132A', 
                color: isLight ? '#1A1A2E' : '#FFFFFF'
              }}
            >
              {opt.label}
            </option>
          ))}
        </select>

        <span className="text-xs text-right sm:ml-auto" style={{ color: textMuted }}>
          {total.toLocaleString()} entries
        </span>
      </div>

      {/* Table / Cards */}
      <div 
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: cardBg,
          borderColor: cardBorder,
        }}
      >
        {isMobile ? (
          // Mobile: Card view
          <div className="p-4 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3 animate-pulse" style={{ borderColor: cardBorder }}>
                  <div className="flex justify-between">
                    <div className="h-6 w-20 rounded-full" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 w-16 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="h-3 w-12 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                      <div className="h-4 w-32 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    </div>
                    <div className="space-y-1">
                      <div className="h-3 w-12 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                      <div className="h-4 w-32 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Activity className="w-12 h-12 mb-3 opacity-30" style={{ color: textMuted }} />
                <p className="text-base font-medium" style={{ color: textMuted }}>No audit log entries found</p>
              </div>
            ) : (
              logs.map((log) => <AuditLogMobileCard key={log.id} log={log} />)
            )}
          </div>
        ) : (
          // Desktop: Table view
          <>
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th style={{ color: isLight ? '#666' : 'var(--text-muted)' }}>Admin</th>
                    <th style={{ color: isLight ? '#666' : 'var(--text-muted)' }}>Action</th>
                    <th style={{ color: isLight ? '#666' : 'var(--text-muted)' }}>Target User</th>
                    <th style={{ color: isLight ? '#666' : 'var(--text-muted)' }}>Details</th>
                    <th style={{ color: isLight ? '#666' : 'var(--text-muted)' }}>Reason</th>
                    <th style={{ color: isLight ? '#666' : 'var(--text-muted)' }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j}>
                            <div className="h-4 rounded animate-pulse w-full max-w-[100px]" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16" style={{ color: textMuted }}>
                        <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
                        No audit log entries found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-xs font-medium" style={{ color: textSecondary }}>
                          {log.adminEmail ?? log.adminUserId.slice(0, 8)}
                        </td>
                        <td>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getActionStyles(log.action, isLight)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-xs font-medium" style={{ color: textSecondary }}>
                          {log.targetEmail ?? log.targetUserId?.slice(0, 8) ?? '—'}
                        </td>
                        <td className="text-xs max-w-[200px]" style={{ color: textMuted }}>
                          {log.afterValue && Object.keys(log.afterValue).length > 0
                            ? Object.entries(log.afterValue).map(([k, v]) => (
                                <span key={k} className="mr-2">
                                  {k}: <span style={{ color: textSecondary }}>{String(v)}</span>
                                </span>
                              ))
                            : '—'
                          }
                        </td>
                        <td className="text-xs max-w-[160px] truncate" style={{ color: textMuted }}>
                          {log.reason ?? '—'}
                        </td>
                        <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination - desktop */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: cardBorder }}>
                <p className="text-xs" style={{ color: textMuted }}>Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: cardBorder,
                      color: textMuted,
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: cardBorder,
                      color: textMuted,
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pagination - mobile (at bottom) */}
        {isMobile && !loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: cardBorder }}>
            <p className="text-xs" style={{ color: textMuted }}>Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: cardBorder,
                  color: textMuted,
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: cardBorder,
                  color: textMuted,
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}