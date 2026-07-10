import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { beijingNow } from '@/lib/utils';
import { requireAuth, isSession } from '@/lib/api-auth';

// PUT /api/plan-tasks/[id] - Update task status (complete/withdraw/carry-over)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const { id } = await params;
  const taskId = parseInt(id);
  const body = await request.json();
  const action = body._action;
  const supabase = getSupabaseClient();

  const { data: task, error: fetchError } = await supabase
    .from('plan_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  const now = beijingNow();

  if (action === 'complete') {
    if (task.status !== '进行中' && task.status !== '待执行') {
      return NextResponse.json({ error: '只能完成待执行或进行中的任务' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('plan_tasks')
      .update({
        status: '已完成',
        completed_at: now,
        updated_by: session.username,
        updated_at_ts: now,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update plan counts
    await updatePlanTaskCounts(task.plan_id, session.username);
    return NextResponse.json(data);
  }

  if (action === 'start') {
    if (task.status !== '待执行') {
      return NextResponse.json({ error: '只能启动待执行的任务' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('plan_tasks')
      .update({
        status: '进行中',
        updated_by: session.username,
        updated_at_ts: now,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === 'withdraw') {
    if (task.status !== '已完成') {
      return NextResponse.json({ error: '只能撤回已完成的任务' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('plan_tasks')
      .update({
        status: '待执行',
        completed_at: null,
        updated_by: session.username,
        updated_at_ts: now,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await updatePlanTaskCounts(task.plan_id, session.username);
    return NextResponse.json(data);
  }

  // General update
  const updateData: Record<string, unknown> = {
    updated_by: session.username,
    updated_at_ts: now,
  };
  if (body.description !== undefined) updateData.description = body.description;
  if (body.remarks !== undefined) updateData.remarks = body.remarks;
  if (body.taskType !== undefined) updateData.task_type = body.taskType;
  if (body.owner !== undefined) updateData.owner = body.owner;
  if (body.department !== undefined) updateData.department = body.department;
  if (body.processCode !== undefined) updateData.process_code = body.processCode;
  if (body.processName !== undefined) updateData.process_name = body.processName;

  const { data, error } = await supabase
    .from('plan_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/plan-tasks/[id] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!isSession(authResult)) return authResult;
  const session = authResult;

  const { id } = await params;
  const taskId = parseInt(id);
  const supabase = getSupabaseClient();

  const { data: task } = await supabase
    .from('plan_tasks')
    .select('plan_id')
    .eq('id', taskId)
    .single();

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  const { error } = await supabase
    .from('plan_tasks')
    .delete()
    .eq('id', taskId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await updatePlanTaskCounts(task.plan_id as number, session.username);
  return NextResponse.json({ success: true });
}

// Helper: update plan task counts
async function updatePlanTaskCounts(planId: number, username: string) {
  const supabase = getSupabaseClient();
  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select('status')
    .eq('plan_id', planId);

  const taskCount = tasks?.length || 0;
  const completedCount = tasks?.filter((t: Record<string, unknown>) => t.status === '已完成').length || 0;

  const now = beijingNow();
  await supabase
    .from('revision_plans')
    .update({
      task_count: taskCount,
      completed_count: completedCount,
      updated_at: now,
      updated_by: username,
    })
    .eq('id', planId);
}
