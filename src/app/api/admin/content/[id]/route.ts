// Admin-Dashboard/src/app/api/admin/content/[id]/route.ts
// Part 32 — Full detail for a single content item.
// GET /api/admin/content/[id]?type=report|podcast|debate|academic_paper

import { NextRequest, NextResponse }         from 'next/server';
import { verifyAdminSession, getAdminClient } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifyAdminSession(request.headers.get('authorization'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, {
      status: msg.startsWith('FORBIDDEN') ? 403 : 401,
    });
  }

  const { id }  = await params;
  const type    = request.nextUrl.searchParams.get('type') ?? 'report';

  try {
    const admin = getAdminClient();

    // ── Helper: get user info ────────────────────────────────────────────────
    const getUserInfo = async (userId: string) => {
      let email = '';
      let name  = '';
      try {
        const { data: { user } } = await admin.auth.admin.getUserById(userId);
        email = user?.email ?? '';
      } catch {}
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', userId)
          .single();
        name = profile?.full_name ?? profile?.username ?? '';
      } catch {}
      return { email, name };
    };

    // ── Report ───────────────────────────────────────────────────────────────
    if (type === 'report') {
      const { data, error } = await admin
        .from('research_reports')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const { email, name } = await getUserInfo(data.user_id);

      // Parse sections count, citations count
      let sectionsCount = 0;
      let citationsCount = 0;
      try { sectionsCount  = Array.isArray(data.sections)  ? data.sections.length  : 0; } catch {}
      try { citationsCount = Array.isArray(data.citations) ? data.citations.length : 0; } catch {}

      return NextResponse.json({
        type: 'report',
        id:              data.id,
        title:           data.title          ?? data.query ?? 'Untitled',
        query:           data.query          ?? '',
        depth:           data.depth          ?? 'quick',
        status:          data.status         ?? 'unknown',
        executiveSummary: data.executive_summary ?? '',
        keyFindings:     Array.isArray(data.key_findings) ? data.key_findings : [],
        futurePredictions: Array.isArray(data.future_predictions) ? data.future_predictions : [],
        sourcesCount:    data.sources_count  ?? 0,
        reliabilityScore: data.reliability_score ?? 0,
        focusAreas:      Array.isArray(data.focus_areas) ? data.focus_areas : [],
        sectionsCount,
        citationsCount,
        researchMode:    data.research_mode  ?? 'standard',
        userId:          data.user_id,
        userEmail:       email,
        userName:        name,
        createdAt:       data.created_at,
        completedAt:     data.completed_at   ?? null,
      });
    }

    // ── Podcast ──────────────────────────────────────────────────────────────
    if (type === 'podcast') {
      const { data, error } = await admin
        .from('podcasts')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const { email, name } = await getUserInfo(data.user_id);
      const config  = data.config ?? {};
      const script  = data.script ?? {};

      return NextResponse.json({
        type: 'podcast',
        id:              data.id,
        title:           data.title       ?? '',
        topic:           data.topic       ?? '',
        description:     data.description ?? '',
        status:          data.status      ?? 'unknown',
        hostName:        config.hostName  ?? '',
        guestName:       config.guestName ?? '',
        hostVoice:       config.hostVoice ?? '',
        guestVoice:      config.guestVoice ?? '',
        targetDuration:  config.targetDurationMinutes ?? 0,
        durationSeconds: data.duration_seconds       ?? 0,
        wordCount:       data.word_count              ?? 0,
        completedSegments: data.completed_segments   ?? 0,
        turnsCount:      Array.isArray(script.turns) ? script.turns.length : 0,
        exportCount:     data.export_count ?? 0,
        userId:          data.user_id,
        userEmail:       email,
        userName:        name,
        createdAt:       data.created_at,
        completedAt:     data.completed_at ?? null,
      });
    }

    // ── Debate ───────────────────────────────────────────────────────────────
    if (type === 'debate') {
      const { data, error } = await admin
        .from('debate_sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const { email, name } = await getUserInfo(data.user_id);
      const perspectives   = Array.isArray(data.perspectives) ? data.perspectives : [];

      // Build stance distribution
      const stanceMap: Record<string, number> = {};
      for (const p of perspectives) {
        const st = p.stanceType ?? p.stance_type ?? 'neutral';
        stanceMap[st] = (stanceMap[st] ?? 0) + 1;
      }

      return NextResponse.json({
        type: 'debate',
        id:                  data.id,
        topic:               data.topic    ?? '',
        question:            data.question ?? '',
        status:              data.status   ?? 'unknown',
        agentRoles:          Array.isArray(data.agent_roles) ? data.agent_roles : [],
        perspectivesCount:   perspectives.length,
        searchResultsCount:  data.search_results_count ?? 0,
        stanceDistribution:  stanceMap,
        moderatorSummary:    data.moderator?.summary ?? data.moderator?.balanced_verdict ?? '',
        userId:              data.user_id,
        userEmail:           email,
        userName:            name,
        createdAt:           data.created_at,
        completedAt:         data.completed_at ?? null,
      });
    }

    // ── Academic paper ───────────────────────────────────────────────────────
    if (type === 'academic_paper') {
      const { data, error } = await admin
        .from('academic_papers')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const { email, name } = await getUserInfo(data.user_id);
      const sections = Array.isArray(data.sections)  ? data.sections  : [];
      const citations= Array.isArray(data.citations) ? data.citations : [];

      return NextResponse.json({
        type: 'academic_paper',
        id:              data.id,
        title:           data.title         ?? '',
        runningHead:     data.running_head  ?? '',
        abstract:        data.abstract      ?? '',
        keywords:        Array.isArray(data.keywords) ? data.keywords : [],
        citationStyle:   data.citation_style ?? 'apa',
        wordCount:       data.word_count    ?? 0,
        pageEstimate:    data.page_estimate ?? 0,
        sectionsCount:   sections.length,
        citationsCount:  citations.length,
        exportCount:     data.export_count  ?? 0,
        userId:          data.user_id,
        userEmail:       email,
        userName:        name,
        createdAt:       data.created_at,
        generatedAt:     data.generated_at  ?? null,
      });
    }

    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  } catch (err) {
    console.error('[content/id] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load content detail' },
      { status: 500 },
    );
  }
}