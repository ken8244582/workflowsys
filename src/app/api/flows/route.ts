import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { FlowItem } from '@/lib/flow-data';

function mapFlowRow(row: Record<string, unknown>): FlowItem {
  return {
    id: row.id as number,
    l1Domain: (row.l1_domain as string) || '',
    l1Owner: (row.l1_owner as string) || '',
    l2Group: (row.l2_group as string) || '',
    l2Owner: (row.l2_owner as string) || '',
    l3Segment: (row.l3_segment as string) || '',
    l3Owner: (row.l3_owner as string) || '',
    processCode: (row.process_code as string) || '',
    l4Process: (row.l4_process as string) || '',
    version: (row.version as string) || '',
    department: (row.department as string) || '',
    l4Owner: (row.l4_owner as string) || '',
    format: (row.format as string) || '',
    category: (row.category as string) || '',
    itCoverage: (row.it_coverage as string) || '',
    itSubCategory: (row.it_sub_category as string) || '',
    itScore: (row.it_score as number) || 0,
    status: ((row.status as string) || '') as FlowItem['status'],
  };
}

// GET /api/flows - List flows with filtering and pagination
export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);

  let query = supabase.from('flows').select('*', { count: 'exact' });

  // Filters
  const l1Domain = searchParams.get('l1Domain');
  if (l1Domain) query = query.eq('l1_domain', l1Domain);

  const l2Group = searchParams.get('l2Group');
  if (l2Group) query = query.eq('l2_group', l2Group);

  const l3Segment = searchParams.get('l3Segment');
  if (l3Segment) query = query.eq('l3_segment', l3Segment);

  const category = searchParams.get('category');
  if (category) query = query.eq('category', category);

  const format = searchParams.get('format');
  if (format) query = query.eq('format', format);

  const itCoverage = searchParams.get('itCoverage');
  if (itCoverage) query = query.eq('it_coverage', itCoverage);

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const search = searchParams.get('search');
  if (search) {
    query = query.or(`l4_process.ilike.%${search}%,process_code.ilike.%${search}%`);
  }

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order('id', { ascending: true }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    items: (data || []).map(mapFlowRow),
    total,
    page,
    pageSize,
    totalPages,
  });
}

// POST /api/flows - Create a new flow
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from('flows')
    .insert({
      l1_domain: body.l1Domain || '',
      l1_owner: body.l1Owner || '',
      l2_group: body.l2Group || '',
      l2_owner: body.l2Owner || '',
      l3_segment: body.l3Segment || '',
      l3_owner: body.l3Owner || '',
      process_code: body.processCode || '',
      l4_process: body.l4Process || '',
      version: body.version || '',
      department: body.department || '',
      l4_owner: body.l4Owner || '',
      format: body.format || '',
      category: body.category || '',
      it_coverage: body.itCoverage || '',
      it_sub_category: body.itSubCategory || '',
      it_score: body.itScore || 0,
      status: body.status || '',
    })
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapFlowRow(data), { status: 201 });
}
