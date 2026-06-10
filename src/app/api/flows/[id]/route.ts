import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { FlowItem } from '@/lib/flow-data';
import { beijingNow } from '@/lib/utils';
import { requireAuth, isSession } from '@/lib/api-auth';

function mapFlowRow(row: Record<string, unknown>): FlowItem {
  return {
    id: row.id as number,
    l1Domain: row.l1_domain as string || '',
    l1Owner: row.l1_owner as string || '',
    l2Group: row.l2_group as string || '',
    l2Owner: row.l2_owner as string || '',
    l3Segment: row.l3_segment as string || '',
    l3Owner: row.l3_owner as string || '',
    processCode: row.process_code as string || '',
    l4Process: row.l4_process as string || '',
    version: row.version as string || '',
    department: row.department as string || '',
    l4Owner: row.l4_owner as string || '',
    format: row.format as string || '',
    category: row.category as string || '',
    itCoverage: row.it_coverage as string || '',
    itSubCategory: row.it_sub_category as string || '',
    itScore: row.it_score as number || 0,
    status: (row.status as string || '') as FlowItem['status'],
  };
}

// GET /api/flows/[id] - Get single flow
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id } = await params;
  const numId = parseInt(id);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .eq('id', numId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(mapFlowRow(data));
}

// PUT /api/flows/[id] - Update flow (with special actions)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const { id } = await params;
  const numId = parseInt(id);
  const body = await request.json();
  const action = body._action;
  const supabase = getSupabaseClient();

  // Get existing
  const { data: existing, error: fetchError } = await supabase
    .from('flows')
    .select('*')
    .eq('id', numId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const now = beijingNow();

  if (action === 'abolish') {
    // 废止流程
    const { data, error } = await supabase
      .from('flows')
      .update({ status: '已废止', updated_by: session.username, updated_at_ts: now })
      .eq('id', numId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create revision record
    await supabase.from('revision_records').insert({
      revision_date: now,
      process_code: existing.process_code,
      l4_process: existing.l4_process,
      version: existing.version,
      l1_domain: existing.l1_domain,
      l2_group: existing.l2_group,
      l3_segment: existing.l3_segment,
      revision_type: '废止',
      description: body.reason || '流程废止',
      operator: body.operator || '',
      created_by: session.username,
      created_at_ts: now,
      updated_by: session.username,
      updated_at_ts: now,
    });

    return NextResponse.json(mapFlowRow(data));
  }

  if (action === 'upgrade') {
    // 修订流程（升级版本）
    const currentVersion = existing.version as string;
    let newVersion = currentVersion;
    const match = currentVersion.match(/^C(\d+)/);
    if (match) {
      newVersion = `C${parseInt(match[1]) + 1}.0`;
    }

    const { data, error } = await supabase
      .from('flows')
      .update({ version: newVersion, updated_by: session.username, updated_at_ts: now })
      .eq('id', numId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create revision record
    await supabase.from('revision_records').insert({
      revision_date: now,
      process_code: existing.process_code,
      l4_process: existing.l4_process,
      version: newVersion,
      l1_domain: existing.l1_domain,
      l2_group: existing.l2_group,
      l3_segment: existing.l3_segment,
      revision_type: '修订',
      description: body.reason || body.description || '流程修订',
      operator: body.operator || '',
      created_by: session.username,
      created_at_ts: now,
      updated_by: session.username,
      updated_at_ts: now,
    });

    return NextResponse.json(mapFlowRow(data));
  }

  if (action === 'restore') {
    // 恢复运行
    const { data, error } = await supabase
      .from('flows')
      .update({ status: '正式运行', updated_by: session.username, updated_at_ts: now })
      .eq('id', numId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create revision record
    await supabase.from('revision_records').insert({
      revision_date: now,
      process_code: existing.process_code,
      l4_process: existing.l4_process,
      version: existing.version,
      l1_domain: existing.l1_domain,
      l2_group: existing.l2_group,
      l3_segment: existing.l3_segment,
      revision_type: '恢复',
      description: body.reason || '恢复运行',
      operator: body.operator || '',
      created_by: session.username,
      created_at_ts: now,
      updated_by: session.username,
      updated_at_ts: now,
    });

    return NextResponse.json(mapFlowRow(data));
  }

  // General update
  const updateData: Record<string, unknown> = {
    updated_by: session.username,
    updated_at_ts: now,
  };
  if (body.l1Domain !== undefined) updateData.l1_domain = body.l1Domain;
  if (body.l1Owner !== undefined) updateData.l1_owner = body.l1Owner;
  if (body.l2Group !== undefined) updateData.l2_group = body.l2Group;
  if (body.l2Owner !== undefined) updateData.l2_owner = body.l2Owner;
  if (body.l3Segment !== undefined) updateData.l3_segment = body.l3Segment;
  if (body.l3Owner !== undefined) updateData.l3_owner = body.l3Owner;
  if (body.processCode !== undefined) updateData.process_code = body.processCode;
  if (body.l4Process !== undefined) updateData.l4_process = body.l4Process;
  if (body.version !== undefined) updateData.version = body.version;
  if (body.department !== undefined) updateData.department = body.department;
  if (body.l4Owner !== undefined) updateData.l4_owner = body.l4Owner;
  if (body.format !== undefined) updateData.format = body.format;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.itCoverage !== undefined) updateData.it_coverage = body.itCoverage;
  if (body.itSubCategory !== undefined) updateData.it_sub_category = body.itSubCategory;
  if (body.itScore !== undefined) updateData.it_score = body.itScore;
  if (body.status !== undefined) updateData.status = body.status;

  if (Object.keys(updateData).length > 2) { // >2 because we always have updated_by and updated_at_ts
    const { data, error } = await supabase
      .from('flows')
      .update(updateData)
      .eq('id', numId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If content changed, create revision record
    if (body.description || body.reason) {
      await supabase.from('revision_records').insert({
        revision_date: now,
        process_code: (data as Record<string, unknown>).process_code,
        l4_process: (data as Record<string, unknown>).l4_process,
        version: (data as Record<string, unknown>).version,
        l1_domain: (data as Record<string, unknown>).l1_domain,
        l2_group: (data as Record<string, unknown>).l2_group,
        l3_segment: (data as Record<string, unknown>).l3_segment,
        revision_type: '修订',
        description: body.description || body.reason || '',
        operator: body.operator || '',
        created_by: session.username,
        created_at_ts: now,
        updated_by: session.username,
        updated_at_ts: now,
      });
    }

    return NextResponse.json(mapFlowRow(data));
  }

  return NextResponse.json(mapFlowRow(existing));
}

// DELETE /api/flows/[id] - Delete flow
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const { id } = await params;
  const numId = parseInt(id);

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('flows')
    .delete()
    .eq('id', numId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
