import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

// Helper to update plan counts
async function updatePlanCounts(planId: number) {
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

// GET /api/revision-plans/[id]/tasks - List tasks for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const department = searchParams.get('department');
  const taskType = searchParams.get('taskType');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  let query = supabase
    .from('plan_tasks')
    .select('*', { count: 'exact' })
    .eq('plan_id', id);

  if (department) query = query.eq('department', department);
  if (taskType) query = query.eq('task_type', taskType);
  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(`process_code.ilike.%${search}%,process_name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order('sort_order', { ascending: true }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map(mapTaskRow);
  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages,
  });
}

// POST /api/revision-plans/[id]/tasks - Add tasks to a plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const planId = parseInt(id);

  // Check plan exists and is draft
  const { data: plan } = await supabase
    .from('revision_plans')
    .select('status')
    .eq('id', planId)
    .single();

  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  const body = await request.json();
  const { tasks } = body as { tasks: Array<Record<string, unknown>> };

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ error: '任务列表不能为空' }, { status: 400 });
  }

  // Get max sort order
  const { data: maxSort } = await supabase
    .from('plan_tasks')
    .select('sort_order')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let nextSort = (maxSort && maxSort.length > 0 ? (maxSort[0] as Record<string, unknown>).sort_order as number : 0) + 1;

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const rows = tasks.map((task) => ({
    plan_id: planId,
    flow_item_id: task.flowItemId || null,
    process_code: task.processCode || '',
    process_name: task.processName || '',
    department: task.department || '',
    task_type: task.taskType || '内容修订',
    description: task.description || '',
    status: '待执行',
    completed_at: null,
    carried_from_plan_id: task.carriedFromPlanId || null,
    carried_to_plan_id: null,
    sort_order: nextSort++,
    remarks: '',
    created_at: now,
  }));

  const { data, error } = await supabase
    .from('plan_tasks')
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update plan counts
  await updatePlanCounts(planId);

  const items = (data || []).map(mapTaskRow);
  return NextResponse.json({ items }, { status: 201 });
}
