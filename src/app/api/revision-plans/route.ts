import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Helper to update plan counts
export async function updatePlanCounts(planId: number) {
  const supabase = getSupabaseClient();
  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select('status')
    .eq('plan_id', planId);

  const taskCount = tasks?.length || 0;
  const completedCount = tasks?.filter((t: Record<string, unknown>) => t.status === '已完成').length || 0;

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await supabase
    .from('revision_plans')
    .update({ task_count: taskCount, completed_count: completedCount, updated_at: now })
    .eq('id', planId);
}

// GET /api/revision-plans - List all revision plans
export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('revision_plans')
    .select('*')
    .order('plan_month', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    planMonth: row.plan_month,
    planName: row.plan_name,
    status: row.status,
    taskCount: row.task_count || 0,
    completedCount: row.completed_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ items });
}

// POST /api/revision-plans - Create a new revision plan
export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();
  const body = await request.json();
  const { planMonth, planName } = body;

  if (!planMonth || !planName) {
    return NextResponse.json({ error: '计划月份和名称不能为空' }, { status: 400 });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const { data, error } = await supabase
    .from('revision_plans')
    .insert({
      plan_month: planMonth,
      plan_name: planName,
      status: '草稿',
      task_count: 0,
      completed_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该月份已存在计划' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const plan = {
    id: data.id,
    planMonth: data.plan_month,
    planName: data.plan_name,
    status: data.status,
    taskCount: data.task_count,
    completedCount: data.completed_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return NextResponse.json(plan, { status: 201 });
}
