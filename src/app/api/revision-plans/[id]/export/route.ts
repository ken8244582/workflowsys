import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';

// GET /api/revision-plans/[id]/export - Export plan tasks as Excel
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id, 10);
  if (isNaN(planId)) {
    return NextResponse.json({ error: '无效的计划ID' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Get plan info
  const { data: plan, error: planError } = await supabase
    .from('revision_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  // Get all tasks for this plan
  const { data: tasks, error: tasksError } = await supabase
    .from('plan_tasks')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true });

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  // Sheet 1: 任务明细
  const detailRows = (tasks || []).map((row: Record<string, unknown>, index: number) => ({
    '序号': index + 1,
    '流程编码': row.process_code || '',
    'L4职能流程': row.process_name || '',
    'L4所有者': row.owner || '',
    '流程所属部门': row.department || '',
    '最新版本号': row.version || '',
    '格式': row.format || '',
    '分类': row.category || '',
    '任务类型': row.task_type || '',
    '修订要求': row.description || '',
    '状态': row.status || '',
    '完成时间': row.completed_at || '',
  }));

  // Sheet 2: 部门统计
  const deptStats: Record<string, { total: number; completed: number; inProgress: number; pending: number; carried: number }> = {};
  (tasks || []).forEach((row: Record<string, unknown>) => {
    const dept = (row.department as string) || '未分配';
    if (!deptStats[dept]) {
      deptStats[dept] = { total: 0, completed: 0, inProgress: 0, pending: 0, carried: 0 };
    }
    deptStats[dept].total++;
    const status = row.status as string;
    if (status === '已完成') deptStats[dept].completed++;
    else if (status === '进行中') deptStats[dept].inProgress++;
    else if (status === '待执行') deptStats[dept].pending++;
    else if (status === '已顺延') deptStats[dept].carried++;
  });

  const deptRows = Object.entries(deptStats).map(([dept, stats], index) => ({
    '序号': index + 1,
    '所属部门': dept,
    '任务总数': stats.total,
    '待执行': stats.pending,
    '进行中': stats.inProgress,
    '已完成': stats.completed,
    '已顺延': stats.carried,
    '完成率': stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}%` : '0%',
  }));

  const wb = XLSX.utils.book_new();

  // Sheet 1: 任务明细
  const ws1 = XLSX.utils.json_to_sheet(detailRows);
  ws1['!cols'] = [
    { wch: 6 },   // 序号
    { wch: 22 },  // 流程编码
    { wch: 28 },  // L4职能流程
    { wch: 12 },  // L4所有者
    { wch: 14 },  // 流程所属部门
    { wch: 10 },  // 最新版本号
    { wch: 10 },  // 格式
    { wch: 8 },   // 分类
    { wch: 10 },  // 任务类型
    { wch: 30 },  // 修订要求
    { wch: 10 },  // 状态
    { wch: 18 },  // 完成时间
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '任务明细');

  // Sheet 2: 部门完成进度
  const ws2 = XLSX.utils.json_to_sheet(deptRows);
  ws2['!cols'] = [
    { wch: 6 },   // 序号
    { wch: 18 },  // 所属部门
    { wch: 10 },  // 任务总数
    { wch: 10 },  // 待执行
    { wch: 10 },  // 进行中
    { wch: 10 },  // 已完成
    { wch: 10 },  // 已顺延
    { wch: 10 },  // 完成率
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '部门完成进度');

  const planName = plan.plan_name || `计划${planId}`;
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(planName + '.xlsx')}`,
    },
  });
}
