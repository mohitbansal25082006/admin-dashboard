'use client';
// Admin-Dashboard/src/app/dashboard/abuse/page.tsx
// Part 55.13 — Abuse Detection page with full theme integration and mobile optimization.
//
// FIX (showReviewed filter — three-layer fix):
//   Layer 1 (SQL):    RPC now uses p_show_all BOOLEAN instead of nullable p_is_reviewed.
//   Layer 2 (API):    route.ts passes p_show_all: showReviewed (bool) — never null.
//   Layer 3 (UI):     Single consolidated useEffect + isMounted ref replaces the two
//                     split effects that gated on `loading` and silently skipped renders.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertOctagon, RefreshCw, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, Flame, CreditCard, Users, X,
  ChevronDown, ChevronUp, Flag,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../context/ThemeContext';
import type {
  AbuseSignalRow, AbuseSignalFilters,
  AbuseSeverity, AbuseSignalType, ReviewAction,
  PaginatedResponse,
} from '@/types/admin';

// ── Shared select styles (theme-aware) ──────────────────────────────────────

function getSelectStyles(isLight: boolean): React.CSSProperties {
  const bg          = isLight ? 'var(--background-elevated)' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
  const textColor   = 'var(--text-primary)';

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
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '12px',
    transition: 'border-color 0.2s ease',
    minHeight: '44px',
    WebkitAppearance: 'none',
  };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

const SEV: Record<AbuseSeverity, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',      dot: 'bg-red-400'    },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', dot: 'bg-yellow-400' },
  low:      { label: 'Low',      color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',    dot: 'bg-blue-400'   },
};

const SIG: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  credit_burn_rate: { label: 'Credit Burn Rate',  icon: <Flame      className="w-4 h-4" />, desc: 'High credit consumption in a short window'   },
  failed_payments:  { label: 'Failed Payments',   icon: <CreditCard className="w-4 h-4" />, desc: 'Multiple failed Razorpay attempts'            },
  referral_farming: { label: 'Referral Farming',  icon: <Users      className="w-4 h-4" />, desc: 'Suspicious cluster of referral uses'          },
  manual:           { label: 'Manual Flag',       icon: <Flag       className="w-4 h-4" />, desc: 'Manually flagged by admin'                    },
};

