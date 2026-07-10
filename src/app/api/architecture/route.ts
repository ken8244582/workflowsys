import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';
import { beijingNow } from '@/lib/utils';

// GET /api/architecture - Get hierarchy structure (distinct L1/L2/L3 with owners)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('flows')
    .select('l1_domain, l1_owner, l2_group, l2_owner, l3_segment, l3_owner')
    .neq('l4_process', '');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build hierarchy
  const l1Map = new Map<string, { owner: string; l2Map: Map<string, { owner: string; l3Map: Map<string, { owner: string; l4Count: number }> }> }>();
  for (const row of (data || [])) {
    const l1 = row.l1_domain || '未分类';
    const l2 = row.l2_group || '未分组';
    const l3 = row.l3_segment || '未分段';
    if (!l1Map.has(l1)) l1Map.set(l1, { owner: row.l1_owner || '', l2Map: new Map() });
    const l1Node = l1Map.get(l1)!;
    if (!l1Node.l2Map.has(l2)) l1Node.l2Map.set(l2, { owner: row.l2_owner || '', l3Map: new Map() });
    const l2Node = l1Node.l2Map.get(l2)!;
    if (!l2Node.l3Map.has(l3)) l2Node.l3Map.set(l3, { owner: row.l3_owner || '', l4Count: 0 });
    l2Node.l3Map.get(l3)!.l4Count++;
  }

  const hierarchy = [];
  for (const [l1Name, l1Node] of l1Map) {
    const l2Groups = [];
    for (const [l2Name, l2Node] of l1Node.l2Map) {
      const l3Segments = [];
      for (const [l3Name, l3Node] of l2Node.l3Map) {
        l3Segments.push({ name: l3Name, owner: l3Node.owner, l4Count: l3Node.l4Count });
      }
      l2Groups.push({ name: l2Name, owner: l2Node.owner, l3Segments });
    }
    hierarchy.push({ name: l1Name, owner: l1Node.owner, l2Groups });
  }

  return NextResponse.json({ hierarchy });
}

// PATCH /api/architecture - Rename a hierarchy level (batch update all matching flows)
export async function PATCH(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const body = await req.json();
  const { level, oldName, newName, newOwner, l1Name, l2Name } = body;

  if (!level || !oldName || !newName) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const now = beijingNow();
  const updateData: Record<string, unknown> = {
    updated_by: authResult.username,
    updated_at_ts: now,
  };

  let filterQuery: Record<string, string> = {};

  if (level === 'L1') {
    updateData.l1_domain = newName;
    if (newOwner !== undefined) updateData.l1_owner = newOwner;
    filterQuery = { l1_domain: oldName };
  } else if (level === 'L2') {
    if (!l1Name) return NextResponse.json({ error: '缺少L1名称' }, { status: 400 });
    updateData.l2_group = newName;
    if (newOwner !== undefined) updateData.l2_owner = newOwner;
    filterQuery = { l1_domain: l1Name, l2_group: oldName };
  } else if (level === 'L3') {
    if (!l1Name || !l2Name) return NextResponse.json({ error: '缺少L1/L2名称' }, { status: 400 });
    updateData.l3_segment = newName;
    if (newOwner !== undefined) updateData.l3_owner = newOwner;
    filterQuery = { l1_domain: l1Name, l2_group: l2Name, l3_segment: oldName };
  } else {
    return NextResponse.json({ error: '无效的层级' }, { status: 400 });
  }

  let query = supabase.from('flows').update(updateData);
  for (const [key, value] of Object.entries(filterQuery)) {
    query = query.eq(key, value);
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/architecture - Delete a hierarchy level (delete all matching flows)
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  const name = searchParams.get('name');
  const l1Name = searchParams.get('l1Name');
  const l2Name = searchParams.get('l2Name');

  if (!level || !name) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  let query = supabase.from('flows').delete();

  if (level === 'L1') {
    query = query.eq('l1_domain', name);
  } else if (level === 'L2') {
    if (!l1Name) return NextResponse.json({ error: '缺少L1名称' }, { status: 400 });
    query = query.eq('l1_domain', l1Name).eq('l2_group', name);
  } else if (level === 'L3') {
    if (!l1Name || !l2Name) return NextResponse.json({ error: '缺少L1/L2名称' }, { status: 400 });
    query = query.eq('l1_domain', l1Name).eq('l2_group', l2Name).eq('l3_segment', name);
  } else {
    return NextResponse.json({ error: '无效的层级' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
