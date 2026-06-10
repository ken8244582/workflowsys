import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';

export async function GET() {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const supabase = getSupabaseClient();

  // Fetch all flows, selecting the hierarchy fields
  const { data: flows, error } = await supabase
    .from('flows')
    .select('id, l1_domain, l1_owner, l2_group, l2_owner, l3_segment, l3_owner, process_code, l4_process, l4_owner, department, version, format, category, it_coverage, it_sub_category, it_score, status')
    .order('l1_domain')
    .order('l2_group')
    .order('l3_segment')
    .order('process_code');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!flows || flows.length === 0) {
    return NextResponse.json({ hierarchy: [] });
  }

  // Build L1 → L2 → L3 → L4 hierarchy
  const l1Map = new Map<string, {
    name: string;
    owner: string;
    l2Map: Map<string, {
      name: string;
      owner: string;
      l3Map: Map<string, {
        name: string;
        owner: string;
        items: Array<{
          id: number;
          processCode: string;
          processName: string;
          owner: string;
          department: string;
          version: string;
          format: string;
          category: string;
          itCoverage: string | null;
          itSubCategory: string | null;
          itScore: number | null;
          status: string | null;
        }>;
      }>;
    }>;
  }>();

  for (const flow of flows) {
    const l1 = flow.l1_domain || '(未分类)';
    const l2 = flow.l2_group || '(未分类)';
    const l3 = flow.l3_segment || '(未分类)';

    if (!l1Map.has(l1)) {
      l1Map.set(l1, {
        name: l1,
        owner: flow.l1_owner || '',
        l2Map: new Map(),
      });
    }
    const l1Data = l1Map.get(l1)!;

    if (!l1Data.l2Map.has(l2)) {
      l1Data.l2Map.set(l2, {
        name: l2,
        owner: flow.l2_owner || '',
        l3Map: new Map(),
      });
    }
    const l2Data = l1Data.l2Map.get(l2)!;

    if (!l2Data.l3Map.has(l3)) {
      l2Data.l3Map.set(l3, {
        name: l3,
        owner: flow.l3_owner || '',
        items: [],
      });
    }
    const l3Data = l2Data.l3Map.get(l3)!;

    l3Data.items.push({
      id: flow.id,
      processCode: flow.process_code || '',
      processName: flow.l4_process || '',
      owner: flow.l4_owner || '',
      department: flow.department || '',
      version: flow.version || '',
      format: flow.format || '',
      category: flow.category || '',
      itCoverage: flow.it_coverage || null,
      itSubCategory: flow.it_sub_category || null,
      itScore: flow.it_score || null,
      status: flow.status || null,
    });
  }

  // Convert maps to arrays for JSON response
  const hierarchy = Array.from(l1Map.values()).map(l1 => ({
    name: l1.name,
    owner: l1.owner,
    l2List: Array.from(l1.l2Map.values()).map(l2 => ({
      name: l2.name,
      owner: l2.owner,
      l3List: Array.from(l2.l3Map.values()).map(l3 => ({
        name: l3.name,
        owner: l3.owner,
        items: l3.items,
      })),
    })),
  }));

  return NextResponse.json({ hierarchy });
}
