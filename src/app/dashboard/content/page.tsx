'use client';
// Admin-Dashboard/src/app/dashboard/content/page.tsx
// Part 32 UPDATE — Added click-to-expand detail sheet for every content row.

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, ChevronLeft, ChevronRight,
  Mic, Sword, GraduationCap, Filter, X,
  Loader2, Calendar, User, BarChart2, Tag,
  BookOpen, Clock, Hash, Star, ChevronRight as Arrow,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { formatDistanceToNow, format } from 'date-fns';
import type { PlatformContentRow, ContentFilters, PaginatedResponse, PlatformContentType } from '@/types/admin';

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<PlatformContentType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  report:         { label: 'Research Report', icon: <FileText      className="w-3.5 h-3.5" />, color: 'text-[#6C63FF]',  bg: 'bg-[#6C63FF]/15 border-[#6C63FF]/25'   },
  podcast:        { label: 'Podcast',         icon: <Mic           className="w-3.5 h-3.5" />, color: 'text-pink-400',   bg: 'bg-pink-500/15  border-pink-500/25'    },
  debate:         { label: 'Debate',          icon: <Sword         className="w-3.5 h-3.5" />, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/25' },
  academic_paper: { label: 'Academic Paper',  icon: <GraduationCap className="w-3.5 h-3.5" />, color: 'text-teal-400',   bg: 'bg-teal-500/15   border-teal-500/25'   },
};

