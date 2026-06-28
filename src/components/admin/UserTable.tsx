'use client';
// Admin-Dashboard/src/components/admin/UserTable.tsx
// Part 55.13 — UserTable with full theme integration and mobile optimization.

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Users } from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { useTheme } from '../../context/ThemeContext';
import type { AdminUserRow, AccountStatus, UserFilters, PaginatedResponse } from '@/types/admin';
import { UserDetailSheet } from './UserDetailSheet';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<AccountStatus, { dark: string; light: string }> = {
  active: { 
    dark: 'bg-green-500/15 text-green-400 border-green-500/25',
    light: 'bg-green-100 text-green-700 border-green-300'
  },
  suspended: { 
    dark: 'bg-red-500/15 text-red-400 border-red-500/25',
    light: 'bg-red-100 text-red-700 border-red-300'
  },
  flagged: { 
    dark: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    light: 'bg-yellow-100 text-yellow-700 border-yellow-300'
  },
};

function getStatusStyles(status: AccountStatus, isLight: boolean): string {
  const colors = STATUS_COLORS[status];
  if (!colors) return isLight ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/5 text-white/40 border-white/10';
  return isLight ? colors.light : colors.dark;
}

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

function Avatar({ user, isLight }: { user: AdminUserRow; isLight: boolean }) {
  const initials = (user.fullName ?? user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bgColor = isLight ? '#5B52E0' : '#6C63FF';
  const borderColor = isLight ? 'rgba(91,82,224,0.3)' : 'rgba(108,99,255,0.3)';

  return user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={initials}
      className="w-8 h-8 rounded-full object-cover border"
      style={{ borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}
    />
  ) : (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
      style={{
        backgroundColor: isLight ? `${bgColor}20` : `${bgColor}20`,
        border: `1px solid ${borderColor}`,
        color: isLight ? '#5B52E0' : '#6C63FF',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Mobile User Card ─────────────────────────────────────────────────────────

function MobileUserCard({ user, isLight, onSelect }: { 
  user: AdminUserRow; 
  isLight: boolean;
  onSelect: (id: string) => void;
}) {
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const statusStyles = getStatusStyles(user.accountStatus, isLight);
  
  return (
    <div 
      className="rounded-xl border p-4 space-y-3 cursor-pointer transition-colors"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
      onClick={() => onSelect(user.id)}
    >
      {/* Header: Avatar + Name + Admin Badge */}
      <div className="flex items-center gap-3">
        <Avatar user={user} isLight={isLight} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>
              {user.fullName ?? user.username ?? '—'}
            </p>
            {user.isAdmin && (
              <span 
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: isLight ? 'rgba(91,82,224,0.15)' : 'rgba(108,99,255,0.2)',
                  color: isLight ? '#5B52E0' : '#6C63FF',
                }}
              >
                Admin
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: textMuted }}>{user.email}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${statusStyles}`}>
          {user.accountStatus}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t" style={{ borderColor: borderColor }}>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: textPrimary }}>
            {user.creditBalance.toLocaleString()}
          </p>
          <p className="text-[8px]" style={{ color: textMuted }}>Credits</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: textPrimary }}>
            {user.totalReports}
          </p>
          <p className="text-[8px]" style={{ color: textMuted }}>Reports</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: textPrimary }}>
            {user.totalConsumed.toLocaleString()}
          </p>
          <p className="text-[8px]" style={{ color: textMuted }}>Consumed</p>
        </div>
        <div className="text-center">
          <p className="text-xs" style={{ color: textMuted }}>
            {user.lastActiveAt
              ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })
              : '—'}
          </p>
          <p className="text-[8px]" style={{ color: textMuted }}>Active</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main UserTable ──────────────────────────────────────────────────────────

export function UserTable() {
  const { isLight } = useTheme();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: 'all',
    sortBy: 'created_at',
    sortDir: 'desc',
    page: 1,
    pageSize: 15,
  });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: filters.search,
      status: filters.status,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      page: String(filters.page),
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

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value, page: 1 }));
    }, 350);
  };

  const handleSort = (col: UserFilters['sortBy']) => {
    setFilters((f) => ({
      ...f,
      sortBy: col,
      sortDir: f.sortBy === col && f.sortDir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const selectStyles = getSelectStyles(isLight);
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const inputBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const inputText = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const hoverBg = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';

  return (
    <>
      {/* Controls - mobile responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any, page: 1 }))}
          style={selectStyles}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <option value="all" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>All Statuses</option>
          <option value="active" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Active</option>
          <option value="suspended" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Suspended</option>
          <option value="flagged" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Flagged</option>
        </select>

        {/* Sort filter */}
        <select
          value={`${filters.sortBy}_${filters.sortDir}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split('_') as [UserFilters['sortBy'], 'asc' | 'desc'];
            setFilters((f) => ({ ...f, sortBy: col, sortDir: dir, page: 1 }));
          }}
          style={selectStyles}
          className="w-full sm:w-auto min-w-[140px]"
        >
          <option value="created_at_desc" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Newest First</option>
          <option value="created_at_asc" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Oldest First</option>
          <option value="balance_desc" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Most Credits</option>
          <option value="balance_asc" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Fewest Credits</option>
          <option value="total_reports_desc" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Most Reports</option>
          <option value="total_consumed_desc" style={{ backgroundColor: isLight ? '#FFFFFF' : '#13132A', color: isLight ? '#1A1A2E' : '#fff' }}>Most Consumed</option>
        </select>

        <div className="text-xs text-right sm:ml-auto whitespace-nowrap" style={{ color: textMuted }}>
          {total.toLocaleString()} users
        </div>
      </div>

      {/* Table / Cards */}
      <div 
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        {isMobile ? (
          // Mobile: Card view
          <div className="p-3 sm:p-4 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3 animate-pulse" style={{ borderColor: borderColor }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    <div className="flex-1">
                      <div className="h-4 w-32 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                      <div className="h-3 w-24 rounded mt-1" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="text-center">
                        <div className="h-4 w-8 mx-auto rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                        <div className="h-2 w-12 mx-auto mt-1 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="w-12 h-12 mb-3 opacity-30" style={{ color: textMuted }} />
                <p className="text-base font-medium" style={{ color: textMuted }}>No users found</p>
              </div>
            ) : (
              users.map((user) => (
                <MobileUserCard 
                  key={user.id} 
                  user={user} 
                  isLight={isLight} 
                  onSelect={setSelectedId} 
                />
              ))
            )}
          </div>
        ) : (
          // Desktop: Table view
          <>
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th style={{ color: textMuted }}>User</th>
                    <th 
                      className="cursor-pointer hover:opacity-80 transition-colors"
                      style={{ color: textMuted }}
                      onClick={() => handleSort('created_at')}
                    >
                      <span className="flex items-center gap-1">
                        Joined <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th 
                      className="cursor-pointer hover:opacity-80 transition-colors"
                      style={{ color: textMuted }}
                      onClick={() => handleSort('balance')}
                    >
                      <span className="flex items-center gap-1">
                        Credits <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th 
                      className="cursor-pointer hover:opacity-80 transition-colors"
                      style={{ color: textMuted }}
                      onClick={() => handleSort('total_reports')}
                    >
                      <span className="flex items-center gap-1">
                        Reports <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th 
                      className="cursor-pointer hover:opacity-80 transition-colors"
                      style={{ color: textMuted }}
                      onClick={() => handleSort('total_consumed')}
                    >
                      <span className="flex items-center gap-1">
                        Consumed <ArrowUpDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th style={{ color: textMuted }}>Status</th>
                    <th style={{ color: textMuted }}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j}>
                            <div className="h-4 rounded animate-pulse w-full max-w-[120px]" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16" style={{ color: textMuted }}>
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const statusStyles = getStatusStyles(user.accountStatus, isLight);
                      return (
                        <tr
                          key={user.id}
                          onClick={() => setSelectedId(user.id)}
                          className="cursor-pointer transition-colors"
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <td>
                            <div className="flex items-center gap-3">
                              <Avatar user={user} isLight={isLight} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate max-w-[160px]" style={{ color: textPrimary }}>
                                  {user.fullName ?? user.username ?? '—'}
                                </p>
                                <p className="text-xs truncate max-w-[160px]" style={{ color: textMuted }}>{user.email}</p>
                              </div>
                              {user.isAdmin && (
                                <span 
                                  className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: isLight ? 'rgba(91,82,224,0.15)' : 'rgba(108,99,255,0.2)',
                                    color: isLight ? '#5B52E0' : '#6C63FF',
                                  }}
                                >
                                  Admin
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                                {user.creditBalance.toLocaleString()}
                              </span>
                              <span className="text-[10px]" style={{ color: textMuted }}>
                                of {user.totalPurchased.toLocaleString()} bought
                              </span>
                            </div>
                          </td>
                          <td className="font-medium" style={{ color: textSecondary }}>{user.totalReports}</td>
                          <td style={{ color: textMuted }}>{user.totalConsumed.toLocaleString()}</td>
                          <td>
                            <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${statusStyles}`}>
                              {user.accountStatus}
                            </span>
                          </td>
                          <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                            {user.lastActiveAt
                              ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination - desktop */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
                <p className="text-xs" style={{ color: textMuted }}>
                  Page {filters.page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                    disabled={filters.page <= 1}
                    className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: borderColor,
                      color: textMuted,
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
                    return (
                      <button
                        key={page}
                        onClick={() => setFilters((f) => ({ ...f, page }))}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all`}
                        style={{
                          backgroundColor: filters.page === page ? (isLight ? '#5B52E0' : '#6C63FF') : 'transparent',
                          color: filters.page === page ? '#FFFFFF' : textMuted,
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                    disabled={filters.page >= totalPages}
                    className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: borderColor,
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

        {/* Pagination - mobile */}
        {isMobile && !loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
            <p className="text-xs" style={{ color: textMuted }}>Page {filters.page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: borderColor,
                  color: textMuted,
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
                className="p-2 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  borderColor: borderColor,
                  color: textMuted,
                }}
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