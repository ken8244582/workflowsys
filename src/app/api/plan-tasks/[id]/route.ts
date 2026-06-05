import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Helper to update plan counts
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
  await supabase
    .from('revision_plans')
    .update({
      task_count: taskCount || 0,
      completed_count: completedCount || 0,
      updated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
    })
    .eq('id', planId);
}

// Helper to format task row
function mapTaskRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    planId: row.plan_id,
    flowItemId: row.flow_item_id,
    processCode: row.process_code,
    processName: row.process_name,
    department: row.department,
    taskType: row.task_type,
    description: row.description,
    status: row.status,
    completedAt: row.completed_at,
    carriedFromPlanId: row.carried_from_plan_id,
    carriedToPlanId: row.carried_to_plan_id,
    sortOrder: row.sort_order,
    remarks: row.remarks,
    createdAt: row.created_at,
  };
}

// PUT /api/plan-tasks/[id] - Update a task (complete/start/revert/carryover)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const action = body._action;
  const supabase = getSupabaseClient();

  const { data: task, error: fetchError } = await supabase
    .from('plan_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  if (action === 'complete') {
    if (task.status === '已完成') {
      return NextResponse.json({ error: '任务已完成' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('plan_tasks')
      .update({ status: '已完成', completed_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await updatePlanCounts(task.plan_id);
    return NextResponse.json(mapTaskRow(data as Record<string, unknown>));
  }

  if (action === 'start') {
    if (task.status !== '待执行') {
      return NextResponse.json({ error: '只能开始待执行的任务' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('plan_tasks')
      .update({ status: '进行中' })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await updatePlanCounts(task.plan_id);
    return NextResponse.json(mapTaskRow(data as Record<string, unknown>));
  }

  if (action === 'revert') {
    if (task.status !== '已完成') {
      return NextResponse.json({ error: '只能撤回已完成的任务' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('plan_tasks')
      .update({ status: '待执行', completed_at: null })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await updatePlanCounts(task.plan_id);
    return NextResponse.json(mapTaskRow(data as Record<string, unknown>));
  }

  if (action === 'carryover') {
    if (task.status === '已完成' || task.status === '已顺延') {
      return NextResponse.json({ error: '不能顺延已完成或已顺延的任务' }, { status: 400 });
    }

    // Calculate next month
    const { data: currentPlan } = await supabase
      .from('revision_plans')
      .select('plan_month')
      .eq('id', task.plan_id)
      .single();

    const currentMonth = currentPlan?.plan_month || now.substring(0, 7);
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

    // Find or create next month plan
    let nextPlanId: number;
    const { data: existingPlan } = await supabase
      .from('revision_plans')
      .select('id')
      .eq('plan_month', nextMonth)
      .single();

    if (existingPlan) {
      nextPlanId = existingPlan.id;
    } else {
      const { data: newPlan, error: createError } = await supabase
        .from('revision_plans')
        .insert({
          plan_month: nextMonth,
          plan_name: `${nextMonth.replace('-', '年')}月流程修订计划`,
          status: '草稿',
          task_count: 0,
          completed_count: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });
      nextPlanId = newPlan.id;
    }

    // Mark current task as carried over
    await supabase
      .from('plan_tasks')
      .update({ status: '已顺延', carried_to_plan_id: nextPlanId })
      .eq('id', id);

    // Get max sort order for next plan
    const { data: maxSort } = await supabase
      .from('plan_tasks')
      .select('sort_order')
      .eq('plan_id', nextPlanId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSort = (maxSort && maxSort.length > 0 ? (maxSort[0] as Record<string, unknown>).sort_order as number : 0) + 1;

    // Create new task in next month plan
    const { data: newTask, error: insertError } = await supabase
      .from('plan_tasks')
      .insert({
        plan_id: nextPlanId,
        flow_item_id: task.flow_item_id,
        process_code: task.process_code,
        process_name: task.process_name,
        department: task.department,
        task_type: task.task_type,
        description: task.description,
        status: '待执行',
        completed_at: null,
        carried_from_plan_id: parseInt(id),
        carried_to_plan_id: null,
        sort_order: nextSort,
        remarks: `顺延自${currentMonth}`,
        created_at: now,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await updatePlanCounts(task.plan_id);
    await updatePlanCounts(nextPlanId);

    return NextResponse.json(mapTaskRow(newTask as Record<string, unknown>));
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}

// DELETE /api/plan-tasks/[id] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data: task } = await supabase
    .from('plan_tasks')
    .select('plan_id')
    .eq('id', id)
    .single();

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  const { error } = await supabase
    .from('plan_tasks')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await updatePlanCounts(task.plan_id);

  return NextResponse.json({ success: true });
}
