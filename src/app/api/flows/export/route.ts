import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/flows/export - Export all flows as JSON (client will convert to Excel)
export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    l1Domain: row.l1_domain || '',
    l1Owner: row.l1_owner || '',
    l2Group: row.l2_group || '',
    l2Owner: row.l2_owner || '',
    l3Segment: row.l3_segment || '',
    l3Owner: row.l3_owner || '',
    processCode: row.process_code || '',
    l4Process: row.l4_process || '',
    version: row.version || '',
    department: row.department || '',
    l4Owner: row.l4_owner || '',
    format: row.format || '',
    category: row.category || '',
    itCoverage: row.it_coverage || '',
    itSubCategory: row.it_sub_category || '',
    itScore: row.it_score || 0,
    status: row.status || '',
  }));

  return NextResponse.json({ items });
}
