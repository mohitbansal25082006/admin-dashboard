'use client';
// Admin-Dashboard/src/app/dashboard/abuse/page.tsx
// Part 32 — Abuse Detection page.
// Auto-runs detection on load, lists signals, allows Clear / Warn / Suspend actions.
// Part 32 UPDATE v2 — Dropdowns always visible (border/text/bg fix).

import { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, Flame, CreditCard, Users, X,
  ChevronDown, ChevronUp, Flag,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type {
  AbuseSignalRow, AbuseSignalFilters,
  AbuseSeverity, AbuseSignalType, ReviewAction,
  PaginatedResponse,
} from '@/types/admin';

// ── Shared select styles (always visible) ────────────────────────────────────

const CHEVRON_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

const SELECT_CLASS =
  'bg-[#13132A] border border-white/20 rounded-xl px-3 py-2.5 ' +
  'text-sm text-white/90 outline-none hover:border-white/30 ' +
  'focus:border-[#6C63FF]/60 transition-all cursor-pointer appearance-none pr-8';

const SELECT_STYLE: React.CSSProperties = {
  backgroundImage:    CHEVRON_BG,
  backgroundRepeat:   'no-repeat',
  backgroundPosition: 'right 10px center',
};

const OPT: React.CSSProperties = { background: '#13132A', color: '#fff' };

// ── Metadata ──────────────────────────────────────────────────────────────────

const SEV: Record<AbuseSeverity, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',       dot: 'bg-red-400'    },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', dot: 'bg-yellow-400' },
  low:      { label: 'Low',      color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',     dot: 'bg-blue-400'   },
};

const SIG: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  credit_burn_rate: { label: 'Credit Burn Rate', icon: <Flame      className="w-4 h-4" />, desc: 'High credit consumption in a short window' },
  failed_payments:  { label: 'Failed Payments',  icon: <CreditCard className="w-4 h-4" />, desc: 'Multiple failed Razorpay attempts'         },
  referral_farming: { label: 'Referral Farming', icon: <Users      className="w-4 h-4" />, desc: 'Suspicious cluster of referral uses'        },
  manual:           { label: 'Manual Flag',      icon: <Flag       className="w-4 h-4" />, desc: 'Manually flagged by admin'                  },
};

