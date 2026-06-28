'use client';
// Admin-Dashboard/src/app/dashboard/content/page.tsx
// Part 55.13 — Content View with full theme integration and mobile optimization.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Search, ChevronLeft, ChevronRight,
  Mic, Sword, GraduationCap, Filter, X,
  Loader2, Calendar, User, BarChart2, Tag,
  BookOpen, Clock, Hash, Star, ChevronRight as Arrow,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { formatDistanceToNow, format } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';
import type { PlatformContentRow, ContentFilters, PaginatedResponse, PlatformContentType } from '@/types/admin';

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<PlatformContentType, { label: string; icon: React.ReactNode; color: string; lightColor: string; bg: string; lightBg: string }> = {
  report: { 
    label: 'Research Report', 
    icon: <FileText className="w-3.5 h-3.5" />, 
    color: 'text-[#6C63FF]', 
    lightColor: 'text-[#5B52E0]',
    bg: 'bg-[#6C63FF]/15 border-[#6C63FF]/25',
    lightBg: 'bg-[#6C63FF]/10 border-[#6C63FF]/30'
  },
  podcast: { 
    label: 'Podcast', 
    icon: <Mic className="w-3.5 h-3.5" />, 
    color: 'text-pink-400', 
    lightColor: 'text-pink-600',
    bg: 'bg-pink-500/15 border-pink-500/25',
    lightBg: 'bg-pink-100 border-pink-300'
  },
  debate: { 
    label: 'Debate', 
    icon: <Sword className="w-3.5 h-3.5" />, 
    color: 'text-orange-400', 
    lightColor: 'text-orange-600',
    bg: 'bg-orange-500/15 border-orange-500/25',
    lightBg: 'bg-orange-100 border-orange-300'
  },
  academic_paper: { 
    label: 'Academic Paper', 
    icon: <GraduationCap className="w-3.5 h-3.5" />, 
    color: 'text-teal-400', 
    lightColor: 'text-teal-600',
    bg: 'bg-teal-500/15 border-teal-500/25',
    lightBg: 'bg-teal-100 border-teal-300'
  },
};

const DEPTH_COLOR: Record<string, { dark: string; light: string }> = {
  quick:  { dark: 'text-green-400 bg-green-500/10 border-green-500/20', light: 'text-green-700 bg-green-100 border-green-300' },
  deep:   { dark: 'text-blue-400 bg-blue-500/10 border-blue-500/20', light: 'text-blue-700 bg-blue-100 border-blue-300' },
  expert: { dark: 'text-purple-400 bg-purple-500/10 border-purple-500/20', light: 'text-purple-700 bg-purple-100 border-purple-300' },
};

const STATUS_COLOR: Record<string, { dark: string; light: string }> = {
  completed:  { dark: 'text-green-400', light: 'text-green-700' },
  failed:     { dark: 'text-red-400', light: 'text-red-700' },
  generating: { dark: 'text-yellow-400', light: 'text-yellow-700' },
  pending:    { dark: 'text-white/40', light: 'text-gray-400' },
};

// ── Summary cards ─────────────────────────────────────────────────────────────

