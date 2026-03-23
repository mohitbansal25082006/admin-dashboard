// Admin-Dashboard/src/app/api/admin/content/route.ts
// Part 32 — Platform Content View API
//
// GET /api/admin/content?type=all&search=&page=1&pageSize=20
// Returns paginated content: reports, podcasts, debates, academic_papers

import { NextRequest, NextResponse }             from 'next/server';
import { verifyAdminSession, getAdminClient }     from '@/lib/supabase-admin';
import type { PlatformContentRow, PaginatedResponse } from '@/types/admin';

const PAGE_SIZE_MAX = 50;

export async function GET(request: NextRequest) {
  try {
    await verifyAdminSession(request.headers.get('authorization'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { searchParams } = request.nextUrl;
  const contentType = searchParams.get('type')     ?? 'all';
  const search      = searchParams.get('search')   ?? '';
  const page        = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10));
  const pageSize    = Math.min(PAGE_SIZE_MAX, parseInt(searchParams.get('pageSize') ?? '20', 10));

  try {
    const admin  = getAdminClient();
    const allRows: PlatformContentRow[] = [];
    const q      = search.trim().toLowerCase();

    // ── Helper: batch-fetch emails for a set of user IDs ─────────────────────
    const fetchEmailsAndNames = async (userIds: string[]) => {
      const emailMap: Record<string, string> = {};
      const nameMap:  Record<string, string> = {};
      if (userIds.length === 0) return { emailMap, nameMap };

      try {
        const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
        for (const u of (authUsers?.users ?? [])) {
          emailMap[u.id] = u.email ?? '';
        }
      } catch { /* non-fatal */ }

      try {
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds.slice(0, 500));
        for (const p of (profiles ?? [])) {
          nameMap[p.id] = p.full_name ?? p.username ?? '';
        }
      } catch { /* non-fatal */ }

      return { emailMap, nameMap };
    };

    // ── Fetch Reports ─────────────────────────────────────────────────────────
    if (contentType === 'all' || contentType === 'report') {
      try {
        let query = admin
          .from('research_reports')
          .select('id, title, query, user_id, depth, status, sources_count, created_at')
          .order('created_at', { ascending: false })
          .limit(contentType === 'all' ? 200 : 500);

        const { data: reports } = await query;

        if (reports) {
          const ids = reports.map((r: any) => r.user_id);
          const { emailMap, nameMap } = await fetchEmailsAndNames(ids);

          for (const r of reports) {
            const row: PlatformContentRow = {
              id:           r.id,
              contentType:  'report',
              title:        r.title ?? r.query ?? 'Untitled Report',
              subtitle:     r.query ?? null,
              userId:       r.user_id,
              userEmail:    emailMap[r.user_id] ?? null,
              userName:     nameMap[r.user_id]  ?? null,
              status:       r.status            ?? 'unknown',
              depth:        r.depth             ?? undefined,
              sourcesCount: r.sources_count     ?? undefined,
              createdAt:    r.created_at,
            };
            // Apply search filter
            if (!q || row.title.toLowerCase().includes(q) ||
                (row.subtitle ?? '').toLowerCase().includes(q) ||
                (row.userEmail ?? '').toLowerCase().includes(q)) {
              allRows.push(row);
            }
          }
        }
      } catch (err) {
        console.warn('[content] reports fetch error:', err);
      }
    }

    // ── Fetch Podcasts ────────────────────────────────────────────────────────
    if (contentType === 'all' || contentType === 'podcast') {
      try {
        const { data: podcasts } = await admin
          .from('podcasts')
          .select('id, title, topic, user_id, status, duration_seconds, created_at')
          .order('created_at', { ascending: false })
          .limit(contentType === 'all' ? 200 : 500);

        if (podcasts) {
          const ids = podcasts.map((r: any) => r.user_id);
          const { emailMap, nameMap } = await fetchEmailsAndNames(ids);

          for (const r of podcasts) {
            const row: PlatformContentRow = {
              id:              r.id,
              contentType:     'podcast',
              title:           r.title             ?? r.topic ?? 'Untitled Podcast',
              subtitle:        r.topic             ?? null,
              userId:          r.user_id,
              userEmail:       emailMap[r.user_id] ?? null,
              userName:        nameMap[r.user_id]  ?? null,
              status:          r.status            ?? 'unknown',
              durationSeconds: r.duration_seconds  ?? undefined,
              createdAt:       r.created_at,
            };
            if (!q || row.title.toLowerCase().includes(q) ||
                (row.subtitle ?? '').toLowerCase().includes(q) ||
                (row.userEmail ?? '').toLowerCase().includes(q)) {
              allRows.push(row);
            }
          }
        }
      } catch (err) {
        console.warn('[content] podcasts fetch error:', err);
      }
    }

    // ── Fetch Debates ─────────────────────────────────────────────────────────
    if (contentType === 'all' || contentType === 'debate') {
      try {
        const { data: debates } = await admin
          .from('debate_sessions')
          .select('id, topic, question, user_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(contentType === 'all' ? 200 : 500);

        if (debates) {
          const ids = debates.map((r: any) => r.user_id);
          const { emailMap, nameMap } = await fetchEmailsAndNames(ids);

          for (const r of debates) {
            const row: PlatformContentRow = {
              id:          r.id,
              contentType: 'debate',
              title:       r.topic               ?? r.question ?? 'Untitled Debate',
              subtitle:    r.question            ?? null,
              userId:      r.user_id,
              userEmail:   emailMap[r.user_id]   ?? null,
              userName:    nameMap[r.user_id]    ?? null,
              status:      r.status              ?? 'unknown',
              createdAt:   r.created_at,
            };
            if (!q || row.title.toLowerCase().includes(q) ||
                (row.subtitle ?? '').toLowerCase().includes(q) ||
                (row.userEmail ?? '').toLowerCase().includes(q)) {
              allRows.push(row);
            }
          }
        }
      } catch (err) {
        console.warn('[content] debates fetch error:', err);
      }
    }

    // ── Fetch Academic Papers ─────────────────────────────────────────────────
    if (contentType === 'all' || contentType === 'academic_paper') {
      try {
        const { data: papers } = await admin
          .from('academic_papers')
          .select('id, title, running_head, user_id, citation_style, word_count, created_at')
          .order('created_at', { ascending: false })
          .limit(contentType === 'all' ? 200 : 500);

        if (papers) {
          const ids = papers.map((r: any) => r.user_id);
          const { emailMap, nameMap } = await fetchEmailsAndNames(ids);

          for (const r of papers) {
            const row: PlatformContentRow = {
              id:          r.id,
              contentType: 'academic_paper',
              title:       r.title               ?? 'Untitled Paper',
              subtitle:    r.citation_style      ? `${r.citation_style.toUpperCase()} citation` : null,
              userId:      r.user_id,
              userEmail:   emailMap[r.user_id]   ?? null,
              userName:    nameMap[r.user_id]    ?? null,
              status:      'completed',
              wordCount:   r.word_count          ?? undefined,
              createdAt:   r.created_at,
            };
            if (!q || row.title.toLowerCase().includes(q) ||
                (row.subtitle ?? '').toLowerCase().includes(q) ||
                (row.userEmail ?? '').toLowerCase().includes(q)) {
              allRows.push(row);
            }
          }
        }
      } catch (err) {
        console.warn('[content] academic papers fetch error:', err);
      }
    }

    // ── Sort all combined rows by createdAt DESC ───────────────────────────────
    allRows.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // ── Paginate ──────────────────────────────────────────────────────────────
    const total      = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start      = (page - 1) * pageSize;
    const paged      = allRows.slice(start, start + pageSize);

    const response: PaginatedResponse<PlatformContentRow> = {
      data: paged, total, page, pageSize, totalPages, error: null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[content] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load content' },
      { status: 500 },
    );
  }
}