import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Helper: compute department progress from plan tasks
async function computeDepartmentProgress(planId: number) {
  const supabase = getSupabaseClient();
  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select('department, status')
    .eq('plan_id', planId);

  const deptMap: Record<string, { total: number; completed: number; pending: number; inProgress: number; carriedOver: number }> = {};
  for (const task of tasks || []) {
    const dept = task.department || '未指定';
    if (!deptMap[dept]) {
      deptMap[dept] = { total: 0, completed: 0, pending: 0, inProgress: 0, carriedOver: 0 };
    }
    deptMap[dept].total++;
    if (task.status === '已完成') deptMap[dept].completed++;
    else if (task.status === '进行中') deptMap[dept].inProgress++;
    else if (task.status === '待执行') deptMap[dept].pending++;
    if (task.status === '已顺延') deptMap[dept].carriedOver++;
  }

  return Object.entries(deptMap).map(([department, stats]) => ({
    department,
    ...stats,
    completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }));
}

// Helper: update plan counts
async function updatePlanCounts(planId: number) {
  const supabase = getSupabaseClient();
  const { count: taskCount } = await supabase
    .from('plan_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planId);

  const { count: completedCount } = await supabase
    .from('plan_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', planId)
    .eq('status', '已完成');

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await supabase
    .from('revision_plans')
    .update({
      task_count: taskCount || 0,
      completed_count: completedCount || 0,
      updated_at: now,
    })
    .eq('id', planId);
}

// GET /api/revision-plans/[id] - Get plan details with department progress
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data: plan, error } = await supabase
    .from('revision_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const departmentProgress = await computeDepartmentProgress(parseInt(id));

  return NextResponse.json({
    id: plan.id,
    planMonth: plan.plan_month,
    planName: plan.plan_name,
    status: plan.status,
    taskCount: plan.task_count,
    completedCount: plan.completed_count,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
    departmentProgress,
  });
}

// PUT /api/revision-plans/[id] - Update plan (publish/withdraw/archive)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const action = body._action;
  const supabase = getSupabaseClient();

  const { data: plan, error: fetchError } = await supabase
    .from('revision_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (action === 'publish') {
    if (plan.status !== '草稿') {
      return NextResponse.json({ error: '只能下发草稿状态的计划' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('revision_plans')
      .update({ status: '已下发', updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id, planMonth: data.plan_month, planName: data.plan_name,
      status: data.status, taskCount: data.task_count, completedCount: data.completed_count,
      createdAt: data.created_at, updatedAt: data.updated_at,
    });
  }

  if (action === 'withdraw') {
    if (plan.status !== '已下发') {
      return NextResponse.json({ error: '只能撤回已下发的计划' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('revision_plans')
      .update({ status: '草稿', updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id, planMonth: data.plan_month, planName: data.plan_name,
      status: data.status, taskCount: data.task_count, completedCount: data.completed_count,
      createdAt: data.created_at, updatedAt: data.updated_at,
    });
  }

  if (action === 'archive') {
    if (plan.status !== '已下发') {
      return NextResponse.json({ error: '只能归档已下发的计划' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('revision_plans')
      .update({ status: '已归档', updated_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id, planMonth: data.plan_month, planName: data.plan_name,
      status: data.status, taskCount: data.task_count, completedCount: data.completed_count,
      createdAt: data.created_at, updatedAt: data.updated_at,
    });
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}

// DELETE /api/revision-plans/[id] - Delete a plan (draft only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data: plan } = await supabase
    .from('revision_plans')
    .select('status')
    .eq('id', id)
    .single();

  if (!plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (plan.status !== '草稿') {
    return NextResponse.json({ error: '只能删除草稿状态的计划' }, { status: 400 });
  }

  // Delete tasks first
  await supabase.from('plan_tasks').delete().eq('plan_id', id);
  // Delete plan
  const { error } = await supabase.from('revision_plans').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export { updatePlanCounts, computeDepartmentProgress };
