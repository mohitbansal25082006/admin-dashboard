'use client';
// Admin-Dashboard/src/components/admin/UserTable.tsx
// Part 31B — Paginated, searchable user management table.

import { useState, useCallback, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import type { AdminUserRow, AccountStatus, UserFilters, PaginatedResponse } from '@/types/admin';
import { UserDetailSheet } from './UserDetailSheet';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<AccountStatus, string> = {
  active:    'bg-green-500/15 text-green-400 border-green-500/25',
  suspended: 'bg-red-500/15   text-red-400   border-red-500/25',
  flagged:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
};

function Avatar({ user }: { user: AdminUserRow }) {
  const initials = (user.fullName ?? user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={initials}
      className="w-8 h-8 rounded-full object-cover border border-white/10"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-[#6C63FF]/20 border border-[#6C63FF]/30
                    flex items-center justify-center text-[11px] font-bold text-[#6C63FF]">
      {initials}
    </div>
  );
}

export function UserTable() {
  const [users,       setUsers]       = useState<AdminUserRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

  const [filters, setFilters] = useState<UserFilters>({
    search:   '',
    status:   'all',
    sortBy:   'created_at',
    sortDir:  'desc',
    page:     1,
    pageSize: 15,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search:   filters.search,
      status:   filters.status,
      sortBy:   filters.sortBy,
      sortDir:  filters.sortDir,
      page:     String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data, error } = await adminFetch<PaginatedResponse<AdminUserRow>>(
      `/api/admin/users?${params.toString()}`
    );
    if (!error && data) {
      setUsers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search
  const handleSearch = useCallback(
    debounce((value: string) => {
      setFilters((f) => ({ ...f, search: value, page: 1 }));
    }, 350),
    [],
  );

  const handleSort = (col: UserFilters['sortBy']) => {
    setFilters((f) => ({
      ...f,
      sortBy:  col,
      sortDir: f.sortBy === col && f.sortDir === 'desc' ? 'asc' : 'desc',
      page:    1,
    }));
  };

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            placeholder="Search by name or email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any, page: 1 }))}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                     text-sm text-white/70 outline-none focus:border-[#6C63FF]/40 transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="flagged">Flagged</option>
        </select>

        {/* Sort */}
        <select
          value={`${filters.sortBy}_${filters.sortDir}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split('_') as [UserFilters['sortBy'], 'asc' | 'desc'];
            setFilters((f) => ({ ...f, sortBy: col, sortDir: dir, page: 1 }));
          }}
          className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5
                     text-sm text-white/70 outline-none focus:border-[#6C63FF]/40 transition-all"
        >
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
          <option value="balance_desc">Most Credits</option>
          <option value="balance_asc">Fewest Credits</option>
          <option value="total_reports_desc">Most Reports</option>
          <option value="total_consumed_desc">Most Consumed</option>
        </select>

        <div className="ml-auto text-xs text-white/30 whitespace-nowrap">
          {total.toLocaleString()} users
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: '#0D0D1A' }}
      >
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>User</th>
                <th
                  className="cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => handleSort('created_at')}
                >
                  <span className="flex items-center gap-1">
                    Joined <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => handleSort('balance')}
                >
                  <span className="flex items-center gap-1">
                    Credits <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => handleSort('total_reports')}
                >
                  <span className="flex items-center gap-1">
                    Reports <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  className="cursor-pointer hover:text-white/60 transition-colors"
                  onClick={() => handleSort('total_consumed')}
                >
                  <span className="flex items-center gap-1">
                    Consumed <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th>Status</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}>
                        <div className="h-4 bg-white/[0.05] rounded animate-pulse w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/25">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedId(user.id)}
                    className="cursor-pointer"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar user={user} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/80 truncate max-w-[160px]">
                            {user.fullName ?? user.username ?? '—'}
                          </p>
                          <p className="text-xs text-white/35 truncate max-w-[160px]">{user.email}</p>
                        </div>
                        {user.isAdmin && (
                          <span className="text-[9px] bg-[#6C63FF]/20 text-[#6C63FF] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-white/40 text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-white/80 font-semibold text-sm">
                          {user.creditBalance.toLocaleString()}
                        </span>
                        <span className="text-white/30 text-[10px]">
                          of {user.totalPurchased.toLocaleString()} bought
                        </span>
                      </div>
                    </td>
                    <td className="text-white/60 font-medium">{user.totalReports}</td>
                    <td className="text-white/40">{user.totalConsumed.toLocaleString()}</td>
                    <td>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${STATUS_COLORS[user.accountStatus]}`}
                      >
                        {user.accountStatus}
                      </span>
                    </td>
                    <td className="text-white/30 text-xs whitespace-nowrap">
                      {user.lastActiveAt
                        ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">
              Page {filters.page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.min(
                  Math.max(1, filters.page - 2) + i,
                  totalPages,
                );
                return (
                  <button
                    key={page}
                    onClick={() => setFilters((f) => ({ ...f, page }))}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                      ${filters.page === page
                        ? 'bg-[#6C63FF] text-white'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                      }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
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

      {/* User detail sheet */}
      <UserDetailSheet
        userId={selectedId}
        onClose={() => { setSelectedId(null); fetchUsers(); }}
      />
    </>
  );
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}