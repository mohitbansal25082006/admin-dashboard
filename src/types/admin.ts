// Admin-Dashboard/src/types/admin.ts
// Part 31 — All TypeScript types for the admin dashboard

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
  day: string;       // ISO date string "YYYY-MM-DD"
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
  // Credits info
  creditBalance: number;
  totalPurchased: number;
  totalConsumed: number;
  // Activity
  totalReports: number;
  lastActiveAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  bio: string | null;
  occupation: string | null;
  interests: string[] | null;
  // Extended stats
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
  amount: number;       // in paise
  amountInr: number;    // amount / 100
  status: RazorpayOrderStatus;
  creditsToAdd: number;
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

// ─── UI state types ───────────────────────────────────────────────────────────

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