const REV: Record<ReviewAction, { label: string; color: string }> = {
  cleared:   { label: 'Cleared',   color: 'text-green-400'  },
  warned:    { label: 'Warned',    color: 'text-yellow-400' },
  suspended: { label: 'Suspended', color: 'text-red-400'    },
};

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ signals, loading }: { signals: AbuseSignalRow[]; loading: boolean }) {
  const pending  = signals.filter(s => !s.isReviewed).length;
  const critical = signals.filter(s => s.severity === 'critical' && !s.isReviewed).length;
  const high     = signals.filter(s => s.severity === 'high'     && !s.isReviewed).length;
  const reviewed = signals.filter(s => s.isReviewed).length;

  const cards = [
    { label: 'Pending Review', value: pending,  color: '#EF4444', sub: 'unreviewed signals'       },
    { label: 'Critical',       value: critical, color: '#EF4444', sub: 'require immediate action' },
    { label: 'High Severity',  value: high,     color: '#F97316', sub: 'high-priority signals'    },
    { label: 'Reviewed',       value: reviewed, color: '#10B981', sub: 'resolved this session'    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {cards.map((c, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] p-4"
          style={{ background: 'linear-gradient(135deg,#13131F 0%,#0F0F1C 100%)' }}>
          {loading ? (
            <>
              <div className="h-7 w-12 bg-white/[0.06] rounded animate-pulse mb-1" />
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

// ── Review modal ──────────────────────────────────────────────────────────────

function ReviewModal({ signal, onClose, onSuccess }: {
  signal: AbuseSignalRow; onClose: () => void; onSuccess: () => void;
}) {
  const [action,    setAction]    = useState<ReviewAction>('cleared');
  const [note,      setNote]      = useState('');
  const [deduction, setDeduction] = useState('');
  const [loading,   setLoading]   = useState(false);
  const sm = SEV[signal.severity as AbuseSeverity] ?? SEV.medium;

  const handleSubmit = async () => {
    if (!note.trim()) { toast.error('Please enter a note'); return; }
    if (action === 'warned' && (!deduction || parseInt(deduction) <= 0)) {
      toast.error('Enter a valid credit deduction amount'); return;
    }
    setLoading(true);
    const { error } = await adminFetch('/api/admin/abuse', {
      method: 'POST',
      body: JSON.stringify({
        signalId:        signal.id,
        userId:          signal.userId,
        action,
        note:            note.trim(),
        creditDeduction: action === 'warned' ? parseInt(deduction) : undefined,
      }),
    });
    setLoading(false);
    if (error) { toast.error(error); return; }
    const msgs = {
      cleared:   'Signal cleared',
      warned:    'Warning issued + credits deducted',
      suspended: 'Account suspended',
    };
    toast.success(msgs[action]);
    onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                      w-full max-w-[500px] rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: '#0D0D1A' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Review Abuse Signal</h3>
              <p className="text-[10px] text-white/35 mt-0.5">
                {signal.userEmail ?? signal.userId.slice(0, 16)} · {SIG[signal.signalType]?.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/35 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Signal detail */}
          <div className={`rounded-xl border p-3 text-xs ${sm.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${sm.color}`}>{sm.label} Severity</span>
              <span className="text-white/35">
                {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/50">
              {Object.entries(signal.details).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-white/35 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-white/65 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action picker */}
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-2">Action</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'cleared',   l: 'Clear',   s: 'Legitimate user', c: 'green'  },
                { v: 'warned',    l: 'Warn',    s: 'Deduct credits',  c: 'yellow' },
                { v: 'suspended', l: 'Suspend', s: 'Lock account',    c: 'red'    },
              ] as const).map(opt => {
                const clsMap = {
                  green:  { on: 'bg-green-500/15  text-green-400  border-green-500/30',  off: 'text-white/40 border-white/[0.08] hover:border-green-500/20'  },
                  yellow: { on: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', off: 'text-white/40 border-white/[0.08] hover:border-yellow-500/20' },
                  red:    { on: 'bg-red-500/15    text-red-400    border-red-500/30',    off: 'text-white/40 border-white/[0.08] hover:border-red-500/20'    },
                };
                return (
                  <button key={opt.v} onClick={() => setAction(opt.v)}
                    className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all
                      ${action === opt.v ? clsMap[opt.c].on : clsMap[opt.c].off}`}>
                    <span className="text-sm font-semibold">{opt.l}</span>
                    <span className="text-[10px] mt-0.5 opacity-70">{opt.s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {action === 'warned' && (
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-2">Credits to Deduct</p>
              <input
                type="number"
                min="1"
                value={deduction}
                onChange={e => setDeduction(e.target.value)}
                placeholder="e.g. 50"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                           text-sm text-white placeholder:text-white/25 outline-none
                           focus:border-yellow-500/40 transition-all"
              />
            </div>
          )}

          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-2">Note (required)</p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe the reason for this action…"
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                         text-sm text-white placeholder:text-white/25 outline-none resize-none
                         focus:border-[#6C63FF]/40 transition-all"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/50 font-medium
                         bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] transition-all">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         bg-[#6C63FF] hover:bg-[#7C73FF] transition-all disabled:opacity-50
                         flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Action'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({ signal, onReview }: { signal: AbuseSignalRow; onReview: (s: AbuseSignalRow) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sm  = SEV[signal.severity as AbuseSeverity] ?? SEV.medium;
  const sig = SIG[signal.signalType] ?? SIG.manual;

  return (
    <div
      className={`rounded-xl border transition-all ${signal.isReviewed ? 'border-white/[0.05] opacity-60' : 'border-white/[0.08]'}`}
      style={{ background: '#0D0D1A' }}
    >
      <div className="flex items-center gap-3 p-4">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sm.dot}
          ${!signal.isReviewed && signal.severity === 'critical' ? 'animate-pulse' : ''}`} />
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sm.bg} border`}>
          <span className={sm.color}>{sig.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white/80">{sig.label}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sm.bg} ${sm.color}`}>
              {sm.label}
            </span>
            {signal.isReviewed && signal.reviewAction && (
              <span className={`text-[10px] font-medium ${REV[signal.reviewAction]?.color ?? 'text-white/40'}`}>
                ✓ {REV[signal.reviewAction]?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/35 flex-wrap">
            <span className="truncate max-w-[200px]">
              {signal.userEmail ?? signal.userId.slice(0, 16) + '…'}
            </span>
            {signal.userName && <span>{signal.userName}</span>}
            <span className={`capitalize ${
              signal.accountStatus === 'suspended' ? 'text-red-400' :
              signal.accountStatus === 'flagged'   ? 'text-yellow-400' : ''
            }`}>
              {signal.accountStatus}
            </span>
            <span>{formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {!signal.isReviewed && (
            <button
              onClick={() => onReview(signal)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-orange-500/15 text-orange-400 border border-orange-500/25
                         hover:bg-orange-500/25 transition-all"
            >
              <AlertOctagon className="w-3 h-3" />Review
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.05] pt-3">
          <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2">Signal Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(signal.details).map(([k, v]) => (
              <div key={k} className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]">
                <p className="text-[10px] text-white/30 capitalize mb-0.5">{k.replace(/_/g, ' ')}</p>
                <p className="text-sm font-semibold text-white/70">{String(v)}</p>
              </div>
            ))}
          </div>
          {signal.isReviewed && signal.reviewNote && (
            <div className="mt-3 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]">
              <p className="text-[10px] text-white/30 mb-0.5">Review Note</p>
              <p className="text-xs text-white/55">{signal.reviewNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AbusePage() {
  const [signals,      setSignals]      = useState<AbuseSignalRow[]>([]);
  const [total,        setTotal]        = useState(0);
  const [totalPages,   setTotalPages]   = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [running,      setRunning]      = useState(false);
  const [newFound,     setNewFound]     = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AbuseSignalRow | null>(null);

  const [filters, setFilters] = useState<AbuseSignalFilters>({
    signalType: 'all', severity: 'all', showReviewed: false, page: 1, pageSize: 20,
  });

  const fetchSignals = useCallback(async (runDetection = false) => {
    if (runDetection) setRunning(true); else setLoading(true);
    const params = new URLSearchParams({
      runDetection: String(runDetection),
      signalType:   filters.signalType,
      severity:     filters.severity,
      showReviewed: String(filters.showReviewed),
      page:         String(filters.page),
      pageSize:     String(filters.pageSize),
    });
    const { data, error } = await adminFetch<PaginatedResponse<AbuseSignalRow> & { newSignalsFound: number }>(
      `/api/admin/abuse?${params.toString()}`,
    );
    if (error) toast.error(error);
    if (data) {
      setSignals(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (runDetection) {
        setNewFound(data.newSignalsFound);
        if (data.newSignalsFound > 0)
          toast.success(`${data.newSignalsFound} new signal${data.newSignalsFound > 1 ? 's' : ''} detected`);
        else
          toast.success('No new signals — platform looks normal');
      }
    }
    setLoading(false);
    setRunning(false);
  }, [filters]);

  // Auto-run on first load
  useEffect(() => { fetchSignals(true); }, []);
  // Refresh on filter change (no re-detection)
  useEffect(() => { fetchSignals(false); }, [filters]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-orange-400" />
            Abuse Detection
          </h1>
          <p className="text-sm text-white/35 mt-1">
            Automated signals · Click a row to expand · Review to take action
          </p>
        </div>
        <button
          onClick={() => fetchSignals(true)}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                     bg-orange-500/15 text-orange-400 border border-orange-500/25
                     hover:bg-orange-500/25 transition-all disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {running ? 'Running…' : 'Run Detection'}
        </button>
      </div>

      {/* New signals banner */}
      {newFound !== null && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-5 text-sm
          ${newFound > 0
            ? 'bg-orange-500/10 border-orange-500/25 text-orange-300'
            : 'bg-green-500/10  border-green-500/25  text-green-300'
          }`}>
          {newFound > 0
            ? <><Flame className="w-4 h-4 shrink-0" />{newFound} new signal{newFound > 1 ? 's' : ''} detected.</>
            : <><CheckCircle2 className="w-4 h-4 shrink-0" />No new signals — activity looks normal.</>
          }
          <button onClick={() => setNewFound(null)} className="ml-auto opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <SummaryCards signals={signals} loading={loading} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">

        {/* Signal type filter — always visible */}
        <select
          value={filters.signalType}
          onChange={e => setFilters(f => ({ ...f, signalType: e.target.value as any, page: 1 }))}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
        >
          <option value="all"               style={OPT}>All Types</option>
          <option value="credit_burn_rate"  style={OPT}>Credit Burn</option>
          <option value="failed_payments"   style={OPT}>Failed Payments</option>
          <option value="referral_farming"  style={OPT}>Referral Farming</option>
        </select>

        {/* Severity filter — always visible */}
        <select
          value={filters.severity}
          onChange={e => setFilters(f => ({ ...f, severity: e.target.value as any, page: 1 }))}
          className={SELECT_CLASS}
          style={SELECT_STYLE}
        >
          <option value="all"      style={OPT}>All Severities</option>
          <option value="critical" style={OPT}>Critical</option>
          <option value="high"     style={OPT}>High</option>
          <option value="medium"   style={OPT}>Medium</option>
          <option value="low"      style={OPT}>Low</option>
        </select>

        {/* Show reviewed toggle */}
        <button
          onClick={() => setFilters(f => ({ ...f, showReviewed: !f.showReviewed, page: 1 }))}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
            ${filters.showReviewed
              ? 'bg-[#6C63FF]/15 text-[#6C63FF] border-[#6C63FF]/30'
              : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/60'
            }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {filters.showReviewed ? 'Showing Reviewed' : 'Show Reviewed'}
        </button>

        <div className="ml-auto text-xs text-white/30">{total.toLocaleString()} signals</div>
      </div>

      {/* Signal list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/25">
          <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base font-medium">No signals found</p>
          <p className="text-sm mt-1 text-white/20">
            {filters.showReviewed ? 'No signals match the current filters' : 'No pending signals to review'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {signals.map(s => <SignalRow key={s.id} signal={s} onReview={setReviewTarget} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-white/30">Page {filters.page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              disabled={filters.page <= 1}
              className="p-1.5 rounded-lg border border-white/[0.08] text-white/40
                         hover:border-[#6C63FF]/40 hover:text-white/70 transition-all
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
              return (
                <button
                  key={p}
                  onClick={() => setFilters(f => ({ ...f, page: p }))}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${filters.page === p
                      ? 'bg-[#6C63FF] text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                    }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
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

      {reviewTarget && (
        <ReviewModal
          signal={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => fetchSignals(false)}
        />
      )}
    </div>
  );
}