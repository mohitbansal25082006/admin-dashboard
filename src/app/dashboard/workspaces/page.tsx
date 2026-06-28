'use client';
// Admin-Dashboard/src/app/dashboard/workspaces/page.tsx
// Part 55.13 — Workspace Overview with full theme integration and mobile optimization.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Search, ChevronLeft, ChevronRight,
  Users, FileText, Globe, X, Loader2,
  Calendar, Crown, Shield, Eye, Hash,
  Activity, Share2, ChevronRight as Arrow,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { formatDistanceToNow, format } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';
import type { WorkspaceOverviewRow, WorkspaceOverviewFilters, PaginatedResponse } from '@/types/admin';

// ── Role metadata (theme-aware) ─────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; lightColor: string; bg: string; lightBg: string; icon: React.ReactNode }> = {
  owner: { 
    label: 'Owner', 
    color: 'text-yellow-400', 
    lightColor: 'text-yellow-700',
    bg: 'bg-yellow-500/15 border-yellow-500/25', 
    lightBg: 'bg-yellow-100 border-yellow-300',
    icon: <Crown className="w-3 h-3" /> 
  },
  editor: { 
    label: 'Editor', 
    color: 'text-blue-400', 
    lightColor: 'text-blue-700',
    bg: 'bg-blue-500/15 border-blue-500/25', 
    lightBg: 'bg-blue-100 border-blue-300',
    icon: <Shield className="w-3 h-3" /> 
  },
  viewer: { 
    label: 'Viewer', 
    color: 'text-white/50', 
    lightColor: 'text-gray-600',
    bg: 'bg-white/[0.06] border-white/[0.10]', 
    lightBg: 'bg-gray-100 border-gray-300',
    icon: <Eye className="w-3 h-3" /> 
  },
};

function getRoleStyles(role: string, isLight: boolean): string {
  const meta = ROLE_META[role] ?? ROLE_META.viewer;
  return isLight ? meta.lightBg : meta.bg;
}

function getRoleTextColor(role: string, isLight: boolean): string {
  const meta = ROLE_META[role] ?? ROLE_META.viewer;
  return isLight ? meta.lightColor : meta.color;
}

// ── Summary cards (theme-aware) ─────────────────────────────────────────────