function TypeCountCards({ data, loading, activeType, onFilter }: {
  data: PlatformContentRow[];
  loading: boolean;
  activeType: PlatformContentType | 'all';
  onFilter: (t: PlatformContentType | 'all') => void;
}) {
  const { isLight } = useTheme();
  
  const counts = {
    all: data.length,
    report: data.filter(r => r.contentType === 'report').length,
    podcast: data.filter(r => r.contentType === 'podcast').length,
    debate: data.filter(r => r.contentType === 'debate').length,
    academic_paper: data.filter(r => r.contentType === 'academic_paper').length,
  };

  const cards: { type: PlatformContentType | 'all'; label: string; color: string }[] = [
    { type: 'all', label: 'All Content', color: isLight ? '#5B52E0' : '#6C63FF' },
    { type: 'report', label: 'Reports', color: isLight ? '#5B52E0' : '#8B5CF6' },
    { type: 'podcast', label: 'Podcasts', color: isLight ? '#BE185D' : '#EC4899' },
    { type: 'debate', label: 'Debates', color: isLight ? '#C2410C' : '#F97316' },
    { type: 'academic_paper', label: 'Academic Papers', color: isLight ? '#0D9488' : '#14B8A6' },
  ];

  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-5">
      {cards.map(c => (
        <button key={c.type} onClick={() => onFilter(c.type)}
          className={`rounded-xl border p-2.5 sm:p-3 text-left transition-all
            ${activeType === c.type
              ? 'border-opacity-30 bg-opacity-10'
              : 'hover:bg-opacity-5'
            }`}
          style={{
            backgroundColor: activeType === c.type ? (isLight ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.08)') : 'transparent',
            borderColor: activeType === c.type ? (isLight ? 'rgba(108,99,255,0.3)' : 'rgba(255,255,255,0.2)') : borderColor,
          }}>
          {loading
            ? <div className="h-6 sm:h-7 w-10 rounded animate-pulse mb-1" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
            : <p className="text-lg sm:text-xl font-bold tabular-nums" style={{ color: c.color }}>{counts[c.type].toLocaleString()}</p>
          }
          <p className="text-[8px] sm:text-[10px] mt-0.5 uppercase tracking-wide font-semibold" style={{ color: textMuted }}>{c.label}</p>
        </button>
      ))}
    </div>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function ContentDetailSheet({ row, onClose }: { row: PlatformContentRow; onClose: () => void }) {
  const { isLight } = useTheme();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const meta = TYPE_META[row.contentType];

  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';

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

  const metaStyles = isLight 
    ? `${meta.lightBg} ${meta.lightColor}`
    : `${meta.bg} ${meta.color}`;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[500px] z-50
                   flex flex-col border-l overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: borderColor }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                              px-2 py-1 rounded-full border shrink-0 ${metaStyles}`}>
              {meta.icon}{meta.label}
            </span>
            <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{row.title}</p>
          </div>
          <button onClick={onClose}
            className="p-2 transition-colors shrink-0"
            style={{ color: textMuted }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: isLight ? '#5B52E0' : '#6C63FF' }} />
            </div>
          ) : !detail ? (
            <p className="text-sm text-center py-12" style={{ color: textMuted }}>Could not load details</p>
          ) : (
            <div className="flex flex-col gap-5">

              {/* User info */}
              <Section title="Created By" isLight={isLight}>
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Name" value={detail.userName || '—'} isLight={isLight} />
                <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Email" value={detail.userEmail || '—'} isLight={isLight} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created"
                  value={format(new Date(detail.createdAt), 'MMM d, yyyy HH:mm')} isLight={isLight} />
                {detail.completedAt && (
                  <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="Completed"
                    value={format(new Date(detail.completedAt), 'MMM d, yyyy HH:mm')} isLight={isLight} />
                )}
              </Section>

              {/* ── REPORT ── */}
              {detail.type === 'report' && (
                <>
                  <Section title="Research Details" isLight={isLight}>
                    <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label="Query" value={detail.query} isLight={isLight} />
                    <InfoRow icon={<BarChart2 className="w-3.5 h-3.5" />} label="Depth" value={detail.depth} isLight={isLight} />
                    <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="Status" value={detail.status} isLight={isLight} />
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <StatTile label="Sources" value={detail.sourcesCount} isLight={isLight} />
                      <StatTile label="Sections" value={detail.sectionsCount} isLight={isLight} />
                      <StatTile label="Citations" value={detail.citationsCount} isLight={isLight} />
                    </div>
                    <div className="rounded-xl p-3 border mt-1" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', borderColor: borderColor }}>
                      <p className="text-[10px] mb-1" style={{ color: textMuted }}>Reliability</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ 
                            width: `${detail.reliabilityScore}%`,
                            backgroundColor: isLight ? '#16A34A' : '#34D399'
                          }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: textSecondary }}>
                          {detail.reliabilityScore}%
                        </span>
                      </div>
                    </div>
                  </Section>

                  {detail.executiveSummary && (
                    <Section title="Executive Summary" isLight={isLight}>
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{detail.executiveSummary}</p>
                    </Section>
                  )}

                  {detail.keyFindings?.length > 0 && (
                    <Section title={`Key Findings (${detail.keyFindings.length})`} isLight={isLight}>
                      <div className="flex flex-col gap-1.5">
                        {detail.keyFindings.slice(0, 5).map((f: string, i: number) => (
                          <div key={i} className="flex gap-2 text-xs">
                            <span className="font-bold shrink-0" style={{ color: isLight ? '#5B52E0' : '#6C63FF' }}>{i + 1}.</span>
                            <span style={{ color: textSecondary }}>{f}</span>
                          </div>
                        ))}
                        {detail.keyFindings.length > 5 && (
                          <p className="text-[10px]" style={{ color: textMuted }}>+{detail.keyFindings.length - 5} more</p>
                        )}
                      </div>
                    </Section>
                  )}
                </>
              )}

              {/* ── PODCAST ── */}
              {detail.type === 'podcast' && (
                <Section title="Podcast Details" isLight={isLight}>
                  <InfoRow icon={<Mic className="w-3.5 h-3.5" />} label="Topic" value={detail.topic} isLight={isLight} />
                  <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="Status" value={detail.status} isLight={isLight} />
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Host" value={`${detail.hostName} (${detail.hostVoice})`} isLight={isLight} />
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Guest" value={`${detail.guestName} (${detail.guestVoice})`} isLight={isLight} />
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <StatTile label="Duration" value={`${Math.round((detail.durationSeconds || 0) / 60)} min`} isLight={isLight} />
                    <StatTile label="Turns" value={detail.turnsCount} isLight={isLight} />
                    <StatTile label="Exports" value={detail.exportCount} isLight={isLight} />
                  </div>
                </Section>
              )}

              {/* ── DEBATE ── */}
              {detail.type === 'debate' && (
                <>
                  <Section title="Debate Details" isLight={isLight}>
                    <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Question" value={detail.question} isLight={isLight} />
                    <InfoRow icon={<Star className="w-3.5 h-3.5" />} label="Status" value={detail.status} isLight={isLight} />
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <StatTile label="Agents" value={detail.perspectivesCount} isLight={isLight} />
                      <StatTile label="Sources" value={detail.searchResultsCount} isLight={isLight} />
                    </div>
                  </Section>

                  {detail.agentRoles?.length > 0 && (
                    <Section title="Agents" isLight={isLight}>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.agentRoles.map((r: string) => (
                          <span key={r}
                            className="text-xs capitalize px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: isLight ? 'rgba(251,146,60,0.1)' : 'rgba(251,146,60,0.1)',
                              borderColor: isLight ? 'rgba(251,146,60,0.3)' : 'rgba(251,146,60,0.2)',
                              color: isLight ? '#C2410C' : '#FB923C',
                            }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {detail.stanceDistribution && Object.keys(detail.stanceDistribution).length > 0 && (
                    <Section title="Stance Distribution" isLight={isLight}>
                      {Object.entries(detail.stanceDistribution).map(([stance, count]) => (
                        <div key={stance} className="flex items-center justify-between text-xs py-0.5">
                          <span className="capitalize" style={{ color: textMuted }}>{stance.replace(/_/g, ' ')}</span>
                          <span className="font-medium" style={{ color: textSecondary }}>{count as number} agents</span>
                        </div>
                      ))}
                    </Section>
                  )}

                  {detail.moderatorSummary && (
                    <Section title="Moderator Verdict" isLight={isLight}>
                      <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{detail.moderatorSummary}</p>
                    </Section>
                  )}
                </>
              )}

              {/* ── ACADEMIC PAPER ── */}
              {detail.type === 'academic_paper' && (
                <>
                  <Section title="Paper Details" isLight={isLight}>
                    <InfoRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Citation Style" value={detail.citationStyle?.toUpperCase()} isLight={isLight} />
                    <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label="Running Head" value={detail.runningHead || '—'} isLight={isLight} />
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <StatTile label="Words" value={detail.wordCount?.toLocaleString()} isLight={isLight} />
                      <StatTile label="Pages" value={detail.pageEstimate} isLight={isLight} />
                      <StatTile label="Sections" value={detail.sectionsCount} isLight={isLight} />
                    </div>
                    <StatTile label="Citations" value={detail.citationsCount} isLight={isLight} />
                  </Section>

                  {detail.abstract && (
                    <Section title="Abstract" isLight={isLight}>
                      <p className="text-xs leading-relaxed line-clamp-6" style={{ color: textSecondary }}>{detail.abstract}</p>
                    </Section>
                  )}

                  {detail.keywords?.length > 0 && (
                    <Section title="Keywords" isLight={isLight}>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.keywords.map((k: string) => (
                          <span key={k}
                            className="text-xs px-2 py-0.5 rounded-full border"
                            style={{
                              backgroundColor: isLight ? 'rgba(13,148,136,0.1)' : 'rgba(13,148,136,0.1)',
                              borderColor: isLight ? 'rgba(13,148,136,0.3)' : 'rgba(13,148,136,0.2)',
                              color: isLight ? '#0D9488' : '#14B8A6',
                            }}>
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
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="shrink-0 mt-0.5" style={{ color: textMuted }}>{icon}</span>
      <span className="shrink-0 w-20" style={{ color: textMuted }}>{label}:</span>
      <span className="flex-1 break-words" style={{ color: textSecondary }}>{value}</span>
    </div>
  );
}

function StatTile({ label, value, isLight }: { label: string; value: string | number; isLight: boolean }) {
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textMuted = isLight ? '#888' : 'var(--text-muted)';
  const borderColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
  
  return (
    <div className="rounded-xl p-2.5 border text-center" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', borderColor: borderColor }}>
      <p className="text-sm font-bold" style={{ color: textPrimary }}>{value ?? '—'}</p>
      <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{label}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const { isLight } = useTheme();
  const [allRows, setAllRows] = useState<PlatformContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlatformContentRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [filters, setFilters] = useState<ContentFilters>({
    search: '', contentType: 'all', page: 1, pageSize: 20,
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

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: filters.search,
      type: filters.contentType,
      page: String(filters.page),
      pageSize: String(filters.pageSize),
    });
    const { data } = await adminFetch<PaginatedResponse<PlatformContentRow>>(
      `/api/admin/content?${params.toString()}`,
    );
    if (data) { setAllRows(data.data); setTotal(data.total); setTotalPages(data.totalPages); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleSearch = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: value, page: 1 }));
    }, 350);
  };

  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';
  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const inputBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const inputText = isLight ? '#1A1A2E' : 'var(--text-primary)';

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: textPrimary }}>
          <FileText className="w-5 h-5" style={{ color: isLight ? '#5B52E0' : '#6C63FF' }} />
          Content View
        </h1>
        <p className="text-sm mt-1" style={{ color: textMuted }}>
          All platform-generated content · Click any row to see full details
        </p>
      </div>

      <TypeCountCards
        data={allRows} loading={loading} activeType={filters.contentType}
        onFilter={(t) => setFilters(f => ({ ...f, contentType: t, page: 1 }))}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMuted }} />
          <input
            type="text"
            placeholder="Search by title, query, or user email…"
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: inputBg,
              border: `1px solid ${inputBorder}`,
              color: inputText,
            }}
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-3.5 h-3.5" style={{ color: textMuted }} />
          {(['all', 'report', 'podcast', 'debate', 'academic_paper'] as const).map(t => {
            const isActive = filters.contentType === t;
            return (
              <button key={t} onClick={() => setFilters(f => ({ ...f, contentType: t, page: 1 }))}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all
                  ${isActive
                    ? 'border'
                    : 'hover:bg-opacity-5'
                  }`}
                style={{
                  backgroundColor: isActive ? (isLight ? 'rgba(108,99,255,0.1)' : 'rgba(108,99,255,0.2)') : 'transparent',
                  borderColor: isActive ? (isLight ? 'rgba(108,99,255,0.3)' : 'rgba(108,99,255,0.3)') : 'transparent',
                  color: isActive ? (isLight ? '#5B52E0' : '#6C63FF') : textMuted,
                }}>
                {t === 'all' ? 'All' : TYPE_META[t as PlatformContentType].label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-right sm:ml-auto whitespace-nowrap" style={{ color: textMuted }}>
          {total.toLocaleString()} items
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
                  <div className="flex justify-between">
                    <div className="h-6 w-24 rounded-full" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                    <div className="h-4 w-16 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                  </div>
                  <div className="h-5 w-3/4 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />
                  <div className="flex gap-2">
                    <div className="h-4 w-20 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                    <div className="h-4 w-20 rounded" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              ))
            ) : allRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 mb-3 opacity-30" style={{ color: textMuted }} />
                <p className="text-base font-medium" style={{ color: textMuted }}>No content found</p>
              </div>
            ) : (
              allRows.map(row => {
                const meta = TYPE_META[row.contentType];
                const statusColor = isLight 
                  ? (STATUS_COLOR[row.status]?.light || 'text-gray-400')
                  : (STATUS_COLOR[row.status]?.dark || 'text-white/40');
                const depthStyle = row.depth && DEPTH_COLOR[row.depth] 
                  ? (isLight ? DEPTH_COLOR[row.depth].light : DEPTH_COLOR[row.depth].dark)
                  : '';
                const metaStyles = isLight 
                  ? `${meta.lightBg} ${meta.lightColor}`
                  : `${meta.bg} ${meta.color}`;

                return (
                  <div
                    key={`${row.contentType}-${row.id}`}
                    onClick={() => setSelected(row)}
                    className="rounded-xl border p-4 space-y-3 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: borderColor,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                                        px-2 py-1 rounded-full border ${metaStyles}`}>
                        {meta.icon}{meta.label}
                      </span>
                      <span className={`text-xs font-medium capitalize ${statusColor}`}>{row.status}</span>
                    </div>

                    <div>
                      <p className="text-sm font-medium" style={{ color: textPrimary }}>{row.title}</p>
                      {row.subtitle && (
                        <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{row.subtitle}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span style={{ color: textSecondary }}>{row.userName || '—'}</span>
                      {row.depth && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${depthStyle}`}>
                          {row.depth}
                        </span>
                      )}
                      {row.sourcesCount !== undefined && (
                        <span className="text-[10px]" style={{ color: textMuted }}>{row.sourcesCount} sources</span>
                      )}
                      {row.durationSeconds !== undefined && (
                        <span className="text-[10px]" style={{ color: textMuted }}>{Math.round(row.durationSeconds / 60)} min</span>
                      )}
                      <span className="text-[10px]" style={{ color: textMuted }}>
                        {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <Arrow className="w-3.5 h-3.5" style={{ color: textMuted }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // Desktop: Table view
          <>
            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th style={{ color: textMuted }}>Type</th>
                    <th style={{ color: textMuted }}>Title</th>
                    <th style={{ color: textMuted }}>User</th>
                    <th style={{ color: textMuted }}>Status</th>
                    <th style={{ color: textMuted }}>Details</th>
                    <th style={{ color: textMuted }}>Created</th>
                    <th style={{ color: textMuted }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j}>
                            <div className="h-4 rounded animate-pulse max-w-[120px]" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : allRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16" style={{ color: textMuted }}>
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: textMuted }} />
                        No content found
                      </td>
                    </tr>
                  ) : allRows.map(row => {
                    const meta = TYPE_META[row.contentType];
                    const statusColor = isLight 
                      ? (STATUS_COLOR[row.status]?.light || 'text-gray-400')
                      : (STATUS_COLOR[row.status]?.dark || 'text-white/40');
                    const depthStyle = row.depth && DEPTH_COLOR[row.depth] 
                      ? (isLight ? DEPTH_COLOR[row.depth].light : DEPTH_COLOR[row.depth].dark)
                      : '';
                    const metaStyles = isLight 
                      ? `${meta.lightBg} ${meta.lightColor}`
                      : `${meta.bg} ${meta.color}`;

                    return (
                      <tr key={`${row.contentType}-${row.id}`}
                        onClick={() => setSelected(row)}
                        className="cursor-pointer transition-colors"
                        style={{ backgroundColor: 'transparent' }}
                      >
                        <td>
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                                            px-2 py-1 rounded-full border ${metaStyles}`}>
                            {meta.icon}{meta.label}
                          </span>
                        </td>
                        <td>
                          <p className="text-sm font-medium truncate max-w-[240px]" style={{ color: textPrimary }}>{row.title}</p>
                          {row.subtitle && (
                            <p className="text-[10px] truncate max-w-[240px] mt-0.5" style={{ color: textMuted }}>{row.subtitle}</p>
                          )}
                        </td>
                        <td>
                          <p className="text-xs truncate max-w-[130px]" style={{ color: textSecondary }}>{row.userName ?? '—'}</p>
                          <p className="text-[10px] truncate max-w-[130px]" style={{ color: textMuted }}>{row.userEmail ?? ''}</p>
                        </td>
                        <td><span className={`text-xs font-medium capitalize ${statusColor}`}>{row.status}</span></td>
                        <td>
                          <div className="flex flex-col gap-0.5">
                            {row.depth && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium w-fit capitalize ${depthStyle}`}>
                                {row.depth}
                              </span>
                            )}
                            {row.sourcesCount !== undefined && <span className="text-[10px]" style={{ color: textMuted }}>{row.sourcesCount} sources</span>}
                            {row.durationSeconds !== undefined && <span className="text-[10px]" style={{ color: textMuted }}>{Math.round(row.durationSeconds / 60)} min</span>}
                            {row.wordCount !== undefined && <span className="text-[10px]" style={{ color: textMuted }}>{row.wordCount.toLocaleString()} words</span>}
                          </div>
                        </td>
                        <td className="text-xs whitespace-nowrap" style={{ color: textMuted }}>
                          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                        </td>
                        <td>
                          <Arrow className="w-3.5 h-3.5" style={{ color: textMuted }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination - desktop */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: borderColor }}>
                <p className="text-xs" style={{ color: textMuted }}>Page {filters.page} of {totalPages} · {total.toLocaleString()} items</p>
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
                          backgroundColor: filters.page === p ? (isLight ? '#5B52E0' : '#6C63FF') : 'transparent',
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
        <ContentDetailSheet row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}