const REV: Record<ReviewAction, { label: string; color: string }> = {
  cleared:   { label: 'Cleared',   color: 'text-green-400'  },
  warned:    { label: 'Warned',    color: 'text-yellow-400' },
  suspended: { label: 'Suspended', color: 'text-red-400'    },
};

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ signals, loading }: { signals: AbuseSignalRow[]; loading: boolean }) {
  const { isLight } = useTheme();

  const pending  = signals.filter(s => !s.isReviewed).length;
  const critical = signals.filter(s => s.severity === 'critical' && !s.isReviewed).length;
  const high     = signals.filter(s => s.severity === 'high'     && !s.isReviewed).length;
  const reviewed = signals.filter(s => s.isReviewed).length;

  const cards = [
    { label: 'Pending Review', value: pending,  color: 'var(--error)',   sub: 'unreviewed signals'       },
    { label: 'Critical',       value: critical, color: 'var(--error)',   sub: 'require immediate action' },
    { label: 'High Severity',  value: high,     color: 'var(--warning)', sub: 'high-priority signals'    },
    { label: 'Reviewed',       value: reviewed, color: 'var(--success)', sub: 'resolved this session'    },
  ];

  const cardBg = isLight ? 'var(--background-elevated)' : 'var(--background-card)';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-xl border p-4"
          style={{ backgroundColor: cardBg, borderColor: 'var(--border)' }}
        >
          {loading ? (
            <>
              <div className="h-7 w-12 rounded animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-24 rounded animate-pulse mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
              <p className="text-[10px] mt-0.5"  style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
              <p className="text-[9px] mt-1 uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                {c.label}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({ signal, onClose, onSuccess }: {
  signal: AbuseSignalRow; onClose: () => void; onSuccess: () => void;
}) {
  const { isLight } = useTheme();
  const [action, setAction]             = useState<ReviewAction>('cleared');
  const [note, setNote]                 = useState('');
  const [deduction, setDeduction]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sm           = SEV[signal.severity as AbuseSeverity] ?? SEV.medium;
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const modalBg     = isLight ? 'var(--background)' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.08)';
  const inputBg     = isLight ? 'rgba(0,0,0,0.04)'  : 'rgba(255,255,255,0.04)';

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast.error('Please enter a note');
      noteInputRef.current?.focus();
      return;
    }
    if (action === 'warned' && (!deduction || parseInt(deduction) <= 0)) {
      toast.error('Enter a valid credit deduction amount');
      return;
    }
    setIsSubmitting(true);
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
    setIsSubmitting(false);
    if (error) { toast.error(error); return; }
    const msgs = { cleared: 'Signal cleared', warned: 'Warning issued + credits deducted', suspended: 'Account suspended' };
    toast.success(msgs[action]);
    onSuccess();
    onClose();
  };

  const getActionStyles = (actionValue: ReviewAction, color: string) => {
    const isActive = action === actionValue;
    const map = {
      green:  { bg: isActive ? 'rgba(16,185,129,0.2)'  : 'transparent', border: isActive ? 'rgba(16,185,129,0.5)'  : 'rgba(255,255,255,0.08)', text: isActive ? '#34D399' : 'var(--text-muted)' },
      yellow: { bg: isActive ? 'rgba(251,191,36,0.2)'  : 'transparent', border: isActive ? 'rgba(251,191,36,0.5)'  : 'rgba(255,255,255,0.08)', text: isActive ? '#FBBF24' : 'var(--text-muted)' },
      red:    { bg: isActive ? 'rgba(239,68,68,0.2)'   : 'transparent', border: isActive ? 'rgba(239,68,68,0.5)'   : 'rgba(255,255,255,0.08)', text: isActive ? '#F87171' : 'var(--text-muted)' },
    };
    return map[color as keyof typeof map];
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                    w-[95%] max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl border"
        style={{ backgroundColor: modalBg, borderColor }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0"
          style={{ backgroundColor: modalBg, borderColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Review Abuse Signal
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {signal.userEmail ?? signal.userId.slice(0, 16)} · {SIG[signal.signalType]?.label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Signal detail */}
          <div className={`rounded-xl border p-3 text-xs ${sm.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${sm.color}`}>{sm.label} Severity</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(signal.details).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="capitalize" style={{ color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}</span>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action picker */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Action
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'cleared'   as ReviewAction, l: 'Clear',   s: 'Legitimate user', c: 'green'  },
                { v: 'warned'    as ReviewAction, l: 'Warn',    s: 'Deduct credits',  c: 'yellow' },
                { v: 'suspended' as ReviewAction, l: 'Suspend', s: 'Lock account',    c: 'red'    },
              ]).map((opt) => {
                const styles = getActionStyles(opt.v, opt.c);
                return (
                  <button
                    key={opt.v}
                    onClick={() => setAction(opt.v)}
                    className="flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      backgroundColor: styles.bg,
                      borderColor:     styles.border,
                      color:           styles.text,
                      borderWidth:     action === opt.v ? '2px' : '1px',
                    }}
                  >
                    <span className="text-sm font-semibold">{opt.l}</span>
                    <span className="text-[10px] mt-0.5 opacity-70">{opt.s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {action === 'warned' && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                Credits to Deduct
              </p>
              <input
                type="number"
                min="1"
                value={deduction}
                onChange={e => setDeduction(e.target.value)}
                placeholder="e.g. 50"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                style={{
                  backgroundColor: inputBg,
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}

          {/* Note textarea */}
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Note (required)
            </p>
            <textarea
              ref={noteInputRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe the reason for this action…"
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-all"
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
                color: 'var(--text-primary)',
                WebkitAppearance: 'none',
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={true}
              enterKeyHint="done"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                {note.length} / 1000 characters
              </span>
              {note.length > 0 && (
                <button onClick={() => setNote('')} className="text-[9px] transition-colors" style={{ color: 'var(--text-muted)' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'}`,
                color: 'var(--text-muted)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Action'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Signal Row ────────────────────────────────────────────────────────────────

function SignalRow({ signal, onReview }: { signal: AbuseSignalRow; onReview: (s: AbuseSignalRow) => void }) {
  const { isLight } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const sm  = SEV[signal.severity as AbuseSeverity] ?? SEV.medium;
  const sig = SIG[signal.signalType] ?? SIG.manual;

  const rowBg       = isLight ? 'var(--background-elevated)' : 'var(--background-card)';
  const borderColor = signal.isReviewed
    ? isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'
    : isLight ? 'rgba(0,0,0,0.1)'   : 'rgba(255,255,255,0.08)';

  return (
    <div
      className={`rounded-xl border transition-all ${signal.isReviewed ? 'opacity-60' : ''}`}
      style={{ backgroundColor: rowBg, borderColor }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sm.dot}
            ${!signal.isReviewed && signal.severity === 'critical' ? 'animate-pulse' : ''}`} />
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sm.bg} border`}>
            <span className={sm.color}>{sig.icon}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sig.label}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sm.bg} ${sm.color}`}>
              {sm.label}
            </span>
            {signal.isReviewed && signal.reviewAction && (
              <span className={`text-[10px] font-medium ${REV[signal.reviewAction]?.color ?? 'text-white/40'}`}>
                ✓ {REV[signal.reviewAction]?.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="truncate max-w-[150px] sm:max-w-[200px]">
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

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {!signal.isReviewed && (
            <button
              onClick={() => onReview(signal)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: 'rgba(251, 146, 60, 0.15)',
                border: '1px solid rgba(251, 146, 60, 0.25)',
                color: '#FB923C',
              }}
            >
              <AlertOctagon className="w-3 h-3" />Review
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Signal Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(signal.details).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg px-3 py-2 border"
                style={{
                  backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                  borderColor: 'var(--border)',
                }}
              >
                <p className="text-[10px] capitalize mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  {k.replace(/_/g, ' ')}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{String(v)}</p>
              </div>
            ))}
          </div>
          {signal.isReviewed && signal.reviewNote && (
            <div
              className="mt-3 rounded-lg px-3 py-2 border"
              style={{
                backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                borderColor: 'var(--border)',
              }}
            >
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Review Note</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{signal.reviewNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AbusePage() {
  const { isLight } = useTheme();
  const [signals, setSignals]           = useState<AbuseSignalRow[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [loading, setLoading]           = useState(true);
  const [running, setRunning]           = useState(false);
  const [newFound, setNewFound]         = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<AbuseSignalRow | null>(null);

  const [filters, setFilters] = useState<AbuseSignalFilters>({
    signalType: 'all', severity: 'all', showReviewed: false, page: 1, pageSize: 20,
  });

  // Tracks whether the initial fetch has completed.
  // Using a ref (not state) avoids triggering extra renders.
  const isMounted = useRef(false);

  // ── Core fetch ───────────────────────────────────────────────────────────────
  // Accepts filters as an explicit argument so it is never a stale closure.
  const fetchSignals = useCallback(async (
    currentFilters: AbuseSignalFilters,
    runDetection = false,
  ) => {
    if (runDetection) setRunning(true); else setLoading(true);

    const params = new URLSearchParams({
      runDetection: String(runDetection),
      signalType:   currentFilters.signalType,
      severity:     currentFilters.severity,
      showReviewed: String(currentFilters.showReviewed),
      page:         String(currentFilters.page),
      pageSize:     String(currentFilters.pageSize),
    });

    const { data, error } = await adminFetch<
      PaginatedResponse<AbuseSignalRow> & { newSignalsFound: number }
    >(`/api/admin/abuse?${params.toString()}`);

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
  }, []); // stable — no filter values captured in closure

  // ── Initial load (run detection once) ────────────────────────────────────────
  useEffect(() => {
    fetchSignals(filters, true).then(() => {
      isMounted.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch on any filter change (after first load) ─────────────────────────
  // One single effect watching all filter fields.
  // isMounted ref (not loading state) guards the initial render skip,
  // avoiding the race where `loading` could still be true during a fast state
  // update and silently swallow the showReviewed toggle.
  useEffect(() => {
    if (!isMounted.current) return;
    fetchSignals(filters, false);
  }, [
    filters.signalType,
    filters.severity,
    filters.showReviewed,
    filters.page,
    filters.pageSize,
    fetchSignals,
  ]);

  const selectStyles = getSelectStyles(isLight);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <AlertOctagon className="w-5 h-5 text-orange-400" />
            Abuse Detection
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Automated signals · Click a row to expand · Review to take action
          </p>
        </div>
        <button
          onClick={() => fetchSignals(filters, true)}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
          style={{
            backgroundColor: 'rgba(251, 146, 60, 0.15)',
            border: '1px solid rgba(251, 146, 60, 0.25)',
            color: '#FB923C',
          }}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {running ? 'Running…' : 'Run Detection'}
        </button>
      </div>

      {/* New signals banner */}
      {newFound !== null && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-5 text-sm flex-wrap"
          style={{
            backgroundColor: newFound > 0 ? 'rgba(251, 146, 60, 0.1)'  : 'rgba(16, 185, 129, 0.1)',
            borderColor:     newFound > 0 ? 'rgba(251, 146, 60, 0.25)' : 'rgba(16, 185, 129, 0.25)',
            color:           newFound > 0 ? '#FB923C'                  : '#34D399',
          }}
        >
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
        <select
          value={filters.signalType}
          onChange={e => setFilters(f => ({ ...f, signalType: e.target.value as any, page: 1 }))}
          style={selectStyles}
          className="flex-1 min-w-[120px] max-w-[180px]"
        >
          <option value="all"              style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>All Types</option>
          <option value="credit_burn_rate" style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>Credit Burn</option>
          <option value="failed_payments"  style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>Failed Payments</option>
          <option value="referral_farming" style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>Referral Farming</option>
        </select>

        <select
          value={filters.severity}
          onChange={e => setFilters(f => ({ ...f, severity: e.target.value as any, page: 1 }))}
          style={selectStyles}
          className="flex-1 min-w-[120px] max-w-[160px]"
        >
          <option value="all"      style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>All Severities</option>
          <option value="critical" style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>Critical</option>
          <option value="high"     style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>High</option>
          <option value="medium"   style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>Medium</option>
          <option value="low"      style={{ backgroundColor: isLight ? '#F5F6FB' : '#13132A', color: isLight ? '#15162B' : '#fff' }}>Low</option>
        </select>

        <button
          onClick={() => setFilters(f => ({ ...f, showReviewed: !f.showReviewed, page: 1 }))}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all"
          style={{
            backgroundColor: filters.showReviewed
              ? 'rgba(108, 99, 255, 0.15)'
              : isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
            borderColor: filters.showReviewed
              ? 'rgba(108, 99, 255, 0.3)'
              : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
            color: filters.showReviewed ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {filters.showReviewed ? 'Showing Reviewed' : 'Show Reviewed'}
        </button>

        <div className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {total.toLocaleString()} signals
        </div>
      </div>

      {/* Signal list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <p className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>No signals found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
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
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-1 gap-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {filters.page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              disabled={filters.page <= 1}
              className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.min(Math.max(1, filters.page - 2) + i, totalPages);
              return (
                <button
                  key={p}
                  onClick={() => setFilters(f => ({ ...f, page: p }))}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: filters.page === p ? 'var(--primary)' : 'transparent',
                    color:           filters.page === p ? '#FFFFFF'        : 'var(--text-muted)',
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
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
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
          onSuccess={() => fetchSignals(filters, false)}
        />
      )}
    </div>
  );
}