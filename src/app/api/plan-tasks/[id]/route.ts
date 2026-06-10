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

  if (action === 'carryover') {
    // B009 Fix: Check if next month's plan already exists before creating
    const { data: currentPlan } = await supabase
      .from('revision_plans')
      .select('plan_month')
      .eq('id', task.plan_id)
      .single();

    if (!currentPlan) {
      return NextResponse.json({ error: '原计划不存在' }, { status: 404 });
    }

    // Compute next month
    const [year, month] = currentPlan.plan_month.split('-').map(Number);
    const nextMonthDate = new Date(year, month); // month is 0-indexed, so month=6 means July
    const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Check if next month's plan already exists
    const { data: existingPlan } = await supabase
      .from('revision_plans')
      .select('id')
      .eq('plan_month', nextMonthStr)
      .maybeSingle();

    let nextPlanId: number;

    if (existingPlan) {
      // Use existing plan
      nextPlanId = existingPlan.id;
    } else {
      // Create next month's plan
      const { data: newPlan, error: planError } = await supabase
        .from('revision_plans')
        .insert({
          plan_month: nextMonthStr,
          plan_name: `${nextMonthStr} 修订计划`,
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

      if (planError || !newPlan) {
        return NextResponse.json({ error: planError?.message || '创建下月计划失败' }, { status: 500 });
      }
      nextPlanId = newPlan.id;
    }

    // Get max sort order in next plan
    const { data: maxSort } = await supabase
      .from('plan_tasks')
      .select('sort_order')
      .eq('plan_id', nextPlanId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSort = (maxSort && maxSort.length > 0 ? (maxSort[0] as Record<string, unknown>).sort_order as number : 0) + 1;

    // Copy task to next month's plan
    const { data: newTask, error: copyError } = await supabase
      .from('plan_tasks')
      .insert({
        plan_id: nextPlanId,
        flow_item_id: task.flow_item_id,
        process_code: task.process_code,
        process_name: task.process_name,
        owner: task.owner,
        department: task.department,
        task_type: task.task_type,
        description: task.description,
        status: '待执行',
        completed_at: null,
        carried_from_plan_id: task.plan_id,
        carried_to_plan_id: null,
        sort_order: nextSort,
        remarks: `从${currentPlan.plan_month}顺延`,
        created_at: now,
        created_by: session.username,
        updated_by: session.username,
        updated_at_ts: now,
        version: task.version,
        format: task.format,
        category: task.category,
      })
      .select()
      .single();

    if (copyError) {
      return NextResponse.json({ error: copyError.message }, { status: 500 });
    }

    // Mark original task as carried over
    const { data: updatedTask, error: updateError } = await supabase
      .from('plan_tasks')
      .update({
        status: '已顺延',
        carried_to_plan_id: nextPlanId,
        updated_by: session.username,
        updated_at_ts: now,
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Update both plans' counts
    await updatePlanTaskCounts(task.plan_id, session.username);
    await updatePlanTaskCounts(nextPlanId, session.username);

    return NextResponse.json(updatedTask);
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
