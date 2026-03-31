// Admin-Dashboard/src/types/admin.ts
// Parts 31–32 — Complete TypeScript types for the admin dashboard
// Part 37 — Added: SocialAnalytics, TopResearcher, FollowGrowthPoint

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// ─── Platform Metrics ─────────────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  totalReports: number;
  reportsToday: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  creditsConsumedToday: number;
  creditsConsumedMonth: number;
  totalRevenueInr: number;
  revenueTodayInr: number;
  revenueMonthInr: number;
  activeWorkspaces: number;
  totalPodcasts: number;
  totalDebates: number;
  totalAcademicPapers: number;
}

// ─── Activity Chart ───────────────────────────────────────────────────────────

export interface DailyActivity {
  day: string;
  newUsers: number;
  newReports: number;
}

// ─── User Management ──────────────────────────────────────────────────────────

export type AccountStatus = 'active' | 'suspended' | 'flagged';

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  accountStatus: AccountStatus;
  isAdmin: boolean;
  createdAt: string;
  creditBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  totalReports: number;
  lastActiveAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  bio: string | null;
  occupation: string | null;
  interests: string[] | null;
  totalPodcasts: number;
  totalDebates: number;
  totalPresentations: number;
  totalAcademicPapers: number;
  recentTransactions: CreditTransactionRow[];
}

// ─── Credit Transactions ──────────────────────────────────────────────────────

export type CreditTransactionType =
  | 'purchase'
  | 'consume'
  | 'refund'
  | 'signup_bonus'
  | 'admin_grant'
  | 'referral_bonus';

export interface CreditTransactionRow {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  feature: string | null;
  packId: string | null;
  orderId: string | null;
  description: string;
  createdAt: string;
}

export interface CreditLedgerStats {
  totalIssued: number;
  totalConsumed: number;
  netCreditsInCirculation: number;
  avgBalancePerUser: number;
  totalSignupBonuses: number;
  totalPurchased: number;
  totalReferralBonuses: number;
  totalAdminGrants: number;
}

// ─── Razorpay / Payments ──────────────────────────────────────────────────────

export type RazorpayOrderStatus = 'created' | 'attempted' | 'paid' | 'failed' | 'expired';

export interface PaymentRow {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  packId: string;
  razorpayOrderId: string;
  paymentId: string | null;
  amount: number;
  amountInr: number;
  status: RazorpayOrderStatus;
  creditsToAdd: number;
  isTest: boolean;
  createdAt: string;
  paidAt: string | null;
}

export interface RevenueStats {
  todayInr: number;
  thisMonthInr: number;
  allTimeInr: number;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  successRate: number;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string;
  adminUserId: string;
  adminEmail: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

// ─── Part 32: Abuse Detection ─────────────────────────────────────────────────

export type AbuseSignalType =
  | 'credit_burn_rate'
  | 'failed_payments'
  | 'referral_farming'
  | 'manual';

export type AbuseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReviewAction  = 'cleared' | 'warned' | 'suspended';

export interface AbuseSignalRow {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  accountStatus: AccountStatus;
  signalType: AbuseSignalType;
  severity: AbuseSeverity;
  details: Record<string, unknown>;
  isReviewed: boolean;
  reviewAction: ReviewAction | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AbuseSignalFilters {
  signalType: AbuseSignalType | 'all';
  severity: AbuseSeverity | 'all';
  showReviewed: boolean;
  page: number;
  pageSize: number;
}

export interface ResolveAbuseSignalPayload {
  signalId: string;
  userId: string;
  action: ReviewAction;
  note: string;
  creditDeduction?: number;
}

// ─── Part 32: Content View ────────────────────────────────────────────────────

export type PlatformContentType = 'report' | 'podcast' | 'debate' | 'academic_paper';

export interface PlatformContentRow {
  id: string;
  contentType: PlatformContentType;
  title: string;
  subtitle: string | null;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  status: string;
  depth?: string;
  durationSeconds?: number;
  wordCount?: number;
  sourcesCount?: number;
  createdAt: string;
}

export interface ContentFilters {
  search: string;
  contentType: PlatformContentType | 'all';
  page: number;
  pageSize: number;
}

// ─── Part 32: Workspace Overview ──────────────────────────────────────────────

export interface WorkspaceOverviewRow {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  memberCount: number;
  reportCount: number;
  isPersonal: boolean;
  inviteCode: string;
  createdAt: string;
  lastActivityAt: string | null;
}

export interface WorkspaceOverviewFilters {
  search: string;
  page: number;
  pageSize: number;
}

// ─── Part 37: Social Analytics ────────────────────────────────────────────────

/** Overall social health stats returned by get_social_analytics_admin() */
export interface SocialAnalytics {
  follows_today:      number;
  follows_this_week:  number;
  follows_all_time:   number;
  public_profiles:    number;
  public_reports:     number;
  total_public_views: number;
}

/** A single researcher row from get_top_researchers_admin() */
export interface TopResearcher {
  id:                  string;
  username:            string | null;
  full_name:           string | null;
  avatar_url:          string | null;
  follower_count:      number;
  following_count:     number;
  report_count:        number;
  public_report_count: number;
  total_views:         number;
}

/** A single data point from get_follow_growth_7day() */
export interface FollowGrowthPoint {
  /** Short label e.g. "Mar 28" */
  day:         string;
  /** ISO date string e.g. "2026-03-28" */
  date:        string;
  new_follows: number;
}

/** Combined response shape from /api/admin/social */
export interface SocialAnalyticsResponse {
  analytics:      SocialAnalytics;
  topResearchers: TopResearcher[];
  followGrowth:   FollowGrowthPoint[];
  error:          string | null;
}

// ─── API Response types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
}

// ─── Admin action payloads ────────────────────────────────────────────────────

export interface AdjustCreditsPayload {
  userId: string;
  amount: number;
  reason: string;
}

export interface SetAccountStatusPayload {
  userId: string;
  status: AccountStatus;
  reason: string;
}

export interface RevokeCreditsPayload {
  userId: string;
  orderId: string;
  reason: string;
}

// ─── UI state / filter types ──────────────────────────────────────────────────

export interface UserFilters {
  search: string;
  status: AccountStatus | 'all';
  sortBy: 'created_at' | 'balance' | 'total_reports' | 'total_consumed';
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface CreditFilters {
  search: string;
  type: CreditTransactionType | 'all';
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export interface PaymentFilters {
  search: string;
  status: RazorpayOrderStatus | 'all';
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}