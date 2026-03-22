'use client';
// Admin-Dashboard/src/components/admin/UserDetailSheet.tsx
// Part 31B — Slide-in panel showing full user details + admin actions.

import { useEffect, useState, useCallback } from 'react';
import {
  X, Loader2, CreditCard, BarChart2, Shield,
  ShieldOff, Flag, Trash2, Plus, Minus,
  Mail, Calendar, Activity, AlertTriangle,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import type { AdminUserDetail, AccountStatus } from '@/types/admin';

interface Props {
  userId:  string | null;
  onClose: () => void;
}

const STATUS_INFO: Record<AccountStatus, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'text-green-400' },
  suspended: { label: 'Suspended', color: 'text-red-400'   },
  flagged:   { label: 'Flagged',   color: 'text-yellow-400' },
};

export function UserDetailSheet({ userId, onClose }: Props) {
  const [user,           setUser]           = useState<AdminUserDetail | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [activeTab,      setActiveTab]      = useState<'overview' | 'credits' | 'actions'>('overview');

  // Credit adjustment state
  const [creditAmount,    setCreditAmount]    = useState('');
  const [creditReason,    setCreditReason]    = useState('');
  const [creditDirection, setCreditDirection] = useState<'add' | 'deduct'>('add');

  // Status change state
  const [statusReason, setStatusReason] = useState('');

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await adminFetch<AdminUserDetail>(`/api/admin/users/${userId}`);
    if (error) { toast.error(error); }
    else { setUser(data); }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      setUser(null);
      setActiveTab('overview');
      setCreditAmount('');
      setCreditReason('');
      setStatusReason('');
      fetchUser();
    }
  }, [userId, fetchUser]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAdjustCredits = async () => {
    const amount = parseInt(creditAmount, 10);
    if (!amount || amount <= 0) { toast.error('Enter a valid credit amount'); return; }
    if (!creditReason.trim())   { toast.error('Please enter a reason');        return; }

    const finalAmount = creditDirection === 'deduct' ? -amount : amount;

    setActionLoading(true);
    const { error } = await adminFetch('/api/admin/users/credits', {
      method: 'POST',
      body: JSON.stringify({ userId, amount: finalAmount, reason: creditReason }),
    });
    setActionLoading(false);

    if (error) { toast.error(error); return; }
    toast.success(`${creditDirection === 'add' ? 'Added' : 'Deducted'} ${amount} credits`);
    setCreditAmount('');
    setCreditReason('');
    fetchUser();
  };

  const handleSetStatus = async (newStatus: AccountStatus) => {
    if (!statusReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionLoading(true);
    const { error } = await adminFetch('/api/admin/users/status', {
      method: 'POST',
      body: JSON.stringify({ userId, status: newStatus, reason: statusReason }),
    });
    setActionLoading(false);
    if (error) { toast.error(error); return; }
    toast.success(`Account status set to ${newStatus}`);
    setStatusReason('');
    fetchUser();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently delete ${user?.email}? This cannot be undone.`)) return;
    setActionLoading(true);
    const { error } = await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    setActionLoading(false);
    if (error) { toast.error(error); return; }
    toast.success('User deleted');
    onClose();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!userId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[480px] z-50 flex flex-col
                   border-l border-white/[0.07] animate-slide-in-right overflow-hidden"
        style={{ background: '#0D0D1A' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <h2 className="text-base font-semibold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !user ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#6C63FF] animate-spin" />
          </div>
        ) : (
          <>
            {/* User summary */}
            <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/25
                                flex items-center justify-center text-base font-bold text-[#6C63FF] overflow-hidden">
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : (user.fullName ?? user.email ?? '?').slice(0, 1).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {user.fullName ?? user.username ?? 'No name'}
                  </p>
                  <p className="text-sm text-white/40 truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium ${STATUS_INFO[user.accountStatus].color}`}>
                      ● {STATUS_INFO[user.accountStatus].label}
                    </span>
                    {user.isAdmin && (
                      <span className="text-[9px] bg-[#6C63FF]/20 text-[#6C63FF] px-1.5 py-0.5 rounded font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'Balance',  value: user.creditBalance.toLocaleString() + ' cr' },
                  { label: 'Reports',  value: user.totalReports },
                  { label: 'Consumed', value: user.totalConsumed.toLocaleString() + ' cr' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/[0.06]"
                  >
                    <p className="text-sm font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] text-white/35 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-white/[0.06] shrink-0">
              {(['overview', 'credits', 'actions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-xs font-medium capitalize transition-all
                    ${activeTab === tab
                      ? 'text-[#6C63FF] border-b-2 border-[#6C63FF]'
                      : 'text-white/35 hover:text-white/60'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* ── Overview ── */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-4">
                  <Section title="Account Info">
                    <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} />
                    <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joined"
                      value={format(new Date(user.createdAt), 'MMM d, yyyy')} />
                    {user.occupation && (
                      <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Occupation" value={user.occupation} />
                    )}
                    {user.bio && (
                      <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                        <p className="text-xs text-white/35 mb-1">Bio</p>
                        <p className="text-xs text-white/60 leading-relaxed">{user.bio}</p>
                      </div>
                    )}
                  </Section>

                  <Section title="Content Stats">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Reports',       value: user.totalReports },
                        { label: 'Podcasts',      value: user.totalPodcasts },
                        { label: 'Debates',       value: user.totalDebates },
                        { label: 'Presentations', value: user.totalPresentations },
                        { label: 'Papers',        value: user.totalAcademicPapers },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]"
                        >
                          <p className="text-sm font-bold text-white">{s.value}</p>
                          <p className="text-[10px] text-white/35 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Section>

                  {user.interests?.length ? (
                    <Section title="Interests">
                      <div className="flex flex-wrap gap-1.5">
                        {user.interests.map((i) => (
                          <span key={i}
                            className="text-xs bg-[#6C63FF]/10 text-[#6C63FF] border border-[#6C63FF]/20 px-2 py-1 rounded-full">
                            {i}
                          </span>
                        ))}
                      </div>
                    </Section>
                  ) : null}
                </div>
              )}

              {/* ── Credits ── */}
              {activeTab === 'credits' && (
                <div className="flex flex-col gap-4">
                  <Section title="Credit Summary">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Current Balance',   value: user.creditBalance.toLocaleString() + ' cr' },
                        { label: 'Total Purchased',   value: user.totalPurchased.toLocaleString() + ' cr' },
                        { label: 'Total Consumed',    value: user.totalConsumed.toLocaleString() + ' cr' },
                        { label: 'Net (purchased-consumed)',
                          value: (user.totalPurchased - user.totalConsumed).toLocaleString() + ' cr' },
                      ].map((s) => (
                        <div key={s.label}
                          className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                          <p className="text-sm font-bold text-white">{s.value}</p>
                          <p className="text-[10px] text-white/35 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Manual Credit Adjustment">
                    <div className="flex flex-col gap-3">
                      {/* Direction toggle */}
                      <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
                        {(['add', 'deduct'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => setCreditDirection(dir)}
                            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
                              ${creditDirection === dir
                                ? dir === 'add'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                                : 'text-white/30 hover:text-white/60'
                              }`}
                          >
                            {dir === 'add'
                              ? <><Plus className="w-3 h-3" /> Add Credits</>
                              : <><Minus className="w-3 h-3" /> Deduct Credits</>
                            }
                          </button>
                        ))}
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="Credit amount (e.g. 50)"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                                   text-sm text-white placeholder:text-white/25 outline-none
                                   focus:border-[#6C63FF]/40 transition-all"
                      />
                      <input
                        type="text"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        placeholder="Reason (required)"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                                   text-sm text-white placeholder:text-white/25 outline-none
                                   focus:border-[#6C63FF]/40 transition-all"
                      />
                      <button
                        onClick={handleAdjustCredits}
                        disabled={actionLoading}
                        className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
                          ${creditDirection === 'add'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/25'
                            : 'bg-red-500/20   text-red-400   hover:bg-red-500/30   border border-red-500/25'
                          } disabled:opacity-50`}
                      >
                        {actionLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : `${creditDirection === 'add' ? 'Add' : 'Deduct'} Credits`
                        }
                      </button>
                    </div>
                  </Section>

                  {/* Recent transactions */}
                  {user.recentTransactions?.length > 0 && (
                    <Section title="Recent Transactions">
                      <div className="flex flex-col gap-1.5">
                        {user.recentTransactions.slice(0, 8).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-none"
                          >
                            <div className="min-w-0">
                              <p className="text-xs text-white/60 truncate">{tx.description}</p>
                              <p className="text-[10px] text-white/25 mt-0.5">
                                {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <span className={`text-xs font-bold shrink-0 ml-3 ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              )}

              {/* ── Actions ── */}
              {activeTab === 'actions' && (
                <div className="flex flex-col gap-4">
                  <Section title="Account Status">
                    <p className="text-xs text-white/40 mb-3">
                      Current status: <span className={`font-semibold ${STATUS_INFO[user.accountStatus].color}`}>
                        {STATUS_INFO[user.accountStatus].label}
                      </span>
                    </p>
                    <input
                      type="text"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Reason (required for all status changes)"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5
                                 text-sm text-white placeholder:text-white/25 outline-none
                                 focus:border-[#6C63FF]/40 transition-all mb-3"
                    />
                    <div className="flex flex-col gap-2">
                      {user.accountStatus !== 'active' && (
                        <ActionButton
                          icon={<Shield className="w-4 h-4" />}
                          label="Unsuspend / Restore Account"
                          color="green"
                          loading={actionLoading}
                          onClick={() => handleSetStatus('active')}
                        />
                      )}
                      {user.accountStatus !== 'suspended' && (
                        <ActionButton
                          icon={<ShieldOff className="w-4 h-4" />}
                          label="Suspend Account"
                          color="red"
                          loading={actionLoading}
                          onClick={() => handleSetStatus('suspended')}
                        />
                      )}
                      {user.accountStatus !== 'flagged' && (
                        <ActionButton
                          icon={<Flag className="w-4 h-4" />}
                          label="Flag for Review"
                          color="yellow"
                          loading={actionLoading}
                          onClick={() => handleSetStatus('flagged')}
                        />
                      )}
                    </div>
                  </Section>

                  <Section title="Danger Zone">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-300/70 leading-relaxed">
                          Permanently deletes the user account, all research reports, credits, and associated data.
                          This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={handleDelete}
                        disabled={actionLoading || user.isAdmin}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold
                                   bg-red-500/15 text-red-400 border border-red-500/25
                                   hover:bg-red-500/25 transition-all disabled:opacity-50
                                   flex items-center justify-center gap-2"
                      >
                        {actionLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><Trash2 className="w-4 h-4" /> Delete Account Permanently</>
                        }
                      </button>
                      {user.isAdmin && (
                        <p className="text-[10px] text-red-400/50 text-center mt-2">
                          Admin accounts cannot be deleted from the dashboard.
                        </p>
                      )}
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </>
        )}
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
    <div className="flex items-center gap-2 text-sm">
      <span className="text-white/25 shrink-0">{icon}</span>
      <span className="text-white/35 shrink-0">{label}:</span>
      <span className="text-white/65 truncate">{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, color, loading, onClick }: {
  icon: React.ReactNode; label: string;
  color: 'green' | 'red' | 'yellow'; loading: boolean; onClick: () => void;
}) {
  const colors = {
    green:  'bg-green-500/10  text-green-400  border-green-500/20  hover:bg-green-500/20',
    red:    'bg-red-500/10    text-red-400    border-red-500/20    hover:bg-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full py-2.5 rounded-xl text-sm font-medium border
                  flex items-center justify-center gap-2 transition-all
                  disabled:opacity-50 ${colors[color]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{icon} {label}</>}
    </button>
  );
}