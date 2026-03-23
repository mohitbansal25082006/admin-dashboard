'use client';
// Admin-Dashboard/src/app/dashboard/workspaces/page.tsx
// Part 32 UPDATE — Added click-to-expand detail sheet for workspace rows.

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Search, ChevronLeft, ChevronRight,
  Users, FileText, Globe, X, Loader2,
  Calendar, Crown, Shield, Eye, Hash,
  Activity, Share2, ChevronRight as Arrow,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { formatDistanceToNow, format } from 'date-fns';
import type { WorkspaceOverviewRow, WorkspaceOverviewFilters, PaginatedResponse } from '@/types/admin';

// ── Role metadata ─────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  owner:  { label: 'Owner',  color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/25', icon: <Crown  className="w-3 h-3" /> },
  editor: { label: 'Editor', color: 'text-blue-400',   bg: 'bg-blue-500/15   border-blue-500/25',   icon: <Shield className="w-3 h-3" /> },
  viewer: { label: 'Viewer', color: 'text-white/50',   bg: 'bg-white/[0.06]  border-white/[0.10]',  icon: <Eye    className="w-3 h-3" /> },
};

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ rows, loading }: { rows: WorkspaceOverviewRow[]; loading: boolean }) {
  const total        = rows.length;
  const totalMembers = rows.reduce((s, r) => s + r.memberCount, 0);
  const totalReports = rows.reduce((s, r) => s + r.reportCount, 0);
  const avgMembers   = total > 0 ? (totalMembers / total).toFixed(1) : '0';

  const cards = [
    { label: 'Total Workspaces', value: total,                         color: '#6C63FF', sub: 'all workspaces'        },
    { label: 'Total Members',    value: totalMembers.toLocaleString(), color: '#3B82F6', sub: 'across all workspaces' },
    { label: 'Total Reports',    value: totalReports.toLocaleString(), color: '#10B981', sub: 'shared in workspaces'  },
    { label: 'Avg Members',      value: avgMembers,                    color: '#F59E0B', sub: 'per workspace'         },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {cards.map((c, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] p-4"
          style={{ background: 'linear-gradient(135deg,#13131F 0%,#0F0F1C 100%)' }}>
          {loading ? (
            <>
              <div className="h-7 w-14 bg-white/[0.06] rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{c.sub}</p>
              <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wider font-semibold">{c.label}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Workspace detail sheet ────────────────────────────────────────────────────

function WorkspaceDetailSheet({ row, onClose }: { row: WorkspaceOverviewRow; onClose: () => void }) {
  const [detail,  setDetail]  = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'info' | 'members' | 'reports'>('info');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await adminFetch<any>(`/api/admin/workspaces/${row.id}`);
      setDetail(data);
      setLoading(false);
    })();
  }, [row.id]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[520px] z-50
                   flex flex-col border-l border-white/[0.07] overflow-hidden"
        style={{ background: '#0D0D1A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/15 border border-[#6C63FF]/20
                            flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#6C63FF]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{row.name}</p>
              <p className="text-[10px] text-white/35 truncate">{row.ownerEmail}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-white/35 hover:text-white/70 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick stats strip */}
        {!loading && detail && (
          <div className="grid grid-cols-4 gap-0 border-b border-white/[0.06] shrink-0">
            {[
              { label: 'Members',  value: detail.memberCount },
              { label: 'Reports',  value: detail.reportCount },
              { label: 'Shared',   value: detail.sharedCount },
              { label: 'Days',     value: Math.round((Date.now() - new Date(detail.createdAt).getTime()) / 86400000) },
            ].map((s, i) => (
              <div key={i} className={`px-4 py-3 text-center ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}>
                <p className="text-base font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] shrink-0">
          {(['info', 'members', 'reports'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium capitalize transition-all
                ${tab === t
                  ? 'text-[#6C63FF] border-b-2 border-[#6C63FF]'
                  : 'text-white/35 hover:text-white/60'
                }`}>
              {t}
              {!loading && detail && t === 'members' && (
                <span className="ml-1 text-[10px] text-white/30">({detail.memberCount})</span>
              )}
              {!loading && detail && t === 'reports' && (
                <span className="ml-1 text-[10px] text-white/30">({detail.reportCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
            </div>
          ) : !detail ? (
            <p className="text-white/35 text-sm text-center py-12">Could not load details</p>
          ) : (
            <>
              {/* ── INFO ── */}
              {tab === 'info' && (
                <div className="flex flex-col gap-5">
                  <Section title="Workspace Info">
                    <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Name"        value={detail.name} />
                    <InfoRow icon={<Crown     className="w-3.5 h-3.5" />} label="Owner"       value={`${detail.ownerName || '—'} (${detail.ownerEmail})`} />
                    <InfoRow icon={<Globe     className="w-3.5 h-3.5" />} label="Invite Code" value={detail.inviteCode} />
                    <InfoRow icon={<Calendar  className="w-3.5 h-3.5" />} label="Created"
                      value={format(new Date(detail.createdAt), 'MMM d, yyyy HH:mm')} />
                    {detail.lastActivityAt && (
                      <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Last Active"
                        value={formatDistanceToNow(new Date(detail.lastActivityAt), { addSuffix: true })} />
                    )}
                  </Section>

                  {detail.description && (
                    <Section title="Description">
                      <p className="text-xs text-white/55 leading-relaxed">{detail.description}</p>
                    </Section>
                  )}

                  {detail.settings && Object.keys(detail.settings).length > 0 && (
                    <Section title="Settings">
                      {Object.entries(detail.settings).map(([k, v]) => (
                        <InfoRow key={k}
                          icon={<Hash className="w-3.5 h-3.5" />}
                          label={k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          value={String(v)} />
                      ))}
                    </Section>
                  )}
                </div>
              )}

              {/* ── MEMBERS ── */}
              {tab === 'members' && (
                <div className="flex flex-col gap-2">
                  {detail.members.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-8">No members found</p>
                  ) : detail.members.map((m: any) => {
                    const rm = ROLE_META[m.role] ?? ROLE_META.viewer;
                    return (
                      <div key={m.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/20
                                        flex items-center justify-center text-[11px] font-bold text-[#6C63FF]
                                        overflow-hidden shrink-0">
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                            : (m.name || m.email || '?').slice(0, 1).toUpperCase()
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/70 truncate">{m.name || '—'}</p>
                          <p className="text-[10px] text-white/35 truncate">{m.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold
                                            px-1.5 py-0.5 rounded-full border ${rm.bg} ${rm.color}`}>
                            {rm.icon}{rm.label}
                          </span>
                          <span className="text-[9px] text-white/25">
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
                    <p className="text-white/30 text-sm text-center py-8">No reports shared in this workspace</p>
                  ) : detail.reports.map((r: any) => (
                    <div key={r.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="w-7 h-7 rounded-lg bg-[#6C63FF]/10 border border-[#6C63FF]/15
                                      flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-[#6C63FF]/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/70 truncate">{r.title}</p>
                        {r.query && r.query !== r.title && (
                          <p className="text-[10px] text-white/30 truncate mt-0.5">{r.query}</p>
                        )}
                        <p className="text-[10px] text-white/25 mt-0.5">
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-white/25 shrink-0 mt-0.5">{icon}</span>
      <span className="text-white/35 shrink-0 w-24">{label}:</span>
      <span className="text-white/65 flex-1 break-words">{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkspacesPage() {
  const [rows,       setRows]       = useState<WorkspaceOverviewRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<WorkspaceOverviewRow | null>(null);

  const [filters, setFilters] = useState<WorkspaceOverviewFilters>({
    search: '', page: 1, pageSize: 20,
  });

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search:   filters.search,
      page:     String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<WorkspaceOverviewRow>>(
      `/api/admin/workspaces?${params.toString()}`,
    );
    if (data) { setRows(data.data); setTotal(data.total); setTotalPages(data.totalPages); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleSearch = useCallback(
    debounce((v: string) => setFilters(f => ({ ...f, search: v, page: 1 })), 350),
    [],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#6C63FF]" />
          Workspace Overview
        </h1>
        <p className="text-sm text-white/35 mt-1">
          All workspaces on the platform · Click any row to see members and reports
        </p>
      </div>

      <SummaryCards rows={rows} loading={loading} />

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input type="text" placeholder="Search by workspace name or owner email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all" />
        </div>
        <div className="ml-auto text-xs text-white/30">{total.toLocaleString()} workspaces</div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: '#0D0D1A' }}>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Workspace</th><th>Owner</th><th>Members</th>
                <th>Reports</th><th>Invite Code</th><th>Created</th><th>Last Activity</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}><div className="h-4 bg-white/[0.05] rounded animate-pulse max-w-[100px]" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/25">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-20" />No workspaces found
                  </td>
                </tr>
              ) : rows.map(row => (
                <tr key={row.id}
                  onClick={() => setSelected(row)}
                  className="cursor-pointer hover:bg-white/[0.02] transition-colors">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/15 border border-[#6C63FF]/20
                                      flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-[#6C63FF]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate max-w-[180px]">{row.name}</p>
                        {row.description && (
                          <p className="text-[10px] text-white/30 truncate max-w-[180px]">{row.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-xs text-white/60 truncate max-w-[140px]">{row.ownerName ?? '—'}</p>
                    <p className="text-[10px] text-white/30 truncate max-w-[140px]">{row.ownerEmail ?? ''}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-sm font-semibold text-white/70 tabular-nums">{row.memberCount}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-sm font-semibold text-white/70 tabular-nums">{row.reportCount}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-white/20" />
                      <span className="text-[10px] font-mono text-white/35">{row.inviteCode}</span>
                    </div>
                  </td>
                  <td className="text-xs text-white/30 whitespace-nowrap">
                    {format(new Date(row.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="text-xs text-white/30 whitespace-nowrap">
                    {row.lastActivityAt
                      ? formatDistanceToNow(new Date(row.lastActivityAt), { addSuffix: true })
                      : 'No activity'}
                  </td>
                  <td>
                    <Arrow className="w-3.5 h-3.5 text-white/20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">
              Page {filters.page} of {totalPages} · {total.toLocaleString()} workspaces
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page <= 1}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
                return (
                  <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                      ${filters.page === p ? 'bg-[#6C63FF] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page >= totalPages}
                className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                           hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed">
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

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}