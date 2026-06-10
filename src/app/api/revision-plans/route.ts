import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth, isSession } from '@/lib/api-auth';
import { beijingNow } from '@/lib/utils';

// GET /api/revision-plans - List revision plans
export async function GET(_request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('revision_plans')
    .select('*')
    .order('plan_month', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST /api/revision-plans - Create a new revision plan
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const supabase = getSupabaseClient();
  const body = await request.json();
  const now = beijingNow();

  // Check if plan_month already exists
  const { data: existing } = await supabase
    .from('revision_plans')
    .select('id')
    .eq('plan_month', body.planMonth)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `${body.planMonth} 的修订计划已存在` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('revision_plans')
    .insert({
      plan_month: body.planMonth,
      plan_name: body.planName || `${body.planMonth} 修订计划`,
      status: '草稿',
      task_count: 0,
      completed_count: 0,
      created_at: now,
      updated_at: now,
      created_by: session.username,
      updated_by: session.username,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
