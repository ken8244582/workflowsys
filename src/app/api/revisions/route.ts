import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';
import { escapeIlike, beijingNow } from '@/lib/utils';

function mapRevisionRow(row: Record<string, unknown>) {
  return {
    id: row.id as number,
    revisionDate: row.revision_date as string || '',
    processCode: row.process_code as string || '',
    l4Process: row.l4_process as string || '',
    version: row.version as string || '',
    l1Domain: row.l1_domain as string || '',
    l2Group: row.l2_group as string || '',
    l3Segment: row.l3_segment as string || '',
    revisionType: row.revision_type as string || '',
    description: row.description as string || '',
    operator: row.operator as string || '',
  };
}

// GET /api/revisions - List revision records with filtering
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);

  let query = supabase.from('revision_records').select('*', { count: 'exact' });

  // Filters
  const l1Domain = searchParams.get('l1Domain');
  if (l1Domain) query = query.eq('l1_domain', l1Domain);

  const revisionType = searchParams.get('revisionType');
  if (revisionType) query = query.eq('revision_type', revisionType);

  const startDate = searchParams.get('startDate');
  if (startDate) query = query.gte('revision_date', startDate);

  const endDate = searchParams.get('endDate');
  if (endDate) query = query.lte('revision_date', endDate);

  // B004 fix: escape search terms for ilike
  const search = searchParams.get('search');
  if (search) {
    const escaped = escapeIlike(search);
    query = query.or(`l4_process.ilike.%${escaped}%,process_code.ilike.%${escaped}%,description.ilike.%${escaped}%`);
  }

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order('id', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    items: (data || []).map(mapRevisionRow),
    total,
    page,
    pageSize,
    totalPages,
  });
}

// POST /api/revisions - Create a new revision record
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const supabase = getSupabaseClient();
  const body = await request.json();
  const now = beijingNow();

  const { data, error } = await supabase
    .from('revision_records')
    .insert({
      revision_date: body.revisionDate || now,
      process_code: body.processCode || '',
      l4_process: body.l4Process || '',
      version: body.version || '',
      l1_domain: body.l1Domain || '',
      l2_group: body.l2Group || '',
      l3_segment: body.l3Segment || '',
      revision_type: body.revisionType || '',
      description: body.description || '',
      operator: body.operator || '',
      created_by: session.username,
      created_at_ts: now,
      updated_by: session.username,
      updated_at_ts: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapRevisionRow(data as Record<string, unknown>));
}
