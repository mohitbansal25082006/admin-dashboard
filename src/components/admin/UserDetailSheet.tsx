'use client';
// Admin-Dashboard/src/components/admin/UserDetailSheet.tsx
// Part 55.13 — UserDetailSheet with full theme integration and mobile optimization.

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  X, Loader2, CreditCard, BarChart2, Shield,
  ShieldOff, Flag, Trash2, Plus, Minus,
  Mail, Calendar, Activity, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import { adminFetch } from '@/lib/auth';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import type { AdminUserDetail, AccountStatus } from '@/types/admin';

interface Props {
  userId: string | null;
  onClose: () => void;
}

const STATUS_INFO: Record<AccountStatus, { label: string; color: string; lightColor: string }> = {
  active: { label: 'Active', color: 'text-green-400', lightColor: 'text-green-700' },
  suspended: { label: 'Suspended', color: 'text-red-400', lightColor: 'text-red-700' },
  flagged: { label: 'Flagged', color: 'text-yellow-400', lightColor: 'text-yellow-700' },
};

export function UserDetailSheet({ userId, onClose }: Props) {
  const { isLight } = useTheme();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'credits' | 'actions'>('overview');
  const [isMobile, setIsMobile] = useState(false);

  // Credit adjustment state
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditDirection, setCreditDirection] = useState<'add' | 'deduct'>('add');

  // Status change state
  const [statusReason, setStatusReason] = useState('');

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (!creditReason.trim()) { toast.error('Please enter a reason'); return; }

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

  // ── Theme-aware styles ─────────────────────────────────────────────────────

  const bgColor = isLight ? '#F5F6FB' : '#0D0D1A';
  const cardBg = isLight ? '#FFFFFF' : 'var(--background-card)';
  const borderColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
  const textPrimary = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const textSecondary = isLight ? '#333' : 'var(--text-secondary)';
  const textMuted = isLight ? '#666' : 'var(--text-muted)';
  const textMutedLight = isLight ? '#888' : 'var(--text-muted)';
  const inputBg = isLight ? '#F5F6FB' : 'rgba(255,255,255,0.04)';
  const inputBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const inputText = isLight ? '#1A1A2E' : 'var(--text-primary)';
  const primaryColor = isLight ? '#5B52E0' : '#6C63FF';

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!userId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />

      {/* Sheet - full width on mobile, max-width on desktop */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden animate-slide-in-right"
        style={{
          width: isMobile ? '100%' : '480px',
          maxWidth: '100%',
          backgroundColor: bgColor,
          borderLeft: `1px solid ${borderColor}`,
        }}
      >
        {/* Header - with back button on mobile */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: borderColor }}>
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: textMuted }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-base font-semibold" style={{ color: textPrimary }}>User Details</h2>
          </div>
          {!isMobile && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading || !user ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: primaryColor }} />
          </div>
        ) : (
          <>
            {/* User summary - responsive */}
            <div className="px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: borderColor }}>
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold overflow-hidden shrink-0"
                  style={{
                    backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                    border: `1px solid ${isLight ? `${primaryColor}30` : `${primaryColor}30`}`,
                    color: primaryColor,
                  }}
                >
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : (user.fullName ?? user.email ?? '?').slice(0, 1).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: textPrimary }}>
                    {user.fullName ?? user.username ?? 'No name'}
                  </p>
                  <p className="text-sm truncate" style={{ color: textMuted }}>{user.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-medium ${isLight ? STATUS_INFO[user.accountStatus].lightColor : STATUS_INFO[user.accountStatus].color}`}>
                      ● {STATUS_INFO[user.accountStatus].label}
                    </span>
                    {user.isAdmin && (
                      <span 
                        className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                          color: primaryColor,
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats - responsive grid */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'Balance', value: user.creditBalance.toLocaleString() + ' cr' },
                  { label: 'Reports', value: user.totalReports },
                  { label: 'Consumed', value: user.totalConsumed.toLocaleString() + ' cr' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-3 text-center border"
                    style={{
                      backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                      borderColor: borderColor,
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: textPrimary }}>{stat.value}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs - responsive */}
            <div className="flex gap-0 border-b shrink-0" style={{ borderColor: borderColor }}>
              {(['overview', 'credits', 'actions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-xs font-medium capitalize transition-all ${
                    activeTab === tab
                      ? 'border-b-2'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    color: activeTab === tab ? primaryColor : textMuted,
                    borderBottomColor: activeTab === tab ? primaryColor : 'transparent',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

              {/* ── Overview ── */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-4">
                  <Section title="Account Info" isLight={isLight}>
                    <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={user.email} isLight={isLight} />
                    <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joined"
                      value={format(new Date(user.createdAt), 'MMM d, yyyy')} isLight={isLight} />
                    {user.occupation && (
                      <InfoRow icon={<Activity className="w-3.5 h-3.5" />} label="Occupation" value={user.occupation} isLight={isLight} />
                    )}
                    {user.bio && (
                      <div 
                        className="rounded-xl p-3 border"
                        style={{
                          backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                          borderColor: borderColor,
                        }}
                      >
                        <p className="text-xs mb-1" style={{ color: textMuted }}>Bio</p>
                        <p className="text-xs leading-relaxed" style={{ color: textSecondary }}>{user.bio}</p>
                      </div>
                    )}
                  </Section>

                  <Section title="Content Stats" isLight={isLight}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Reports', value: user.totalReports },
                        { label: 'Podcasts', value: user.totalPodcasts },
                        { label: 'Debates', value: user.totalDebates },
                        { label: 'Presentations', value: user.totalPresentations },
                        { label: 'Papers', value: user.totalAcademicPapers },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl p-3 border"
                          style={{
                            backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                            borderColor: borderColor,
                          }}
                        >
                          <p className="text-sm font-bold" style={{ color: textPrimary }}>{s.value}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Section>

                  {user.interests?.length ? (
                    <Section title="Interests" isLight={isLight}>
                      <div className="flex flex-wrap gap-1.5">
                        {user.interests.map((i) => (
                          <span key={i}
                            className="text-xs px-2 py-1 rounded-full border"
                            style={{
                              backgroundColor: isLight ? `${primaryColor}20` : `${primaryColor}20`,
                              borderColor: isLight ? `${primaryColor}30` : `${primaryColor}30`,
                              color: primaryColor,
                            }}
                          >
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
                  <Section title="Credit Summary" isLight={isLight}>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Current Balance', value: user.creditBalance.toLocaleString() + ' cr' },
                        { label: 'Total Purchased', value: user.totalPurchased.toLocaleString() + ' cr' },
                        { label: 'Total Consumed', value: user.totalConsumed.toLocaleString() + ' cr' },
                        { label: 'Net (purchased-consumed)',
                          value: (user.totalPurchased - user.totalConsumed).toLocaleString() + ' cr' },
                      ].map((s) => (
                        <div key={s.label}
                          className="rounded-xl p-3 border"
                          style={{
                            backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                            borderColor: borderColor,
                          }}>
                          <p className="text-sm font-bold" style={{ color: textPrimary }}>{s.value}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Manual Credit Adjustment" isLight={isLight}>
                    <div className="flex flex-col gap-3">
                      {/* Direction toggle */}
                      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: borderColor }}>
                        {(['add', 'deduct'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => setCreditDirection(dir)}
                            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              creditDirection === dir
                                ? dir === 'add'
                                  ? 'text-green-400'
                                  : 'text-red-400'
                                : 'hover:opacity-80'
                            }`}
                            style={{
                              backgroundColor: creditDirection === dir
                                ? dir === 'add'
                                  ? isLight ? 'rgba(5,150,105,0.15)' : 'rgba(16,185,129,0.2)'
                                  : isLight ? 'rgba(220,38,38,0.15)' : 'rgba(239,68,68,0.2)'
                                : 'transparent',
                              color: creditDirection === dir
                                ? dir === 'add'
                                  ? isLight ? '#059669' : '#10B981'
                                  : isLight ? '#DC2626' : '#EF4444'
                                : textMuted,
                            }}
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
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                        style={{
                          backgroundColor: inputBg,
                          border: `1px solid ${inputBorder}`,
                          color: inputText,
                        }}
                      />
                      <input
                        type="text"
                        value={creditReason}
                        onChange={(e) => setCreditReason(e.target.value)}
                        placeholder="Reason (required)"
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                        style={{
                          backgroundColor: inputBg,
                          border: `1px solid ${inputBorder}`,
                          color: inputText,
                        }}
                      />
                      <button
                        onClick={handleAdjustCredits}
                        disabled={actionLoading}
                        className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                          creditDirection === 'add'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                        style={{
                          backgroundColor: creditDirection === 'add'
                            ? isLight ? 'rgba(5,150,105,0.15)' : 'rgba(16,185,129,0.2)'
                            : isLight ? 'rgba(220,38,38,0.15)' : 'rgba(239,68,68,0.2)',
                          border: `1px solid ${
                            creditDirection === 'add'
                              ? isLight ? 'rgba(5,150,105,0.25)' : 'rgba(16,185,129,0.25)'
                              : isLight ? 'rgba(220,38,38,0.25)' : 'rgba(239,68,68,0.25)'
                          }`,
                        }}
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
                    <Section title="Recent Transactions" isLight={isLight}>
                      <div className="flex flex-col gap-1.5">
                        {user.recentTransactions.slice(0, 8).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-2 border-b last:border-none"
                            style={{ borderColor: borderColor }}
                          >
                            <div className="min-w-0">
                              <p className="text-xs truncate" style={{ color: textSecondary }}>{tx.description}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>
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
                  <Section title="Account Status" isLight={isLight}>
                    <p className="text-xs mb-3" style={{ color: textMuted }}>
                      Current status: <span className={`font-semibold ${isLight ? STATUS_INFO[user.accountStatus].lightColor : STATUS_INFO[user.accountStatus].color}`}>
                        {STATUS_INFO[user.accountStatus].label}
                      </span>
                    </p>
                    <input
                      type="text"
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Reason (required for all status changes)"
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all mb-3"
                      style={{
                        backgroundColor: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: inputText,
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      {user.accountStatus !== 'active' && (
                        <ActionButton
                          icon={<Shield className="w-4 h-4" />}
                          label="Unsuspend / Restore Account"
                          color="green"
                          loading={actionLoading}
                          isLight={isLight}
                          onClick={() => handleSetStatus('active')}
                        />
                      )}
                      {user.accountStatus !== 'suspended' && (
                        <ActionButton
                          icon={<ShieldOff className="w-4 h-4" />}
                          label="Suspend Account"
                          color="red"
                          loading={actionLoading}
                          isLight={isLight}
                          onClick={() => handleSetStatus('suspended')}
                        />
                      )}
                      {user.accountStatus !== 'flagged' && (
                        <ActionButton
                          icon={<Flag className="w-4 h-4" />}
                          label="Flag for Review"
                          color="yellow"
                          loading={actionLoading}
                          isLight={isLight}
                          onClick={() => handleSetStatus('flagged')}
                        />
                      )}
                    </div>
                  </Section>

                  <Section title="Danger Zone" isLight={isLight}>
                    <div 
                      className="rounded-xl p-4 border"
                      style={{
                        backgroundColor: isLight ? 'rgba(220,38,38,0.05)' : 'rgba(239,68,68,0.05)',
                        borderColor: isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)',
                      }}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: isLight ? '#DC2626' : '#F87171' }} />
                        <p className="text-xs leading-relaxed" style={{ color: isLight ? '#DC2626' : '#FCA5A5' }}>
                          Permanently deletes the user account, all research reports, credits, and associated data.
                          This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={handleDelete}
                        disabled={actionLoading || user.isAdmin}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: isLight ? 'rgba(220,38,38,0.15)' : 'rgba(239,68,68,0.15)',
                          border: `1px solid ${isLight ? 'rgba(220,38,38,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          color: isLight ? '#DC2626' : '#F87171',
                        }}
                      >
                        {actionLoading
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><Trash2 className="w-4 h-4" /> Delete Account Permanently</>
                        }
                      </button>
                      {user.isAdmin && (
                        <p className="text-[10px] text-center mt-2" style={{ color: isLight ? '#DC2626' : '#FCA5A5' }}>
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
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: textMuted }}>{icon}</span>
      <span style={{ color: textMuted }}>{label}:</span>
      <span className="truncate" style={{ color: textSecondary }}>{value}</span>
    </div>
  );
}

function ActionButton({ icon, label, color, loading, isLight, onClick }: {
  icon: React.ReactNode;
  label: string;
  color: 'green' | 'red' | 'yellow';
  loading: boolean;
  isLight: boolean;
  onClick: () => void;
}) {
  const colors = {
    green: {
      bg: isLight ? 'rgba(5,150,105,0.1)' : 'rgba(16,185,129,0.1)',
      border: isLight ? 'rgba(5,150,105,0.2)' : 'rgba(16,185,129,0.2)',
      text: isLight ? '#059669' : '#34D399',
      hoverBg: isLight ? 'rgba(5,150,105,0.2)' : 'rgba(16,185,129,0.2)',
    },
    red: {
      bg: isLight ? 'rgba(220,38,38,0.1)' : 'rgba(239,68,68,0.1)',
      border: isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)',
      text: isLight ? '#DC2626' : '#F87171',
      hoverBg: isLight ? 'rgba(220,38,38,0.2)' : 'rgba(239,68,68,0.2)',
    },
    yellow: {
      bg: isLight ? 'rgba(217,119,6,0.1)' : 'rgba(251,191,36,0.1)',
      border: isLight ? 'rgba(217,119,6,0.2)' : 'rgba(251,191,36,0.2)',
      text: isLight ? '#D97706' : '#FBBF24',
      hoverBg: isLight ? 'rgba(217,119,6,0.2)' : 'rgba(251,191,36,0.2)',
    },
  };
  
  const style = colors[color];
  
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 rounded-xl text-sm font-medium border flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = style.hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = style.bg;
      }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{icon} {label}</>}
    </button>
  );
}