const DEPTH_COLOR: Record<string, string> = {
  quick:  'text-green-400  bg-green-500/10  border-green-500/20',
  deep:   'text-blue-400   bg-blue-500/10   border-blue-500/20',
  expert: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const STATUS_COLOR: Record<string, string> = {
  completed:  'text-green-400',
  failed:     'text-red-400',
  generating: 'text-yellow-400',
  pending:    'text-white/40',
};

// ── Summary cards ─────────────────────────────────────────────────────────────

function TypeCountCards({ data, loading, activeType, onFilter }: {
  data: PlatformContentRow[];
  loading: boolean;
  activeType: PlatformContentType | 'all';
  onFilter: (t: PlatformContentType | 'all') => void;
}) {
  const counts = {
    all:            data.length,
    report:         data.filter(r => r.contentType === 'report').length,
    podcast:        data.filter(r => r.contentType === 'podcast').length,
    debate:         data.filter(r => r.contentType === 'debate').length,
    academic_paper: data.filter(r => r.contentType === 'academic_paper').length,
  };

  const cards: { type: PlatformContentType | 'all'; label: string; color: string }[] = [
    { type: 'all',            label: 'All Content',     color: '#6C63FF' },
    { type: 'report',         label: 'Reports',         color: '#8B5CF6' },
    { type: 'podcast',        label: 'Podcasts',        color: '#EC4899' },
    { type: 'debate',         label: 'Debates',         color: '#F97316' },
    { type: 'academic_paper', label: 'Academic Papers', color: '#14B8A6' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
      {cards.map(c => (
        <button key={c.type} onClick={() => onFilter(c.type)}
          className={`rounded-xl border p-3 text-left transition-all
            ${activeType === c.type
              ? 'border-white/20 bg-white/[0.08]'
              : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
            }`}>
          {loading
            ? <div className="h-7 w-10 bg-white/[0.06] rounded animate-pulse mb-1" />
            : <p className="text-xl font-bold tabular-nums" style={{ color: c.color }}>{counts[c.type].toLocaleString()}</p>
          }
          <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wide font-semibold">{c.label}</p>
        </button>
      ))}
    </div>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function ContentDetailSheet({ row, onClose }: { row: PlatformContentRow; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const meta = TYPE_META[row.contentType];

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await adminFetch<any>(
        `/api/admin/content/${row.id}?type=${row.contentType}`,
      );
      setDetail(data);
      setLoading(false);
    })();
  }, [row.id, row.contentType]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[500px] z-50
                   flex flex-col border-l border-white/[0.07] overflow-hidden"
        style={{ background: '#0D0D1A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                              px-2 py-1 rounded-full border shrink-0 ${meta.bg} ${meta.color}`}>
              {meta.icon}{meta.label}
            </span>
            <p className="text-sm font-semibold text-white truncate">{row.title}</p>
          </div>
          <button onClick={onClose}
            className="p-2 text-white/35 hover:text-white/70 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
            </div>
          ) : !detail ? (
            <p className="text-white/35 text-sm text-center py-12">Could not load details</p>
          ) : (
            <div className="flex flex-col gap-5">

              {/* User info */}
              <Section title="Created By">
                <InfoRow icon={<User className="w-3.5 h-3.5" />}   label="Name"  value={detail.userName  || '—'} />
                <InfoRow icon={<Hash className="w-3.5 h-3.5" />}   label="Email" value={detail.userEmail || '—'} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created"
                  value={format(new Date(detail.createdAt), 'MMM d, yyyy HH:mm')} />
                {detail.completedAt && (
                  <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="Completed"
                    value={format(new Date(detail.completedAt), 'MMM d, yyyy HH:mm')} />
                )}
              </Section>

              {/* ── REPORT ── */}
              {detail.type === 'report' && (
                <>
                  <Section title="Research Details">
                    <InfoRow icon={<Tag className="w-3.5 h-3.5" />}     label="Query"   value={detail.query} />
                    <InfoRow icon={<BarChart2 className="w-3.5 h-3.5" />} label="Depth" value={detail.depth} />
                    <InfoRow icon={<Star className="w-3.5 h-3.5" />}    label="Status"  value={detail.status} />
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <StatTile label="Sources"     value={detail.sourcesCount}    />
                      <StatTile label="Sections"    value={detail.sectionsCount}   />
                      <StatTile label="Citations"   value={detail.citationsCount}  />
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05] mt-1">
                      <p className="text-[10px] text-white/30 mb-1">Reliability</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full"
                            style={{ width: `${detail.reliabilityScore}%` }} />
                        </div>
                        <span className="text-xs text-white/60 font-semibold">
                          {detail.reliabilityScore}%
                        </span>
                      </div>
                    </div>
                  </Section>

                  {detail.executiveSummary && (
                    <Section title="Executive Summary">
                      <p className="text-xs text-white/55 leading-relaxed">{detail.executiveSummary}</p>
                    </Section>
                  )}

                  {detail.keyFindings?.length > 0 && (
                    <Section title={`Key Findings (${detail.keyFindings.length})`}>
                      <div className="flex flex-col gap-1.5">
                        {detail.keyFindings.slice(0, 5).map((f: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs text-white/55">
                            <span className="text-[#6C63FF] font-bold shrink-0">{i + 1}.</span>
                            <span>{f}</span>
                          </div>
                        ))}
                        {detail.keyFindings.length > 5 && (
                          <p className="text-[10px] text-white/30">+{detail.keyFindings.length - 5} more</p>
                        )}
                      </div>
                    </Section>
                  )}
                </>
              )}

              {/* ── PODCAST ── */}
              {detail.type === 'podcast' && (
                <Section title="Podcast Details">
                  <InfoRow icon={<Mic className="w-3.5 h-3.5" />}  label="Topic"    value={detail.topic} />
                  <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="Status"   value={detail.status} />
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Host"     value={`${detail.hostName} (${detail.hostVoice})`} />
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Guest"    value={`${detail.guestName} (${detail.guestVoice})`} />
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <StatTile label="Duration"   value={`${Math.round((detail.durationSeconds || 0) / 60)} min`} />
                    <StatTile label="Turns"      value={detail.turnsCount}     />
                    <StatTile label="Exports"    value={detail.exportCount}    />
                  </div>
                </Section>
              )}

              {/* ── DEBATE ── */}
              {detail.type === 'debate' && (
                <>
                  <Section title="Debate Details">
                    <InfoRow icon={<Hash className="w-3.5 h-3.5" />}   label="Question" value={detail.question} />
                    <InfoRow icon={<Star className="w-3.5 h-3.5" />}   label="Status"   value={detail.status} />
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <StatTile label="Agents"   value={detail.perspectivesCount}  />
                      <StatTile label="Sources"  value={detail.searchResultsCount} />
                    </div>
                  </Section>

                  {detail.agentRoles?.length > 0 && (
                    <Section title="Agents">
                      <div className="flex flex-wrap gap-1.5">
                        {detail.agentRoles.map((r: string) => (
                          <span key={r}
                            className="text-xs capitalize bg-orange-500/10 text-orange-400
                                       border border-orange-500/20 px-2 py-0.5 rounded-full">
                            {r}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {detail.stanceDistribution && Object.keys(detail.stanceDistribution).length > 0 && (
                    <Section title="Stance Distribution">
                      {Object.entries(detail.stanceDistribution).map(([stance, count]) => (
                        <div key={stance} className="flex items-center justify-between text-xs py-0.5">
                          <span className="text-white/45 capitalize">{stance.replace(/_/g, ' ')}</span>
                          <span className="text-white/60 font-medium">{count as number} agents</span>
                        </div>
                      ))}
                    </Section>
                  )}

                  {detail.moderatorSummary && (
                    <Section title="Moderator Verdict">
                      <p className="text-xs text-white/55 leading-relaxed">{detail.moderatorSummary}</p>
                    </Section>
                  )}
                </>
              )}

              {/* ── ACADEMIC PAPER ── */}
              {detail.type === 'academic_paper' && (
                <>
                  <Section title="Paper Details">
                    <InfoRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Citation Style" value={detail.citationStyle?.toUpperCase()} />
                    <InfoRow icon={<Tag className="w-3.5 h-3.5" />}      label="Running Head"   value={detail.runningHead || '—'} />
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <StatTile label="Words"     value={detail.wordCount?.toLocaleString()}    />
                      <StatTile label="Pages"     value={detail.pageEstimate}                   />
                      <StatTile label="Sections"  value={detail.sectionsCount}                  />
                    </div>
                    <StatTile label="Citations"   value={detail.citationsCount}                 />
                  </Section>

                  {detail.abstract && (
                    <Section title="Abstract">
                      <p className="text-xs text-white/55 leading-relaxed line-clamp-6">{detail.abstract}</p>
                    </Section>
                  )}

                  {detail.keywords?.length > 0 && (
                    <Section title="Keywords">
                      <div className="flex flex-wrap gap-1.5">
                        {detail.keywords.map((k: string) => (
                          <span key={k}
                            className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20
                                       px-2 py-0.5 rounded-full">
                            {k}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}

            </div>
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
      <span className="text-white/35 shrink-0 w-20">{label}:</span>
      <span className="text-white/65 flex-1 break-words">{value}</span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.05] text-center">
      <p className="text-sm font-bold text-white/70">{value ?? '—'}</p>
      <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [allRows,    setAllRows]    = useState<PlatformContentRow[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<PlatformContentRow | null>(null);

  const [filters, setFilters] = useState<ContentFilters>({
    search: '', contentType: 'all', page: 1, pageSize: 20,
  });

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search:   filters.search,
      type:     filters.contentType,
      page:     String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<PlatformContentRow>>(
      `/api/admin/content?${params.toString()}`,
    );
    if (data) { setAllRows(data.data); setTotal(data.total); setTotalPages(data.totalPages); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleSearch = useCallback(
    debounce((v: string) => setFilters(f => ({ ...f, search: v, page: 1 })), 350),
    [],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#6C63FF]" />
          Content View
        </h1>
        <p className="text-sm text-white/35 mt-1">
          All platform-generated content · Click any row to see full details
        </p>
      </div>

      <TypeCountCards
        data={allRows} loading={loading} activeType={filters.contentType}
        onFilter={(t) => setFilters(f => ({ ...f, contentType: t, page: 1 }))}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input type="text" placeholder="Search by title, query, or user email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl
                       pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25
                       outline-none focus:border-[#6C63FF]/40 transition-all" />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/25" />
          {(['all', 'report', 'podcast', 'debate', 'academic_paper'] as const).map(t => (
            <button key={t} onClick={() => setFilters(f => ({ ...f, contentType: t, page: 1 }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filters.contentType === t
                  ? 'bg-[#6C63FF]/20 text-[#6C63FF] border border-[#6C63FF]/30'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                }`}>
              {t === 'all' ? 'All' : TYPE_META[t as PlatformContentType].label}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-white/30 whitespace-nowrap">{total.toLocaleString()} items</div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: '#0D0D1A' }}>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>Type</th><th>Title</th><th>User</th>
                <th>Status</th><th>Details</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}><div className="h-4 bg-white/[0.05] rounded animate-pulse max-w-[120px]" /></td>
                    ))}
                  </tr>
                ))
              ) : allRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/25">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />No content found
                  </td>
                </tr>
              ) : allRows.map(row => {
                const meta = TYPE_META[row.contentType];
                const statusColor = STATUS_COLOR[row.status] ?? 'text-white/40';
                return (
                  <tr key={`${row.contentType}-${row.id}`}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer hover:bg-white/[0.02] transition-colors">
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                                        px-2 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                        {meta.icon}{meta.label}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-white/80 truncate max-w-[240px]">{row.title}</p>
                      {row.subtitle && (
                        <p className="text-[10px] text-white/30 truncate max-w-[240px] mt-0.5">{row.subtitle}</p>
                      )}
                    </td>
                    <td>
                      <p className="text-xs text-white/60 truncate max-w-[130px]">{row.userName ?? '—'}</p>
                      <p className="text-[10px] text-white/30 truncate max-w-[130px]">{row.userEmail ?? ''}</p>
                    </td>
                    <td><span className={`text-xs font-medium capitalize ${statusColor}`}>{row.status}</span></td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        {row.depth && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium w-fit capitalize ${DEPTH_COLOR[row.depth] ?? 'text-white/40'}`}>
                            {row.depth}
                          </span>
                        )}
                        {row.sourcesCount !== undefined && <span className="text-[10px] text-white/30">{row.sourcesCount} sources</span>}
                        {row.durationSeconds !== undefined && <span className="text-[10px] text-white/30">{Math.round(row.durationSeconds / 60)} min</span>}
                        {row.wordCount !== undefined && <span className="text-[10px] text-white/30">{row.wordCount.toLocaleString()} words</span>}
                      </div>
                    </td>
                    <td className="text-xs text-white/30 whitespace-nowrap">
                      {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      <Arrow className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">Page {filters.page} of {totalPages} · {total.toLocaleString()} items</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={filters.page <= 1}
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
              <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={filters.page >= totalPages}
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
        <ContentDetailSheet row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}