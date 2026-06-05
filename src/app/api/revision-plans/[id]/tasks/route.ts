import { NextRequest, NextResponse } from 'next/server';
import { getDb, mapPlanTaskRow } from '@/lib/db';

// GET /api/revision-plans/[id]/tasks - List tasks for a plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const planId = parseInt(id);

  const plan = db.prepare('SELECT id FROM revision_plans WHERE id = ?').get(planId);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const conditions: string[] = ['plan_id = ?'];
  const paramsList: unknown[] = [planId];

  const owner = searchParams.get('owner');
  if (owner) { conditions.push('department = ?'); paramsList.push(owner); }

  const taskType = searchParams.get('taskType');
  if (taskType) { conditions.push('task_type = ?'); paramsList.push(taskType); }

  const status = searchParams.get('status');
  if (status) { conditions.push('status = ?'); paramsList.push(status); }

  const search = searchParams.get('search');
  if (search) {
    conditions.push('(process_name LIKE ? OR process_code LIKE ? OR description LIKE ?)');
    const s = `%${search}%`;
    paramsList.push(s, s, s);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count
  const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM plan_tasks ${whereClause}`).get(...paramsList) as { cnt: number };
  const total = countRow.cnt;

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(
    `SELECT * FROM plan_tasks ${whereClause} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`
  ).all(...paramsList, pageSize, offset) as Record<string, unknown>[];

  return NextResponse.json({
    items: rows.map(mapPlanTaskRow),
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
  const db = getDb();
  const planId = parseInt(id);

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(planId) as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  if (plan.status === '已归档') {
    return NextResponse.json({ error: '已归档的计划不能添加任务' }, { status: 400 });
  }

  const body = await request.json();
  const tasks = Array.isArray(body.tasks) ? body.tasks : [body];

  const insertStmt = db.prepare(`
    INSERT INTO plan_tasks (plan_id, flow_item_id, process_code, process_name, department,
      task_type, description, status, sort_order, remarks, carried_from_plan_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Get max sort_order
  const maxSort = (db.prepare('SELECT MAX(sort_order) as max_sort FROM plan_tasks WHERE plan_id = ?').get(planId) as { max_sort: number | null }).max_sort || 0;

  const results: unknown[] = [];
  const transaction = db.transaction(() => {
    let sortOrder = maxSort + 1;
    for (const task of tasks) {
      const result = insertStmt.run(
        planId,
        task.flowItemId || null,
        task.processCode || '',
        task.processName || '',
        task.department || '',
        task.taskType || '内容修订',
        task.description || '',
        task.status || '待执行',
        sortOrder++,
        task.remarks || '',
        task.carriedFromPlanId || null
      );
      const row = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
      results.push(mapPlanTaskRow(row));
    }
    // Update plan task count
    const taskCount = (db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(planId) as { cnt: number }).cnt;
    const completedCount = (db.prepare("SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ? AND status = '已完成'").get(planId) as { cnt: number }).cnt;
    db.prepare('UPDATE revision_plans SET task_count = ?, completed_count = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(taskCount, completedCount, planId);
  });

  transaction();

  return NextResponse.json({ items: results }, { status: 201 });
}