function SummaryCards({ rows, loading }: { rows: WorkspaceOverviewRow[]; loading: boolean }) {
  const { isLight } = useTheme();
  const total = rows.length;
  const totalMembers = rows.reduce((s, r) => s + r.memberCount, 0);
  const totalReports = rows.reduce((s, r) => s + r.reportCount, 0);
  const avgMembers = total > 0 ? (totalMembers / total).toFixed(1) : '0';

  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';

  const cards = [
    { label: 'Total Workspaces', value: total, color: isLight ? '#5B52E0' : '#6C63FF', sub: 'all workspaces' },
    { label: 'Total Members', value: totalMembers.toLocaleString(), color: isLight ? '#2563EB' : '#3B82F6', sub: 'across all workspaces' },
    { label: 'Total Reports', value: totalReports.toLocaleString(), color: isLight ? '#059669' : '#10B981', sub: 'shared in workspaces' },
    { label: 'Avg Members', value: avgMembers, color: isLight ? '#D97706' : '#F59E0B', sub: 'per workspace' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5">
      {cards.map((c, i) => (
        <div 
          key={i} 
          className="rounded-xl border p-3 sm:p-4"
          style={{
            backgroundColor: cardBg,
            borderColor: borderColor,
          }}
        >
          {loading ? (
            <>
              <div className="h-6 sm:h-7 w-10 sm:w-14 rounded animate-pulse mb-1" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-20 sm:w-24 rounded animate-pulse" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
            </>
          ) : (
            <>
              <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[8px] sm:text-[10px] mt-0.5" style={{ color: textMuted }}>{c.sub}</p>
              <p className="text-[8px] sm:text-[9px] mt-1 uppercase tracking-wider font-semibold" style={{ color: textMuted }}>{c.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Workspace detail sheet (theme-aware) ────────────────────────────────────

function WorkspaceDetailSheet({ row, onClose }: { row: WorkspaceOverviewRow; onClose: () => void }) {
  const { isLight } = useTheme();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'members' | 'reports'>('info');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await adminFetch<any>(`/api/admin/workspaces/${row.id}`);
      setDetail(data);
      setLoading(false);
    })();
  }, [row.id]);

  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';
  const primaryColor = isLight ? '#5B52E0' : '#6C63FF';

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: isMobile ? '100%' : '520px',
          maxWidth: '100%',
          backgroundColor: bgColor,
          borderLeft: `1px solid ${borderColor}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: borderColor }}>
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                border: `1px solid ${isLight ? `${primaryColor}30` : `${primaryColor}30`}`,
              }}
            >
              <Building2 className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{row.name}</p>
              <p className="text-[10px] truncate" style={{ color: textMuted }}>{row.ownerEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 transition-colors shrink-0" style={{ color: textMuted }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick stats strip */}
        {!loading && detail && (
          <div className="grid grid-cols-4 gap-0 border-b shrink-0" style={{ borderColor: borderColor }}>
            {[
              { label: 'Members', value: detail.memberCount },
              { label: 'Reports', value: detail.reportCount },
              { label: 'Shared', value: detail.sharedCount },
              { label: 'Days', value: Math.round((Date.now() - new Date(detail.createdAt).getTime()) / 86400000) },
            ].map((s, i) => (
              <div key={i} className={`px-2 sm:px-4 py-3 text-center ${i < 3 ? 'border-r' : ''}`} style={{ borderColor: borderColor }}>
                <p className="text-base font-bold tabular-nums" style={{ color: textPrimary }}>{s.value}</p>
                <p className="text-[8px] sm:text-[9px] uppercase tracking-wider" style={{ color: textMuted }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: borderColor }}>
          {(['info', 'members', 'reports'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium capitalize transition-all ${
                tab === t
                  ? 'border-b-2'
                  : 'hover:opacity-80'
              }`}
              style={{
                color: tab === t ? primaryColor : textMuted,
                borderBottomColor: tab === t ? primaryColor : 'transparent',
              }}>
              {t}
              {!loading && detail && t === 'members' && (
                <span className="ml-1 text-[10px]" style={{ color: textMuted }}>({detail.memberCount})</span>
              )}
              {!loading && detail && t === 'reports' && (
                <span className="ml-1 text-[10px]" style={{ color: textMuted }}>({detail.reportCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
            </div>
          ) : !detail ? (
            <p className="text-sm text-center py-12" style={{ color: textMuted }}>Could not load details</p>
          ) : (
            <>
              {/* ── INFO ── */}
              {tab === 'info' && (
                <div className="flex flex-col gap-5">
                  <Section title="Workspace Info" isLight={isLight}>
                    <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Name" value={detail.name} isLight={isLight} />
                    <InfoRow icon={<Crown className="w-3.5 h-3.5" />} label="Owner" value={`${detail.ownerName || '—'} (${detail.ownerEmail})`} isLight={isLight} />
                    <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Invite Code" value={detail.inviteCode} isLight={isLight} />
                    <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created"
                      value={format(new Date(detail.createdAt), 'MMM d, yyyy HH:mm')} isLight={isLight} />
                    {detail.lastActivityAt && (
                      <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Last Active"
                        value={formatDistanceToNow(new Date(detail.lastActivityAt), { addSuffix: true })} isLight={isLight} />
                    )}
                  </Section>

                  {detail.description && (
                    <Section title="Description" isLight={isLight}>
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{detail.description}</p>
                    </Section>
                  )}

                  {detail.settings && Object.keys(detail.settings).length > 0 && (
                    <Section title="Settings" isLight={isLight}>
                      {Object.entries(detail.settings).map(([k, v]) => (
                        <InfoRow key={k}
                          icon={<Hash className="w-3.5 h-3.5" />}
                          label={k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          value={String(v)} isLight={isLight} />
                      ))}
                    </Section>
                  )}
                </div>
              )}

              {/* ── MEMBERS ── */}
              {tab === 'members' && (
                <div className="flex flex-col gap-2">
                  {detail.members.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: textMuted }}>No members found</p>
                  ) : detail.members.map((m: any) => {
                    const roleStyles = getRoleStyles(m.role, isLight);
                    const roleColor = getRoleTextColor(m.role, isLight);
                    const rm = ROLE_META[m.role] ?? ROLE_META.viewer;
                    return (
                      <div 
                        key={m.id}
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{
                          backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                          borderColor: borderColor,
                        }}>
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0"
                          style={{
                            backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                            border: `1px solid ${isLight ? `${primaryColor}30` : `${primaryColor}30`}`,
                            color: primaryColor,
                          }}
                        >
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : (m.name || m.email || '?').slice(0, 1).toUpperCase()
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: textSecondary }}>{m.name || '—'}</p>
                          <p className="text-[10px] truncate" style={{ color: textMuted }}>{m.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                                            px-1.5 py-0.5 rounded-full border ${roleStyles}`}
                            style={{ color: roleColor }}>
                            {rm.icon}{rm.label}
                          </span>
                          <span className="text-[9px]" style={{ color: textMuted }}>
                            {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── REPORTS ── */}
              {tab === 'reports' && (
                <div className="flex flex-col gap-2">
                  {detail.reports.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: textMuted }}>No reports shared in this workspace</p>
                  ) : detail.reports.map((r: any) => (
                    <div 
                      key={r.id}
                      className="flex items-start gap-3 p-3 rounded-xl border"
                      style={{
                        backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                        borderColor: borderColor,
                      }}>
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                          border: `1px solid ${isLight ? `${primaryColor}30` : `${primaryColor}30`}`,
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: textSecondary }}>{r.title}</p>
                        {r.query && r.query !== r.title && (
                          <p className="text-[10px] truncate mt-0.5" style={{ color: textMuted }}>{r.query}</p>
                        )}
                        <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>
                          Added {formatDistanceToNow(new Date(r.addedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Mobile Workspace Card ────────────────────────────────────────────────────

function MobileWorkspaceCard({ row, isLight, onSelect }: {
  row: WorkspaceOverviewRow;
  isLight: boolean;
  onSelect: (row: WorkspaceOverviewRow) => void;
}) {
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const primaryColor = isLight ? '#5B52E0' : '#6C63FF';

  return (
    <div 
      className="rounded-xl border p-4 space-y-3 cursor-pointer transition-colors"
      style={{
        backgroundColor: cardBg,
        borderColor: borderColor,
      }}
      onClick={() => onSelect(row)}
    >
      {/* Header: Icon + Name + Owner */}
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
            border: `1px solid ${isLight ? `${primaryColor}30` : `${primaryColor}30`}`,
          }}
        >
          <Building2 className="w-3.5 h-3.5" style={{ color: primaryColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{row.name}</p>
          {row.description && (
            <p className="text-[10px] truncate" style={{ color: textMuted }}>{row.description}</p>
          )}
        </div>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: textMuted }}>Owner:</span>
        <span className="text-xs font-medium truncate" style={{ color: textSecondary }}>
          {row.ownerName || row.ownerEmail || '—'}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: borderColor }}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Users className="w-3 h-3" style={{ color: textMuted }} />
            <p className="text-sm font-bold" style={{ color: textPrimary }}>{row.memberCount}</p>
          </div>
          <p className="text-[8px]" style={{ color: textMuted }}>Members</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <FileText className="w-3 h-3" style={{ color: textMuted }} />
            <p className="text-sm font-bold" style={{ color: textPrimary }}>{row.reportCount}</p>
          </div>
          <p className="text-[8px]" style={{ color: textMuted }}>Reports</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Globe className="w-3 h-3" style={{ color: textMuted }} />
            <p className="text-[10px] font-mono" style={{ color: textMuted }}>{row.inviteCode}</p>
          </div>
          <p className="text-[8px]" style={{ color: textMuted }}>Invite Code</p>
        </div>
      </div>

      {/* Footer: Created + Last Activity */}
      <div className="flex items-center justify-between text-[10px]" style={{ color: textMuted }}>
        <span>Created {format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
        <span>
          {row.lastActivityAt
            ? `Active ${formatDistanceToNow(new Date(row.lastActivityAt), { addSuffix: true })}`
            : 'No activity'}
        </span>
      </div>
    </div>
  );
}

// ── Helpers (theme-aware) ────────────────────────────────────────────────────

function Section({ title, children, isLight }: { title: string; children: React.ReactNode; isLight: boolean }) {
  const textMuted = isLight ? '#888' : 'var(--text-muted)';
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, isLight }: { icon: React.ReactNode; label: string; value: string; isLight: boolean }) {
  const textMuted = isLight ? '#888' : 'var(--text-muted)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="shrink-0 mt-0.5" style={{ color: textMuted }}>{icon}</span>
      <span className="shrink-0 w-24" style={{ color: textMuted }}>{label}:</span>
      <span className="flex-1 break-words" style={{ color: textSecondary }}>{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkspacesPage() {
  const { isLight } = useTheme();
  const [rows, setRows] = useState<WorkspaceOverviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkspaceOverviewRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [filters, setFilters] = useState<WorkspaceOverviewFilters>({
    search: '', page: 1, pageSize: 20,
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

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: filters.search,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<WorkspaceOverviewRow>>(
      `/api/admin/workspaces?${params.toString()}`,
    );
    if (data) { setRows(data.data); setTotal(data.total); setTotalPages(data.totalPages); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: value, page: 1 }));
    }, 350);
  };

  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const inputBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const inputText = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const primaryColor = isLight ? '#5B52E0' : '#6C63FF';

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: textPrimary }}>
          <Building2 className="w-5 h-5" style={{ color: primaryColor }} />
          Workspace Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: textMuted }}>
          All workspaces on the platform · Click any row to see members and reports
        </p>
      </div>

      <SummaryCards rows={rows} loading={loading} />

      {/* Search - mobile responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
          <input
            type="text"
            placeholder="Search by workspace name or owner email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>
        <div className="text-xs text-right sm:ml-auto" style={{ color: textMuted }}>
          {total.toLocaleString()} workspaces
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
                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    <div className="flex-1">
                      <div className="h-4 w-32 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                      <div className="h-3 w-24 rounded mt-1" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="text-center">
                        <div className="h-4 w-8 mx-auto rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                        <div className="h-2 w-12 mx-auto mt-1 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="w-12 h-12 mb-3 opacity-30" style={{ color: textMuted }} />
                <p className="text-base font-medium" style={{ color: textMuted }}>No workspaces found</p>
              </div>
            ) : (
              rows.map((row) => (
                <MobileWorkspaceCard 
                  key={row.id} 
                  row={row} 
                  isLight={isLight} 
                  onSelect={setSelected} 
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
                    <th style={{ color: textMuted }}>Workspace</th>
                    <th style={{ color: textMuted }}>Owner</th>
                    <th style={{ color: textMuted }}>Members</th>
                    <th style={{ color: textMuted }}>Reports</th>
                    <th style={{ color: textMuted }}>Invite Code</th>
                    <th style={{ color: textMuted }}>Created</th>
                    <th style={{ color: textMuted }}>Last Activity</th>
                    <th style={{ color: textMuted }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j}>
                            <div className="h-4 rounded animate-pulse max-w-[100px]" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16" style={{ color: textMuted }}>
                        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
                        No workspaces found
                      </td>
                    </tr>
                  ) : rows.map(row => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                              border: `1px solid ${isLight ? `${primaryColor}30` : `${primaryColor}30`}`,
                            }}
                          >
                            <Building2 className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[180px]" style={{ color: textPrimary }}>{row.name}</p>
                            {row.description && (
                              <p className="text-[10px] truncate max-w-[180px]" style={{ color: textMuted }}>{row.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs truncate max-w-[140px]" style={{ color: textSecondary }}>{row.ownerName ?? '—'}</p>
                        <p className="text-[10px] truncate max-w-[140px]" style={{ color: textMuted }}>{row.ownerEmail ?? ''}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" style={{ color: textMuted }} />
                          <span className="text-sm font-semibold tabular-nums" style={{ color: textPrimary }}>{row.memberCount}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" style={{ color: textMuted }} />
                          <span className="text-sm font-semibold tabular-nums" style={{ color: textPrimary }}>{row.reportCount}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3" style={{ color: textMuted }} />
                          <span className="text-[10px] font-mono" style={{ color: textMuted }}>{row.inviteCode}</span>
                        </div>
                      </td>
                      <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                        {format(new Date(row.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                        {row.lastActivityAt
                          ? formatDistanceToNow(new Date(row.lastActivityAt), { addSuffix: true })
                          : 'No activity'}
                      </td>
                      <td>
                        <Arrow className="w-3.5 h-3.5" style={{ color: textMuted }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - desktop */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
                <p className="text-xs" style={{ color: textMuted }}>
                  Page {filters.page} of {totalPages} · {total.toLocaleString()} workspaces
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
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
                    const p = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
                    return (
                      <button
                        key={p}
                        onClick={() => setFilters(f => ({ ...f, page: p }))}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all`}
                        style={{
                          backgroundColor: filters.page === p ? primaryColor : 'transparent',
                          color: filters.page === p ? '#FFFFFF' : textMuted,
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
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
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
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
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
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

      {/* Detail sheet */}
      {selected && (
        <WorkspaceDetailSheet row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}