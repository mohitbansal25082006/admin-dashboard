'use client';
// Admin-Dashboard/src/app/dashboard/audit/page.tsx
// Part 31B — Admin audit log: every admin action in one searchable table.

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { Header }     from '@/components/admin/Header';
import { formatDistanceToNow } from 'date-fns';
import type { AuditLogRow, PaginatedResponse } from '@/types/admin';

const ACTION_COLORS: Record<string, string> = {
  credit_adjustment:   'bg-blue-500/15    text-blue-400',
  suspend_user:        'bg-red-500/15     text-red-400',
  unsuspend_user:      'bg-green-500/15   text-green-400',
  flag_user:           'bg-yellow-500/15  text-yellow-400',
  delete_user:         'bg-red-500/20     text-red-300',
  view_user:           'bg-white/5        text-white/30',
  revoke_credits:      'bg-orange-500/15  text-orange-400',
  manual_grant:        'bg-purple-500/15  text-purple-400',
};

export default function AuditLogPage() {
  const [logs,       setLogs]       = useState<AuditLogRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [action,     setAction]     = useState('all');
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 20;

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

  return (
    <div>
      <Header
        title="Audit Log"
        subtitle="Complete record of all admin actions"
        onRefresh={fetchLogs}
        refreshing={loading}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by admin or target email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all"
          />
        </div>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                     text-sm text-white/70 outline-none focus:border-[#6C63FF]/40 transition-all"
        >
          <option value="all">All Actions</option>
          <option value="credit_adjustment">Credit Adjustment</option>
          <option value="suspend_user">Suspend</option>
          <option value="unsuspend_user">Unsuspend</option>
          <option value="flag_user">Flag</option>
          <option value="delete_user">Delete</option>
          <option value="revoke_credits">Revoke Credits</option>
        </select>
        <span className="ml-auto text-xs text-white/30">{total.toLocaleString()} entries</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: '#0D0D1A' }}>
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th>Admin</th>
              <th>Action</th>
              <th>Target User</th>
              <th>Details</th>
              <th>Reason</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j}><div className="h-4 bg-white/[0.05] rounded animate-pulse w-full max-w-[100px]" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/25">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No audit log entries found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-white/60 text-xs">{log.adminEmail ?? log.adminUserId.slice(0, 8)}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize
                      ${ACTION_COLORS[log.action] ?? 'bg-white/5 text-white/40'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-white/50 text-xs">{log.targetEmail ?? log.targetUserId?.slice(0, 8) ?? '—'}</td>
                  <td className="text-white/30 text-xs max-w-[200px]">
                    {log.afterValue
                      ? Object.entries(log.afterValue).map(([k, v]) =>
                          <span key={k} className="mr-2">{k}: <span className="text-white/50">{String(v)}</span></span>
                        )
                      : '—'
                    }
                  </td>
                  <td className="text-white/35 text-xs max-w-[160px] truncate">{log.reason ?? '—'}</td>
                  <td className="text-white/25 text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
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