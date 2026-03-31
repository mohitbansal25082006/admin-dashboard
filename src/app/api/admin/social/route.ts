// Admin-Dashboard/src/app/api/admin/social/route.ts
// Part 37 — Social analytics data API for /dashboard/social page.
// Part 37 FIX — Removed Cache-Control header so refresh button always gets
//               live data from the database, not a cached response.

import { NextRequest, NextResponse } from 'next/server';
import { cookies }                   from 'next/headers';
import { getAdminClient }             from '@/lib/supabase-admin';
import type {
  SocialAnalytics, TopResearcher,
  FollowGrowthPoint, SocialAnalyticsResponse,
} from '@/types/admin';

const ADMIN_COOKIE = 'deepdive-admin-token';

async function verifyAdmin(): Promise<string | null> {
  const cookieStore = await cookies();
  const token       = cookieStore.get(ADMIN_COOKIE)?.value ?? null;
  if (!token || !token.startsWith('eyJ') || token.split('.').length !== 3) return null;
  try {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;
    const { data: profile } = await admin
      .from('profiles').select('is_admin, account_status')
      .eq('id', user.id).single();
    if (!profile?.is_admin || profile.account_status === 'suspended') return null;
    return user.id;
  } catch { return null; }
}

export async function GET(_req: NextRequest) {
  const adminId = await verifyAdmin();
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminClient();

  const [analyticsResult, topResearchersResult, growthResult] = await Promise.all([
    admin.rpc('get_social_analytics_admin'),
    admin.rpc('get_top_researchers_admin', { p_limit: 10 }),
    admin.rpc('get_follow_growth_7day'),
  ]);

  const analytics: SocialAnalytics = analyticsResult.data
    ? {
        follows_today:      Number((analyticsResult.data as Record<string, unknown>).follows_today      ?? 0),
        follows_this_week:  Number((analyticsResult.data as Record<string, unknown>).follows_this_week  ?? 0),
        follows_all_time:   Number((analyticsResult.data as Record<string, unknown>).follows_all_time   ?? 0),
        public_profiles:    Number((analyticsResult.data as Record<string, unknown>).public_profiles    ?? 0),
        public_reports:     Number((analyticsResult.data as Record<string, unknown>).public_reports     ?? 0),
        total_public_views: Number((analyticsResult.data as Record<string, unknown>).total_public_views ?? 0),
      }
    : { follows_today: 0, follows_this_week: 0, follows_all_time: 0,
        public_profiles: 0, public_reports: 0, total_public_views: 0 };

  const topResearchers: TopResearcher[] = Array.isArray(topResearchersResult.data)
    ? (topResearchersResult.data as TopResearcher[]) : [];

  const followGrowth: FollowGrowthPoint[] = Array.isArray(growthResult.data)
    ? (growthResult.data as FollowGrowthPoint[]) : [];

  const combinedError =
    analyticsResult.error?.message ??
    topResearchersResult.error?.message ??
    growthResult.error?.message ?? null;

  const response: SocialAnalyticsResponse = { analytics, topResearchers, followGrowth, error: combinedError };

  // FIX: No Cache-Control header — always return live data so refresh works instantly
  return NextResponse.json(response);
}