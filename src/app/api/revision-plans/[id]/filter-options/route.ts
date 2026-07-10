import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { requireAuth } from '@/lib/api-auth';

/**
 * GET /api/revision-plans/[id]/filter-options
 * 获取修订计划的筛选选项（任务类型、任务状态）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;
  const planId = parseInt(id, 10);
  if (isNaN(planId)) {
    return NextResponse.json({ error: '无效的计划ID' }, { status: 400 });
  }

  try {
    const db = getSupabaseClient();

    // 查询该计划中实际存在的任务类型
    const taskTypesResult = await db
      .from('plan_tasks')
      .select('task_type')
      .eq('plan_id', planId)
      .not('task_type', 'is', null)
      .not('task_type', 'eq', '');

    // 提取唯一的任务类型
    const taskTypes = [...new Set(taskTypesResult.data?.map((t: { task_type: string }) => t.task_type) || [])].sort();

    // 查询该计划中实际存在的任务状态
    const statusResult = await db
      .from('plan_tasks')
      .select('status')
      .eq('plan_id', planId)
      .not('status', 'is', null)
      .not('status', 'eq', '');

    // 提取唯一的任务状态
    const statuses = [...new Set(statusResult.data?.map((t: { status: string }) => t.status) || [])].sort();

    return NextResponse.json({
      taskTypes,
      statuses,
    });
  } catch {
    return NextResponse.json({ error: '获取筛选选项失败' }, { status: 500 });
  }
}