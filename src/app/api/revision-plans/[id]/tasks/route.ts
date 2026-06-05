import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/revision-plans/[id]/tasks - List tasks for a plan
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);
  const { searchParams } = new URL(request.url);

  const department = searchParams.get('department');
  const taskType = searchParams.get('taskType');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  let where = 'WHERE plan_id = ?';
  const params: (string | number)[] = [numId];

  if (department) { where += ' AND department = ?'; params.push(department); }
  if (taskType) { where += ' AND task_type = ?'; params.push(taskType); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) {
    where += ' AND (process_name LIKE ? OR process_code LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM plan_tasks ${where}`).get(...params) as Record<string, unknown>;
  const totalPages = Math.ceil((total.cnt as number) / pageSize);
  const offset = (page - 1) * pageSize;

  const items = db.prepare(
    `SELECT * FROM plan_tasks ${where} ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset);

  return NextResponse.json({
    items,
    total: total.cnt,
    page,
    pageSize,
    totalPages,
  });
}

// POST /api/revision-plans/[id]/tasks - Add tasks to a plan
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const db = getDb();
  const numId = parseInt(id);
  const body = await request.json();

  const plan = db.prepare('SELECT * FROM revision_plans WHERE id = ?').get(numId) as Record<string, unknown> | undefined;
  if (!plan) {
    return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  }

  const tasks = body.tasks as Array<{
    flowItemId: number | null;
    processCode: string;
    processName: string;
    department: string;
    l2Group: string;
    l3Segment: string;
    version: string;
    format: string;
    category: string;
    itCoverage: string;
    itScore: number;
    flowStatus: string;
    taskType: string;
    description: string;
  }>;

  if (!tasks || !tasks.length) {
    return NextResponse.json({ error: 'tasks is required' }, { status: 400 });
  }

  const maxSort = db.prepare('SELECT MAX(sort_order) as maxSort FROM plan_tasks WHERE plan_id = ?').get(numId) as Record<string, unknown>;
  let sortOrder = (maxSort.maxSort as number | null) || 0;

  const insertStmt = db.prepare(`
    INSERT INTO plan_tasks (plan_id, flow_item_id, process_code, process_name, department, l2_group, l3_segment, version, format, category, it_coverage, it_score, flow_status, task_type, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inserted: Record<string, unknown>[] = [];
  for (const task of tasks) {
    sortOrder++;
    const result = insertStmt.run(
      numId,
      task.flowItemId || null,
      task.processCode || '',
      task.processName || '',
      task.department || '',
      task.l2Group || '',
      task.l3Segment || '',
      task.version || '',
      task.format || '',
      task.category || '',
      task.itCoverage || '',
      task.itScore || 0,
      task.flowStatus || '',
      task.taskType || '内容修订',
      task.description || '',
      sortOrder
    );
    const row = db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(result.lastInsertRowid);
    inserted.push(row as Record<string, unknown>);
  }

  // Update plan counts
  const taskCount = db.prepare('SELECT COUNT(*) as cnt FROM plan_tasks WHERE plan_id = ?').get(numId) as Record<string, unknown>;
  db.prepare('UPDATE revision_plans SET task_count = ? WHERE id = ?').run(taskCount.cnt, numId);

  return NextResponse.json({ items: inserted }, { status: 201 });
}
