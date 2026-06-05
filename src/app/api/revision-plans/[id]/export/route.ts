import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as xlsx from 'xlsx';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/revision-plans/[id]/export - Export plan to Excel
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  // Get all tasks
  const tasks = db.prepare('SELECT * FROM plan_tasks WHERE plan_id = ? ORDER BY sort_order ASC, id ASC').all(numId) as Record<string, unknown>[];

  // Get department progress
  const deptProgress = db.prepare(`
    SELECT 
      department,
      COUNT(*) as total,
      SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = '待执行' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = '进行中' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status = '已顺延' THEN 1 ELSE 0 END) as carriedOver
    FROM plan_tasks 
    WHERE plan_id = ?
    GROUP BY department
    ORDER BY total DESC
  `).all(numId) as Record<string, unknown>[];

  // Get task type stats
  const typeStats = db.prepare(`
    SELECT 
      task_type,
      COUNT(*) as total,
      SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status != '已完成' THEN 1 ELSE 0 END) as uncompleted
    FROM plan_tasks 
    WHERE plan_id = ?
    GROUP BY task_type
  `).all(numId) as Record<string, unknown>[];

  const wb = xlsx.utils.book_new();

  // Sheet 1: 统计概览
  const overviewData: Record<string, unknown>[] = [];
  overviewData.push({ '计划名称': plan.plan_name, '计划月份': plan.plan_month, '状态': plan.status });
  overviewData.push({});
  overviewData.push({ '计划名称': '总体统计', '计划月份': '', '状态': '' });
  overviewData.push({ '计划名称': '任务总数', '计划月份': plan.task_count, '状态': '' });
  overviewData.push({ '计划名称': '已完成', '计划月份': plan.completed_count, '状态': '' });
  overviewData.push({ '计划名称': '完成率', '计划月份': (plan.task_count as number) > 0 ? `${Math.round(((plan.completed_count as number) / (plan.task_count as number)) * 100)}%` : '0%', '状态': '' });
  overviewData.push({});

  // Department progress table
  overviewData.push({ '计划名称': '部门完成情况', '计划月份': '', '状态': '' });
  overviewData.push({ '计划名称': '部门', '计划月份': '任务总数', '状态': '已完成' });
  deptProgress.forEach((d) => {
    overviewData.push({
      '计划名称': d.department,
      '计划月份': d.total,
      '状态': d.completed,
    });
  });
  overviewData.push({});

  // Type stats table
  overviewData.push({ '计划名称': '任务类型统计', '计划月份': '', '状态': '' });
  overviewData.push({ '计划名称': '类型', '计划月份': '总数', '状态': '已完成' });
  typeStats.forEach((t) => {
    overviewData.push({
      '计划名称': t.task_type,
      '计划月份': t.total,
      '状态': t.completed,
    });
  });

  const ws1 = xlsx.utils.json_to_sheet(overviewData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
  xlsx.utils.book_append_sheet(wb, ws1, '统计概览');

  // Sheet 2: 任务明细
  const taskData = tasks.map((t, idx) => ({
    '序号': idx + 1,
    '流程编码': t.process_code || '',
    '流程名称': t.process_name || '',
    'L1业务域': t.department || '',
    'L2业务组': t.l2_group || '',
    'L3业务段': t.l3_segment || '',
    '版本': t.version || '',
    '格式': t.format || '',
    '分类': t.category || '',
    'IT覆盖': t.it_coverage || '',
    'IT支撑分': t.it_score || 0,
    '流程状态': t.flow_status || '',
    '任务类型': t.task_type || '',
    '修订要求': t.description || '',
    '任务状态': t.status || '',
    '完成时间': t.completed_at || '',
    '备注': t.remarks || '',
  }));
  const ws2 = xlsx.utils.json_to_sheet(taskData);
  ws2['!cols'] = [
    { wch: 6 }, { wch: 22 }, { wch: 25 }, { wch: 20 },
    { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 10 },
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
  ];
  xlsx.utils.book_append_sheet(wb, ws2, '任务明细');

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const planName = (plan.plan_name as string).replace(/\s/g, '');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(planName)}.xlsx`,
    },
  });
}
