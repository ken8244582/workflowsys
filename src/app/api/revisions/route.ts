import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/revisions - List revision records with filters and pagination
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const l1Domain = searchParams.get('l1Domain');
  const revisionType = searchParams.get('revisionType');
  const keyword = searchParams.get('keyword');

  let query = supabase.from('revision_records').select('*', { count: 'exact' });

  if (l1Domain) query = query.eq('l1_domain', l1Domain);
  if (revisionType) query = query.eq('revision_type', revisionType);
  if (keyword) {
    query = query.or(`process_code.ilike.%${keyword}%,l4_process.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order('id', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    revisionDate: row.revision_date || '',
    processCode: row.process_code || '',
    l4Process: row.l4_process || '',
    version: row.version || '',
    l1Domain: row.l1_domain || '',
    l2Group: row.l2_group || '',
    l3Segment: row.l3_segment || '',
    revisionType: row.revision_type || '',
    description: row.description || '',
    operator: row.operator || '',
  }));

  return NextResponse.json({
    items,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
