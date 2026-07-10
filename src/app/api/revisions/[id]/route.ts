import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';
import { beijingNow } from '@/lib/utils';

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

// GET /api/revisions/[id] - Get single revision record
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
    .from('revision_records')
    .select('*')
    .eq('id', numId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(mapRevisionRow(data as Record<string, unknown>));
}

// PUT /api/revisions/[id] - Update revision record
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
  const now = beijingNow();

  const supabase = getSupabaseClient();
  const updateData: Record<string, unknown> = {
    updated_by: session.username,
    updated_at_ts: now,
  };
  if (body.revisionDate !== undefined) updateData.revision_date = body.revisionDate;
  if (body.processCode !== undefined) updateData.process_code = body.processCode;
  if (body.l4Process !== undefined) updateData.l4_process = body.l4Process;
  if (body.version !== undefined) updateData.version = body.version;
  if (body.l1Domain !== undefined) updateData.l1_domain = body.l1Domain;
  if (body.l2Group !== undefined) updateData.l2_group = body.l2Group;
  if (body.l3Segment !== undefined) updateData.l3_segment = body.l3Segment;
  if (body.revisionType !== undefined) updateData.revision_type = body.revisionType;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.operator !== undefined) updateData.operator = body.operator;

  const { data, error } = await supabase
    .from('revision_records')
    .update(updateData)
    .eq('id', numId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapRevisionRow(data as Record<string, unknown>));
}

// DELETE /api/revisions/[id] - Delete revision record
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
    .from('revision_records')
    .delete()
    .eq('id', numId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
